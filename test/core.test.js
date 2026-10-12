const assert = require('node:assert/strict');
const http = require('node:http');
const { Readable } = require('node:stream');
const { test } = require('node:test');
const {
  RpcEndpoint,
  RpcSafeEndpoint,
  createHttpHandler,
} = require('../src');

test('handles a standard JSON-RPC call', async () => {
  const rpc = new RpcEndpoint();
  rpc.addMethod('add', (_request, _context, params) => params.a + params.b);

  const response = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'add',
    params: { a: 2, b: 3 },
    id: 1,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    jsonrpc: '2.0',
    id: 1,
    result: 5,
  });
});

test('returns no body for notifications', async () => {
  const rpc = new RpcEndpoint();
  let called = false;
  rpc.addMethod('notify', () => {
    called = true;
  });

  const response = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'notify',
  });

  assert.equal(called, true);
  assert.equal(response.status, 204);
  assert.equal(response.body, undefined);
});

test('handles batch requests and filters notifications', async () => {
  const rpc = new RpcEndpoint();
  rpc.addMethod('echo', (_request, _context, params) => params);

  const response = await rpc.handlePayload([
    {
      jsonrpc: '2.0',
      method: 'echo',
      params: { value: 1 },
      id: 'a',
    },
    {
      jsonrpc: '2.0',
      method: 'echo',
      params: { ignored: true },
    },
  ]);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [
    {
      jsonrpc: '2.0',
      id: 'a',
      result: { value: 1 },
    },
  ]);
});

test('can disable batch requests', async () => {
  const rpc = new RpcEndpoint(null, { enableBatch: false });
  rpc.addMethod('echo', (_request, _context, params) => params);

  const response = await rpc.handlePayload([
    { jsonrpc: '2.0', method: 'echo', id: 1 },
  ]);

  assert.equal(response.body.error.code, -32600);
  assert.match(response.body.error.message, /not enabled/);
});

test('enforces the configured maximum batch size', async () => {
  const rpc = new RpcEndpoint(null, { maxBatchSize: 1 });
  rpc.addMethod('echo', (_request, _context, params) => params);

  const response = await rpc.handlePayload([
    { jsonrpc: '2.0', method: 'echo', id: 1 },
    { jsonrpc: '2.0', method: 'echo', id: 2 },
  ]);

  assert.equal(response.body.error.code, -32600);
  assert.match(response.body.error.message, /maximum of 1/);
});

test('passes final middleware contexts to handlers', async () => {
  const rpc = new RpcEndpoint({ appName: 'original' });
  rpc.use('beforeCall', (callContext) => ({
    ...callContext,
    context: { appName: 'changed' },
    requestContext: { ...callContext.requestContext, user: { id: 7 } },
  }));
  rpc.addMethod('context.read', (
    _request,
    context,
    _params,
    requestContext,
    callContext
  ) => ({
    appName: context.appName,
    userId: requestContext.user.id,
    method: callContext.method,
  }));

  const response = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'context.read',
    id: 1,
  });

  assert.deepEqual(response.body.result, {
    appName: 'changed',
    userId: 7,
    method: 'context.read',
  });
});

test('uses a result transformed by afterCall middleware', async () => {
  const rpc = new RpcEndpoint();
  rpc.use('afterCall', (callContext) => ({
    ...callContext,
    result: 'wrapped',
  }));
  rpc.addMethod('result.read', () => 'original');

  const response = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'result.read',
    id: 1,
  });

  assert.equal(response.body.result, 'wrapped');
});

test('enforces Safe Mode header in strict mode', async () => {
  const rpc = new RpcSafeEndpoint();
  rpc.addMethod('echo', (_request, _context, params) => params);

  const response = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'echo',
    params: { value: 'S:test' },
    id: 1,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.error.code, -32600);
});

