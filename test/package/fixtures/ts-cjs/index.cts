import RpcEndpoint = require('rpc-node-toolkit');
import Safe = require('rpc-node-toolkit/safe');

const context = { consumer: 'commonjs' };
const options: RpcEndpoint.RpcEndpointOptions = {
  safeEnabled: false,
  strictMode: true,
};
const clientOptions: RpcEndpoint.RpcClientOptions = { safeEnabled: false };
const batch: Safe.RpcBatchRequest[] = [{ method: 'ping', id: 1 }];

const endpoint = new RpcEndpoint(context, options);
const namedEndpoint = new RpcEndpoint.RpcEndpoint(context, options);
const safeRootEndpoint = new Safe.RpcEndpoint(context, options);
const safeEndpoint = new Safe.RpcSafeEndpoint(context, options);
const client = new RpcEndpoint.RpcClient(
  'http://127.0.0.1/rpc',
  { authorization: 'Bearer package-test' },
  clientOptions
);
const safeRootClient = new Safe.RpcClient('http://127.0.0.1/safe-root');
const safeClient = new Safe.RpcSafeClient('http://127.0.0.1/safe');
const handler = RpcEndpoint.createHttpHandler(endpoint);

const typedDefaultEndpoint: RpcEndpoint<typeof context> = endpoint;
const typedNamedEndpoint: RpcEndpoint.RpcEndpoint<typeof context> =
  namedEndpoint;
const typedSafeOptions: Safe.RpcEndpointOptions = options;
const typedCall: typeof client.call = client.call.bind(client);

void [
  typedDefaultEndpoint,
  typedNamedEndpoint,
  typedSafeOptions,
  typedCall,
  batch,
  safeRootEndpoint,
  safeEndpoint,
  client,
  safeRootClient,
  safeClient,
  handler,
];
