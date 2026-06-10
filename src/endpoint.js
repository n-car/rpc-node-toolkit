const { MiddlewareManager } = require('./middleware');
const { hasOwn, validateEnvelope } = require('./protocol');
const { deserializeValue, serializeValue } = require('./serialization');
const { SchemaValidator } = require('./validation');
const pkg = require('../package.json');

function normalizeHeaders(headers = {}) {
  return Object.entries(headers).reduce((acc, [key, value]) => {
    acc[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
    return acc;
  }, {});
}

function makeResponse(id, result, error) {
  const response = {
    jsonrpc: '2.0',
    id: id === undefined ? null : id,
  };

  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }

  return response;
}

class RpcEndpoint {
  constructor(context = null, options = {}) {
    this.context = context;
    this.methods = {};
    this.middleware = new MiddlewareManager();
    this.validator = new SchemaValidator(options.validation || {});
    this.options = {
      safeEnabled: options.safeEnabled === true,
      strictMode: options.strictMode !== false,
      enableIntrospection: options.enableIntrospection === true,
      introspectionPrefix: options.introspectionPrefix || '__rpc',
      maxSerializationDepth: options.maxSerializationDepth,
      maxDeserializationDepth: options.maxDeserializationDepth,
      validation: options.validation || {},
    };

    if (this.options.enableIntrospection) {
      this.#registerIntrospectionMethods();
    }
  }

  #registerIntrospectionMethods() {
    const prefix = this.options.introspectionPrefix;

    this.addMethod(`${prefix}.listMethods`, () =>
      Object.keys(this.methods).filter((name) => !name.startsWith(prefix))
    );

    this.addMethod(`${prefix}.version`, () => ({
      toolkit: 'rpc-node-toolkit',
      version: pkg.version,
      methodCount: Object.keys(this.methods).filter(
        (name) => !name.startsWith(prefix)
      ).length,
    }));

    this.addMethod(`${prefix}.describe`, (_request, _context, params = {}) => {
      const methodName = params.method;
      if (!methodName || typeof methodName !== 'string') {
        const error = new Error('Invalid params: method name required');
        error.code = -32602;
        throw error;
      }

      if (methodName.startsWith(prefix)) {
        const error = new Error('Cannot describe introspection methods');
        error.code = -32601;
        throw error;
      }

      const methodConfig = this.methods[methodName];
      if (!methodConfig) {
        const error = new Error(`Method not found: ${methodName}`);
        error.code = -32601;
        throw error;
      }

      return {
        name: methodName,
        description: methodConfig.description || '',
        schema: methodConfig.exposeSchema ? methodConfig.schema || null : null,
      };
    });