test('decodes and encodes Safe Mode values when header is present', async () => {
  const rpc = new RpcSafeEndpoint();
  rpc.addMethod('echo', (_request, _context, params) => params);

  const response = await rpc.handlePayload(
    {
      jsonrpc: '2.0',
      method: 'echo',
      params: {
        value: 'S:test',
        count: '123n',
      },
      id: 1,
    },
    {
      headers: {
        'x-rpc-safe-enabled': 'true',
      },
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.result, {
    value: 'S:test',
    count: '123n',
  });
});

test('serves a JSON-RPC endpoint with node:http', async () => {
  const rpc = new RpcEndpoint();
  rpc.addMethod('test', () => ({ ok: true }));

  const server = http.createServer(
    createHttpHandler(rpc, {
      path: '/api',
    })
  );

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      }),
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      jsonrpc: '2.0',
      id: 1,
      result: { ok: true },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('exposes comparable introspection methods', async () => {
  const rpc = new RpcEndpoint(null, {
    enableIntrospection: true,
  });

  rpc.addMethod('ping', {
    handler: () => 'pong',
    description: 'Return pong',
    exposeSchema: true,
    schema: {
      type: 'object',
    },
  });

  const version = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: '__rpc.version',
    id: 1,
  });
  assert.equal(version.body.result.toolkit, 'rpc-node-toolkit');

  const describe = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: '__rpc.describe',
    params: { method: 'ping' },
    id: 2,
  });
  assert.equal(describe.body.result.name, 'ping');
  assert.equal(describe.body.result.description, 'Return pong');

  const capabilities = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: '__rpc.capabilities',
    id: 3,
  });
  assert.equal(capabilities.body.result.introspection, true);
});

test('validates params against method schemas', async () => {
  const rpc = new RpcEndpoint();
  const hooks = [];

  rpc.use('beforeValidation', (ctx) => {
    hooks.push(`before:${ctx.method}`);
  });
  rpc.use('afterValidation', (ctx) => {
    hooks.push(`after:${ctx.method}`);
  });

  rpc.addMethod('add', {
    handler: (_request, _context, params) => params.a + params.b,
    schema: {
      type: 'object',
      required: ['a', 'b'],
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      additionalProperties: false,
    },
  });

  const valid = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'add',
    params: { a: 2, b: 3 },
    id: 1,
  });

  assert.deepEqual(valid.body, {
    jsonrpc: '2.0',
    id: 1,
    result: 5,
  });
  assert.deepEqual(hooks, ['before:add', 'after:add']);

  const invalid = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'add',
    params: { a: 2 },
    id: 2,
  });

  assert.equal(invalid.body.error.code, -32602);
  assert.equal(invalid.body.error.message, 'Validation failed');
  assert.equal(Array.isArray(invalid.body.error.data.validationErrors), true);
  assert.equal(invalid.body.error.data.validationErrors.length > 0, true);
});

test('sanitizes unexpected errors and invalid RPC codes by default', async () => {
  for (const code of [undefined, -32603, 'EACCES', '-32000', 1.5, NaN, Infinity, 2 ** 53]) {
    const rpc = new RpcEndpoint();
    const error = new Error('synthetic-secret: /private/service/config');
    error.code = code;
    error.data = { secret: 'synthetic-secret' };
    rpc.addMethod('fail', () => { throw error; });

    const response = await rpc.handlePayload({
      jsonrpc: '2.0', method: 'fail', id: 1,
    });

    assert.deepEqual(response.body, {
      jsonrpc: '2.0', id: 1,
      error: { code: -32603, message: 'Internal error' },
    });
  }
});

test('handles non-Error throws without leaking values', async () => {
  for (const value of [null, undefined, 'synthetic-secret']) {
    const rpc = new RpcEndpoint();
    rpc.addMethod('fail', () => { throw value; });
    const response = await rpc.handlePayload({
      jsonrpc: '2.0', method: 'fail', id: 1,
    });
    assert.deepEqual(response.body.error, { code: -32603, message: 'Internal error' });
  }
});

test('preserves intentional application codes, messages, and public data', async () => {
  for (const code of [-32602, -32001, 0, 42]) {
    const rpc = new RpcEndpoint();
    rpc.addMethod('fail', () => {
      throw Object.assign(new Error('Access denied'), {
        code, data: { reason: 'not-approved' },
      });
    });
    const response = await rpc.handlePayload({
      jsonrpc: '2.0', method: 'fail', id: 1,
    });
    assert.deepEqual(response.body.error, {
      code, message: 'Access denied', data: { reason: 'not-approved' },
    });
  }
});

test('preserves Safe Mode serialization of application error data only', async () => {
  const rpc = new RpcSafeEndpoint();
  rpc.addMethod('fail', () => {
    throw Object.assign(new Error('Access denied'), {
      code: -32001, data: { reason: 'not-approved', count: 42n },
    });
  });
  const response = await rpc.handlePayload(
    { jsonrpc: '2.0', method: 'fail', id: 'request-id' },
    { headers: { 'x-rpc-safe-enabled': 'true' } }
  );
  assert.deepEqual(response.body, {
    jsonrpc: '2.0', id: 'request-id',
    error: {
      code: -32001, message: 'Access denied',
      data: { reason: 'S:not-approved', count: '42n' },
    },
  });
});

