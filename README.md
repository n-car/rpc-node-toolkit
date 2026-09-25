# RPC Node Toolkit

[![CI](https://github.com/n-car/rpc-node-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/n-car/rpc-node-toolkit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/rpc-node-toolkit.svg)](https://www.npmjs.com/package/rpc-node-toolkit)
[![npm downloads](https://img.shields.io/npm/dm/rpc-node-toolkit.svg)](https://www.npmjs.com/package/rpc-node-toolkit)
[![node](https://img.shields.io/node/v/rpc-node-toolkit.svg)](https://www.npmjs.com/package/rpc-node-toolkit)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Framework-agnostic JSON-RPC 2.0 toolkit for Node.js.

This package is the framework-agnostic Node.js core for the RPC Toolkit ecosystem. It hosts framework-independent JSON-RPC logic and supports plain `node:http` servers directly.

## Project Status

The framework-agnostic Node HTTP core is implemented, published on npm as
`rpc-node-toolkit`, and CI tested. Standard JSON-RPC 2.0 is the default;
Safe Mode HTTP interoperability is covered by the ecosystem validation matrix.
Express integration remains available in `rpc-express-toolkit`.

The public API remains on the `0.x` version line and may evolve before `1.0.0`.

## Which Package Should I Use?

- Use `rpc-node-toolkit` if you want framework-agnostic Node.js or plain `node:http`.
- Use [`rpc-express-toolkit`](https://github.com/n-car/rpc-express-toolkit) if you are building directly on Express.
- Use [`rpc-toolkit-js-client`](https://github.com/n-car/rpc-toolkit-js-client) if you only need a browser or Node.js client.
- Use [`rpc-toolkit`](https://github.com/n-car/rpc-toolkit) as the ecosystem hub and compatibility reference.

## Installation

```bash
npm install rpc-node-toolkit
```

Requirements:

- Node.js 18+

## Compatibility

`rpc-node-toolkit` is tested with Node.js 18, 20, 22, 24, and 26. Its CommonJS
runtime supports both CommonJS and Node.js ESM consumers. See
[Compatibility](docs/COMPATIBILITY.md) for the runtime, module, and packaged
consumer matrices.

## TypeScript

The package supports TypeScript ESM/NodeNext and CommonJS consumers. Both
forms are tested with `strict: true`, `skipLibCheck: false`, and
`esModuleInterop: false` against the tarball produced by `npm pack`.

Install the declarations used by these examples:

```bash
npm install --save-dev typescript @types/node
```

ESM/NodeNext (`package.json` contains `"type": "module"`):

```typescript
import RpcEndpoint, {
  RpcEndpoint as NamedRpcEndpoint,
  RpcClient,
  type RpcEndpointOptions,
} from 'rpc-node-toolkit';
import {
  RpcSafeClient,
  RpcSafeEndpoint,
} from 'rpc-node-toolkit/safe';

const options: RpcEndpointOptions = { safeEnabled: false };
const rpc = new RpcEndpoint({}, options);
const namedRpc = new NamedRpcEndpoint({}, options);
const client = new RpcClient('http://localhost:3000/api');
const safeRpc = new RpcSafeEndpoint({});
const safeClient = new RpcSafeClient('http://localhost:3000/api');
```

Use these compiler options for the ESM example:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": false,
    "esModuleInterop": false,
    "types": ["node"],
    "ignoreDeprecations": "6.0"
  }
}
```

`ignoreDeprecations` only acknowledges TypeScript 6's deprecation notice for
the explicitly tested `esModuleInterop: false` setting.

CommonJS TypeScript (`.cts` with NodeNext or Node16 resolution):

```typescript
import RpcEndpoint = require('rpc-node-toolkit');
import Safe = require('rpc-node-toolkit/safe');

const options: RpcEndpoint.RpcEndpointOptions = { safeEnabled: false };
const rpc = new RpcEndpoint({}, options);
const namedRpc = new RpcEndpoint.RpcEndpoint({}, options);
const client = new RpcEndpoint.RpcClient('http://localhost:3000/api');
const safeRpc = new Safe.RpcSafeEndpoint({});
const safeClient = new Safe.RpcSafeClient('http://localhost:3000/api');
```

The root CommonJS import remains the constructable `RpcEndpoint` export while
also exposing its named API. The `/safe` subpath exposes the safe classes and
the root utilities it re-exports at runtime.

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

Middleware and handlers share the final per-request context. A handler may accept
`(request, applicationContext, params, requestContext, callContext)`; middleware
changes to `applicationContext`, `requestContext`, or the result of `afterCall`
are propagated.

For a hardened endpoint that does not need batch or introspection:

```js
const rpc = new RpcEndpoint(null, {
  enableBatch: false,
  maxBatchSize: 25,
  enableIntrospection: false,
});
```

Batch remains enabled by default for JSON-RPC compatibility and is limited to
100 items unless `maxBatchSize` is configured.

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

Runnable examples are available in [`examples/`](examples/):

- [`http-server.js`](examples/http-server.js) - long-running plain `node:http` endpoint on `/api`.
- [`batch-and-notification.js`](examples/batch-and-notification.js) - in-process server/client example for batch requests and notifications.
- [`schema-validation.js`](examples/schema-validation.js) - method schema validation and JSON-RPC error handling.
- [`safe-mode-roundtrip.js`](examples/safe-mode-roundtrip.js) - `RpcSafeClient` to `RpcSafeEndpoint` round-trip for strings, dates, BigInt, arrays, and nested objects.

```bash
npm run example:http
npm run example:batch
npm run example:schema
npm run example:safe
```

## Local Development

```bash
npm install
npm test
npm run typecheck
npm run package-test
```

The package test suite covers the core endpoint, HTTP handler, schema validation, batch requests, notifications, and Safe Mode behavior. The ecosystem compatibility matrix also covers `rpc-node-toolkit` as an HTTP Safe Mode server.

`npm run package-test` validates TypeScript and Node.js consumers against the
tarball produced by `npm pack`, including the package export map and the files
that would be published.
It also checks that regular files in the tarball have mode `0644`, preventing
accidental executable permissions when publishing from a Windows-mounted
filesystem.

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