    this.addMethod(`${prefix}.capabilities`, () => ({
      jsonrpc: '2.0',
      batch: true,
      notifications: true,
      introspection: true,
      safeMode: this.options.safeEnabled,
      transport: 'node-http',
    }));
  }

  addMethod(name, handlerOrConfig) {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Method name must be a non-empty string');
    }

    if (typeof handlerOrConfig === 'function') {
      this.methods[name] = {
        handler: handlerOrConfig,
      };
      return;
    }

    if (
      handlerOrConfig &&
      typeof handlerOrConfig === 'object' &&
      typeof handlerOrConfig.handler === 'function'
    ) {
      this.methods[name] = { ...handlerOrConfig };
      return;
    }

    throw new Error('Invalid handler configuration');
  }

  removeMethod(name) {
    delete this.methods[name];
  }

  getMethod(name) {
    return this.methods[name];
  }

  listMethods() {
    return Object.keys(this.methods);
  }

  use(hook, middleware) {
    this.middleware.use(hook, middleware);
  }

  async handleRequest(input, requestContext = {}) {
    const response = await this.handlePayload(input, requestContext);
    if (response.status === 204 || response.body === undefined) {
      return '';
    }
    return JSON.stringify(response.body);
  }

  async handlePayload(input, requestContext = {}) {
    const headers = {
      'content-type': 'application/json',
      'x-rpc-safe-enabled': this.options.safeEnabled ? 'true' : 'false',
    };

    let payload = input;

    try {
      if (Buffer.isBuffer(payload)) {
        payload = payload.toString('utf8');
      }

      if (typeof payload === 'string') {
        payload = JSON.parse(payload);
      }
    } catch (error) {
      return {
        status: 200,
        headers,
        body: makeResponse(null, undefined, {
          code: -32700,
          message: 'Parse error',
          data: { message: error.message },
        }),
      };
    }

    const normalizedContext = {
      ...requestContext,
      headers: normalizeHeaders(requestContext.headers),
    };

    try {
      if (Array.isArray(payload)) {
        return await this.#processBatch(payload, normalizedContext, headers);
      }

      const result = await this.#processSingle(payload, normalizedContext);
      if (result === null) {
        return { status: 204, headers };
      }

      return {
        status: 200,
        headers,
        body: result,
      };
    } catch (error) {
      return {
        status: 200,
        headers,
        body: makeResponse(null, undefined, {
          code: error.code || -32603,
          message: error.message || 'Internal error',
          ...(error.data !== undefined && {
            data: this.serializeBigIntsAndDates(error.data),
          }),
        }),
      };
    }
  }

  async #processBatch(batch, requestContext, headers) {
    if (batch.length === 0) {
      return {
        status: 200,
        headers,
        body: makeResponse(null, undefined, {
          code: -32600,
          message: 'Invalid Request: Batch cannot be empty',
        }),
      };
    }

    const results = await Promise.all(
      batch.map((request, batchIndex) =>
        this.#processSingle(request, { ...requestContext, batchIndex })
      )
    );
    const responses = results.filter((response) => response !== null);

    if (responses.length === 0) {
      return { status: 204, headers };
    }

    return {
      status: 200,
      headers,
      body: responses,
    };
  }

  async #processSingle(request, requestContext) {
    const envelope = validateEnvelope(request);

    if (!envelope.valid) {
      return makeResponse(envelope.responseId, undefined, envelope.error);
    }

    const { method, params, id } = request;
    const methodConfig = this.methods[method];

    if (!methodConfig) {
      if (envelope.isNotification) {
        return null;
      }

      return makeResponse(id, undefined, {
        code: -32601,
        message: `Method "${method}" not found`,
      });
    }

    const clientSafeHeader = requestContext.headers['x-rpc-safe-enabled'];

    if (
      this.options.strictMode &&
      this.options.safeEnabled &&
      !clientSafeHeader
    ) {
      if (envelope.isNotification) {
        return null;
      }

      return makeResponse(id, undefined, {
        code: -32600,
        message:
          'RPC Compatibility Error: Server requires safe serialization header but client did not provide it.',
        data: {
          serverSafeEnabled: this.options.safeEnabled,
          requiredHeader: 'X-RPC-Safe-Enabled',
          strictMode: true,
        },
      });
    }

    const clientSafeEnabled = clientSafeHeader === 'true';
    const decodedParams = hasOwn(request, 'params')
      ? this.deserializeBigIntsAndDates(params, { safeEnabled: clientSafeEnabled })
      : params;
    const handler = methodConfig.handler;

    let middlewareContext = {
      request,
      rpc: this,
      method,
      params: decodedParams,
      context: this.context,
      id,
      requestContext,
      isNotification: envelope.isNotification,
    };

    try {
      middlewareContext = await this.middleware.execute(
        'beforeCall',
        middlewareContext
      );

      if (methodConfig.schema) {
        middlewareContext = await this.middleware.execute(
          'beforeValidation',
          middlewareContext
        );

        const validation = this.validator.validate(
          middlewareContext.params,
          methodConfig.schema
        );

        if (!validation.valid) {
          const error = new Error('Validation failed');
          error.code = -32602;
          error.data = {
            validationErrors: validation.errors.map((err) => ({
              field: err.instancePath || err.schemaPath,
              message: err.message,
              value: err.data,
            })),
          };
          throw error;
        }

        middlewareContext.params = validation.data;
        middlewareContext = await this.middleware.execute(
          'afterValidation',
          middlewareContext
        );
      }

      const result = await Promise.resolve(
        handler(request, this.context, middlewareContext.params, requestContext)
      );

      middlewareContext.result = result;
      await this.middleware.execute('afterCall', middlewareContext);

      if (envelope.isNotification) {
        return null;
      }

      return makeResponse(id, this.serializeBigIntsAndDates(result));
    } catch (error) {
      try {
        await this.middleware.execute('onError', {
          ...middlewareContext,
          error,
        });
      } catch (_middlewareError) {
        // Ignore secondary middleware failures while building JSON-RPC errors.
      }

      if (envelope.isNotification) {
        return null;
      }

      return makeResponse(id, undefined, {
        code: error.code || -32603,
        message: error.message || 'Internal error',
        ...(error.data !== undefined && {
          data: this.serializeBigIntsAndDates(error.data),
        }),
      });
    }
  }

  serializeBigIntsAndDates(value) {
    return serializeValue(value, this.options);
  }

  deserializeBigIntsAndDates(value, options = {}) {
    return deserializeValue(value, {
      ...this.options,
      ...options,
    });
  }
}

class RpcSafeEndpoint extends RpcEndpoint {
  constructor(context = null, options = {}) {
    super(context, {
      safeEnabled: true,
      strictMode: true,
      ...options,
    });
  }
}

module.exports = {
  RpcEndpoint,
  RpcSafeEndpoint,
};
