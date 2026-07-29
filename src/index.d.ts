import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  RpcClient as SharedRpcClient,
  RpcError as SharedRpcError,
  RpcHttpError as SharedRpcHttpError,
  RpcSafeClient as SharedRpcSafeClient,
} from 'rpc-toolkit-js-client';
import type {
  RpcBatchRequest as SharedRpcBatchRequest,
  RpcClientOptions as SharedRpcClientOptions,
} from 'rpc-toolkit-js-client';

/**
 * Framework-independent JSON-RPC 2.0 endpoint.
 */
declare class RpcEndpoint<C = unknown> {
  constructor(context?: C, options?: RpcEndpoint.RpcEndpointOptions);

  readonly context: C;
  readonly methods: Record<string, RpcEndpoint.RpcMethodConfig<C>>;
  readonly middleware: RpcEndpoint.MiddlewareManager<C>;
  readonly validator: RpcEndpoint.SchemaValidator;
  readonly options: Required<
    Pick<
      RpcEndpoint.RpcEndpointOptions,
      | 'safeEnabled'
      | 'strictMode'
      | 'enableIntrospection'
      | 'introspectionPrefix'
    >
  > &
    RpcEndpoint.RpcEndpointOptions;

  addMethod(name: string, handler: RpcEndpoint.RpcHandler<C>): void;
  addMethod(name: string, config: RpcEndpoint.RpcMethodConfig<C>): void;
  removeMethod(name: string): void;
  getMethod(name: string): RpcEndpoint.RpcMethodConfig<C> | undefined;
  listMethods(): string[];
  use(
    hook: RpcEndpoint.RpcMiddlewareHook,
    middleware: (
      context: RpcEndpoint.RpcHandlerContext<C>
    ) => unknown | Promise<unknown>
  ): void;
  handlePayload(
    input:
      | string
      | Buffer
      | RpcEndpoint.JsonRpcRequest
      | RpcEndpoint.JsonRpcRequest[],
    requestContext?: RpcEndpoint.RpcRequestContext
  ): Promise<RpcEndpoint.RpcPayloadResult>;
  handleRequest(
    input:
      | string
      | Buffer
      | RpcEndpoint.JsonRpcRequest
      | RpcEndpoint.JsonRpcRequest[],
    requestContext?: RpcEndpoint.RpcRequestContext
  ): Promise<string>;
  serializeBigIntsAndDates(value: unknown): unknown;
  deserializeBigIntsAndDates(
    value: unknown,
    options?: { safeEnabled?: boolean }
  ): unknown;
}

/**
 * Public properties and types attached to the CommonJS export.
 */
declare namespace RpcEndpoint {
  // module.exports.RpcEndpoint === module.exports
  export { RpcEndpoint };

  // Classes re-exported from rpc-toolkit-js-client.
  export {
    SharedRpcClient as RpcClient,
    SharedRpcError as RpcError,
    SharedRpcHttpError as RpcHttpError,
    SharedRpcSafeClient as RpcSafeClient,
  };

  export type JsonRpcId = string | number | null;

  export interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params?: unknown[] | Record<string, unknown>;
    id?: JsonRpcId;
  }

  export interface JsonRpcSuccess {
    jsonrpc: '2.0';
    id: JsonRpcId;
    result: unknown;
  }

  export interface JsonRpcFailure {
    jsonrpc: '2.0';
    id: JsonRpcId;
    error: {
      code: number;
      message: string;
      data?: unknown;
    };
  }

  export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

  export interface RpcEndpointOptions {
    safeEnabled?: boolean;
    strictMode?: boolean;
    enableIntrospection?: boolean;
    introspectionPrefix?: string;
    maxSerializationDepth?: number;
    maxDeserializationDepth?: number;
    validation?: SchemaValidatorOptions;
  }

  export type RpcClientOptions = SharedRpcClientOptions;
  export type RpcBatchRequest = SharedRpcBatchRequest;

  export interface RpcRequestContext {
    headers?: Record<string, string | string[] | undefined>;
    request?: IncomingMessage;
    ip?: string;
    [key: string]: unknown;
  }

  export interface RpcHandlerContext<C = unknown> {
    request: JsonRpcRequest;
    rpc: RpcEndpoint<C>;
    method: string;
    params: unknown;
    context: C;
    id: JsonRpcId | undefined;
    requestContext: RpcRequestContext;
    isNotification: boolean;
    result?: unknown;
    error?: unknown;
  }

  export type RpcHandler<C = unknown> = (
    request: JsonRpcRequest,
    context: C,
    params: unknown,
    requestContext: RpcRequestContext
  ) => unknown | Promise<unknown>;

  export interface RpcMethodConfig<C = unknown> {
    handler: RpcHandler<C>;
    description?: string;
    exposeSchema?: boolean;
    schema?: unknown;
  }

  export interface RpcPayloadResult {
    status: number;
    headers: Record<string, string>;
    body?: JsonRpcResponse | JsonRpcResponse[];
  }

  export type RpcMiddlewareHook =
    | 'beforeCall'
    | 'beforeValidation'
    | 'afterValidation'
    | 'afterCall'
    | 'onError';

  export class MiddlewareManager<C = unknown> {
    use(
      hook: RpcMiddlewareHook,
      middleware: (
        context: RpcHandlerContext<C>
      ) => unknown | Promise<unknown>
    ): void;
    execute(
      hook: RpcMiddlewareHook,
      context: RpcHandlerContext<C>
    ): Promise<RpcHandlerContext<C>>;
    getMiddlewares(hook: RpcMiddlewareHook): Function[];
  }

  export class RpcSafeEndpoint<C = unknown> extends RpcEndpoint<C> {
    constructor(context?: C, options?: RpcEndpointOptions);
  }

  export interface HttpHandlerOptions {
    path?: string;
    healthPath?: string;
    maxBodyBytes?: number;
  }

  export function createHttpHandler<C = unknown>(
    endpoint: RpcEndpoint<C>,
    options?: HttpHandlerOptions
  ): (req: IncomingMessage, res: ServerResponse) => Promise<void>;

  export function serializeValue(
    value: unknown,
    options?: RpcEndpointOptions
  ): unknown;

  export function deserializeValue(
    value: unknown,
    options?: RpcEndpointOptions
  ): unknown;

  export interface SchemaValidatorOptions {
    removeAdditional?: boolean;
    useDefaults?: boolean;
    coerceTypes?: boolean;
    ajvOptions?: Record<string, unknown>;
  }

  export interface SchemaValidationResult {
    valid: boolean;
    errors: unknown[] | null;
    data: unknown;
  }

  export class SchemaValidator {
    constructor(options?: SchemaValidatorOptions);
    readonly ajv: unknown;
    validate(params: unknown, schema: object): SchemaValidationResult;
    addKeyword(name: string, definition: object): void;
  }

  export class SchemaBuilder {
    constructor();
    property(name: string, definition: object, required?: boolean): this;
    properties(properties: Record<string, object>): this;
    required(fields: string[]): this;
    additionalProperties(allowed: boolean): this;
    build(): object;
  }

  export const commonSchemas: {
    pagination: object;
    userId: object;
    email: object;
    bigintString: object;
    dateString: object;
  };

}

export = RpcEndpoint;
