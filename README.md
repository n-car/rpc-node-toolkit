# RPC Node Toolkit

Framework-agnostic JSON-RPC 2.0 toolkit for Node.js.

This package is the planned Node.js core for the RPC Toolkit ecosystem. It is intended to host the shared server-side JSON-RPC logic used by framework adapters such as `rpc-express-toolkit`, while also supporting plain `node:http` servers directly.

## Project Status

Early development scaffold.

- The npm package name `rpc-node-toolkit` is currently unclaimed based on `npm view rpc-node-toolkit` returning `E404 Not Found` on 2026-06-10.
- This package is not published to npm yet.
- Express adapter extraction is planned after the core API is reviewed.
- Standard JSON-RPC 2.0 remains the default behavior.

## Current Scope

- Framework-independent `RpcEndpoint`
- Plain Node.js `http` handler via `createHttpHandler`
- JSON-RPC calls, notifications, and batch requests
- Method schema validation with AJV
- Optional RPC Toolkit Safe Mode over HTTP headers
- Shared `RpcClient` and `RpcSafeClient` re-exported from `rpc-toolkit-js-client`

## Quick Start

```js
const http = require('node:http');
const { RpcEndpoint, createHttpHandler } = require('rpc-node-toolkit');

const rpc = new RpcEndpoint();

rpc.addMethod('test', (_request, _context, params) => ({
  ok: true,
  params,
}));

const server = http.createServer(
  createHttpHandler(rpc, {
    path: '/api',
  })
);

server.listen(3000, '0.0.0.0');
```

Request:

```json
{"jsonrpc":"2.0","method":"test","params":{"value":123},"id":1}
```

Response:

```json
{"jsonrpc":"2.0","id":1,"result":{"ok":true,"params":{"value":123}}}
```

## Schema Validation

Methods can include JSON Schema validation. Invalid params return JSON-RPC error `-32602`.

```js
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
  description: 'Add two numbers',
  exposeSchema: true,
});
```

## Safe Mode

Use `RpcSafeEndpoint` when both sides support RPC Toolkit Safe Mode:

```js
const { RpcSafeEndpoint, createHttpHandler } = require('rpc-node-toolkit');

const rpc = new RpcSafeEndpoint();
```

Safe Mode enables `X-RPC-Safe-Enabled` negotiation and recursive value encoding/decoding for strings, dates, and BigInt values.

## Local Development

```bash
npm install
npm test
```

## Related Projects

- [rpc-express-toolkit](https://github.com/n-car/rpc-express-toolkit)
- [rpc-toolkit-js-client](https://github.com/n-car/rpc-toolkit-js-client)
- [rpc-dotnet-toolkit](https://github.com/n-car/rpc-dotnet-toolkit)
- [rpc-java-toolkit](https://github.com/n-car/rpc-java-toolkit)
- [rpc-php-toolkit](https://github.com/n-car/rpc-php-toolkit)
- [rpc-arduino-toolkit](https://github.com/n-car/rpc-arduino-toolkit)
- [node-red-contrib-rpc-toolkit](https://github.com/n-car/node-red-contrib-rpc-toolkit)

## License

MIT.