test('sanitizes middleware errors while retaining the original for onError', async () => {
  for (const hook of ['beforeCall', 'beforeValidation', 'afterValidation', 'afterCall']) {
    const rpc = new RpcEndpoint();
    const failure = Object.assign(new Error('synthetic-secret'), {
      data: { secret: 'synthetic-secret' },
    });
    let observed;
    rpc.use(hook, () => { throw failure; });
    rpc.use('onError', ({ error }) => {
      observed = error;
      throw new Error('secondary-secret');
    });
    rpc.addMethod('fail', { handler: () => 'ok', schema: { type: 'object' } });
    const response = await rpc.handlePayload({
      jsonrpc: '2.0', method: 'fail', params: {}, id: 1,
    });
    assert.equal(observed, failure);
    assert.deepEqual(response.body.error, { code: -32603, message: 'Internal error' });
  }
});

test('sanitizes outer serialization failures and omits JSON parser details', async () => {
  const rpc = new RpcEndpoint();
  rpc.addMethod('echo', (_request, _context, params) => params);
  const params = {};
  params.circular = params;
  const failed = await rpc.handlePayload({
    jsonrpc: '2.0', method: 'echo', params, id: 1,
  });
  assert.deepEqual(failed.body.error, { code: -32603, message: 'Internal error' });

  const invalid = await rpc.handlePayload('synthetic-secret: invalid JSON');
  assert.deepEqual(invalid.body.error, { code: -32700, message: 'Parse error' });
});

test('sanitizes batch errors without responding to failed notifications', async () => {
  const rpc = new RpcEndpoint();
  rpc.addMethod('fail', () => { throw new Error('synthetic-secret'); });
  rpc.addMethod('ok', () => 'ok');
  const response = await rpc.handlePayload([
    { jsonrpc: '2.0', method: 'fail', id: 1 },
    { jsonrpc: '2.0', method: 'fail' },
    { jsonrpc: '2.0', method: 'ok', id: 2 },
  ]);
  assert.deepEqual(response.body, [
    { jsonrpc: '2.0', id: 1, error: { code: -32603, message: 'Internal error' } },
    { jsonrpc: '2.0', id: 2, result: 'ok' },
  ]);
});

test('allows explicit local-debug opt-out of error sanitization', async () => {
  const rpc = new RpcEndpoint(null, { sanitizeErrors: false });
  rpc.addMethod('fail', () => {
    throw Object.assign(new Error('synthetic-secret'), { data: { debug: true } });
  });
  const response = await rpc.handlePayload({
    jsonrpc: '2.0', method: 'fail', id: 1,
  });
  assert.deepEqual(response.body.error, {
    code: -32603, message: 'synthetic-secret', data: { debug: true },
  });
  const invalid = await rpc.handlePayload('invalid JSON');
  assert.equal(invalid.body.error.code, -32700);
  assert.equal(typeof invalid.body.error.data.message, 'string');
});

test('sanitizes HTTP adapter failures but preserves the body-size error', async () => {
  for (const sanitizeErrors of [undefined, false]) {
    const endpoint = {
      options: { sanitizeErrors },
      async handlePayload() { throw new Error('synthetic-secret'); },
    };
    const request = Object.assign(Readable.from(['{}']), {
      method: 'POST', url: '/rpc', headers: { host: 'localhost' },
    });
    const response = {
      setHeader() {},
      end(body) { this.body = JSON.parse(body); },
    };
    await createHttpHandler(endpoint)(request, response);
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body.error, {
      code: -32603,
      message: sanitizeErrors === false ? 'synthetic-secret' : 'Internal error',
    });
  }

  const request = Object.assign(Readable.from(['{}']), {
    method: 'POST', url: '/rpc', headers: { host: 'localhost' },
  });
  const response = {
    setHeader() {},
    end(body) { this.body = JSON.parse(body); },
  };
  await createHttpHandler(new RpcEndpoint(), { maxBodyBytes: 1 })(request, response);
  assert.equal(response.statusCode, 413);
  assert.deepEqual(response.body.error, {
    code: -32600, message: 'Request body too large',
  });
});
