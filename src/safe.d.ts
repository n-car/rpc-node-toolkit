import Main = require('./index');

/**
 * Public properties attached to the CommonJS safe entrypoint.
 */
declare namespace Safe {
  // Runtime values re-exported by src/safe.js.
  export import RpcEndpoint = Main;
  export import RpcSafeEndpoint = Main.RpcSafeEndpoint;
  export import createHttpHandler = Main.createHttpHandler;
  export import MiddlewareManager = Main.MiddlewareManager;
  export import SchemaBuilder = Main.SchemaBuilder;
  export import SchemaValidator = Main.SchemaValidator;
  export import commonSchemas = Main.commonSchemas;
  export import serializeValue = Main.serializeValue;
  export import deserializeValue = Main.deserializeValue;
  export import RpcClient = Main.RpcClient;
  export import RpcSafeClient = Main.RpcSafeClient;
  export import RpcError = Main.RpcError;
  export import RpcHttpError = Main.RpcHttpError;

  // Public root types re-exported by the safe entrypoint.
  export import JsonRpcId = Main.JsonRpcId;
  export import JsonRpcRequest = Main.JsonRpcRequest;
  export import JsonRpcSuccess = Main.JsonRpcSuccess;
  export import JsonRpcFailure = Main.JsonRpcFailure;
  export import JsonRpcResponse = Main.JsonRpcResponse;
  export import RpcEndpointOptions = Main.RpcEndpointOptions;
  export import RpcClientOptions = Main.RpcClientOptions;
  export import RpcBatchRequest = Main.RpcBatchRequest;
  export import RpcRequestContext = Main.RpcRequestContext;
  export import RpcHandlerContext = Main.RpcHandlerContext;
  export import RpcHandler = Main.RpcHandler;
  export import RpcMethodConfig = Main.RpcMethodConfig;
  export import RpcPayloadResult = Main.RpcPayloadResult;
  export import RpcMiddlewareHook = Main.RpcMiddlewareHook;
  export import HttpHandlerOptions = Main.HttpHandlerOptions;
  export import SchemaValidatorOptions = Main.SchemaValidatorOptions;
  export import SchemaValidationResult = Main.SchemaValidationResult;
}

export = Safe;
