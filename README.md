# RPC Node Toolkit

Framework-agnostic JSON-RPC 2.0 toolkit for Node.js.

This package is the framework-agnostic Node.js core for the RPC Toolkit ecosystem. It hosts framework-independent JSON-RPC logic and supports plain `node:http` servers directly.

## Project Status

- Published on npm as `rpc-node-toolkit`.
- Plain `node:http` server support is implemented through `createHttpHandler`.
- Express integration remains available in `rpc-express-toolkit`.
- Standard JSON-RPC 2.0 remains the default behavior.
- Safe Mode HTTP interoperability is covered by the ecosystem validation matrix.

## Installation

```bash
npm install rpc-node-toolkit
```

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

## Examples

See [`examples/http-server.js`](examples/http-server.js) for a runnable plain `node:http` server.

```bash
node examples/http-server.js
```

## Local Development

```bash
npm install
npm test
```

The package test suite covers the core endpoint, HTTP handler, schema validation, batch requests, notifications, and Safe Mode behavior. The ecosystem compatibility matrix also covers `rpc-node-toolkit` as an HTTP Safe Mode server.

## Related Projects

- [rpc-express-toolkit](https://github.com/n-car/rpc-express-toolkit)
- [rpc-toolkit-js-client](https://github.com/n-car/rpc-toolkit-js-client)
- [rpc-dotnet-toolkit](https://github.com/n-car/rpc-dotnet-toolkit)
- [rpc-java-toolkit](https://github.com/n-car/rpc-java-toolkit)
- [rpc-php-toolkit](https://github.com/n-car/rpc-php-toolkit)
- [rpc-arduino-toolkit](https://github.com/n-car/rpc-arduino-toolkit)
- [node-red-contrib-rpc-toolkit](https://github.com/n-car/node-red-contrib-rpc-toolkit)

## License

MIT. See [LICENSE](LICENSE).
