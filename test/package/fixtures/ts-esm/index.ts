import RpcEndpoint, {
  MiddlewareManager,
  RpcClient,
  RpcEndpoint as NamedRpcEndpoint,
  RpcSafeClient,
  RpcSafeEndpoint,
  SchemaBuilder,
  SchemaValidator,
  commonSchemas,
  createHttpHandler,
  deserializeValue,
  serializeValue,
  type JsonRpcRequest,
  type RpcBatchRequest,
  type RpcClientOptions,
  type RpcEndpointOptions,
  type RpcHandlerContext,
  type SchemaValidationResult,
} from 'rpc-node-toolkit';
import {
  RpcClient as SafeRootClient,
  RpcEndpoint as SafeRootEndpoint,
  RpcSafeClient as SafePresetClient,
  RpcSafeEndpoint as SafePresetEndpoint,
} from 'rpc-node-toolkit/safe';

const context = { consumer: 'esm' };
const options: RpcEndpointOptions = {
  safeEnabled: false,
  strictMode: true,
};
const request: JsonRpcRequest = {
  jsonrpc: '2.0',
  method: 'ping',
  id: 1,
};
const clientOptions: RpcClientOptions = { safeEnabled: false };
const batch: RpcBatchRequest[] = [{ method: 'ping', id: 1 }];

const endpoint = new RpcEndpoint(context, options);
const namedEndpoint = new NamedRpcEndpoint(context, options);
const safeRootEndpoint = new SafeRootEndpoint(context, options);
const safeEndpoint = new SafePresetEndpoint(context, options);
const client = new RpcClient(
  'http://127.0.0.1/rpc',
  { authorization: 'Bearer package-test' },
  clientOptions
);
const safeRootClient = new SafeRootClient('http://127.0.0.1/safe-root');
const safeClient = new SafePresetClient('http://127.0.0.1/safe');
const middleware = new MiddlewareManager<typeof context>();
const validator = new SchemaValidator();
const schema = new SchemaBuilder()
  .property('message', { type: 'string' }, true)
  .build();
const validation: SchemaValidationResult = validator.validate({}, schema);
const handler = createHttpHandler(endpoint);
const serialized = serializeValue(request, options);
const deserialized = deserializeValue(serialized, options);

declare const handlerContext: RpcHandlerContext<typeof context>;
const typedDefaultEndpoint: RpcEndpoint<typeof context> = endpoint;
const typedNamedEndpoint: NamedRpcEndpoint<typeof context> = namedEndpoint;
const typedSafeClient: RpcSafeClient = safeClient;
const typedCall: typeof client.call = client.call.bind(client);

void [
  typedDefaultEndpoint,
  typedNamedEndpoint,
  typedSafeClient,
  typedCall,
  batch,
  safeRootEndpoint,
  safeEndpoint,
  client,
  safeRootClient,
  middleware,
  validation,
  handler,
  deserialized,
  handlerContext,
  commonSchemas,
];
