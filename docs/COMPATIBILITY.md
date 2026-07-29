# Compatibility

`rpc-node-toolkit` is a framework-agnostic Node.js library for JSON-RPC 2.0
servers and clients.

## Runtime Matrix

| Runtime | Status |
| --- | --- |
| Node.js 18.x | Supported and CI tested |
| Node.js 20.x | Supported and CI tested |
| Node.js 22.x | Supported and CI tested |

The package requires Node.js 18 or newer. The GitHub Actions matrix runs the
runtime test suite across Node.js 18, 20, and 22.

## Module And TypeScript Compatibility

The published package remains CommonJS at runtime and supports both CommonJS
and Node.js ESM consumers. Its TypeScript declarations model the constructable
CommonJS root export and the named properties exposed by the root and `/safe`
entrypoints.

| Consumer | Module setup | Verified imports | Validation |
| --- | --- | --- | --- |
| TypeScript ESM | `"type": "module"` with `module` and `moduleResolution` set to `NodeNext` | Root default and named imports, public root types, and named `/safe` imports | TypeScript 6, `strict: true`, `skipLibCheck: false`, `esModuleInterop: false` |
| TypeScript CommonJS | `.cts` with NodeNext resolution | `import = require()` for the root and `/safe`, including namespace properties | TypeScript 6, `strict: true`, `skipLibCheck: false`, `esModuleInterop: false` |
| Node.js ESM | `.mjs` | Root default and named imports plus named `/safe` imports | Runtime smoke test |
| Node.js CommonJS | `.cjs` | `require()` for the root and `/safe`, including root default identity | Runtime smoke test |

The TypeScript ESM consumer covers `RpcEndpoint` as both the default and a
named import, `RpcClient`, `RpcEndpointOptions`, `RpcSafeEndpoint`, and
`RpcSafeClient`. The CommonJS consumer covers the constructable root export,
`RpcEndpoint.RpcEndpoint`, `RpcEndpoint.RpcClient`,
`Safe.RpcSafeEndpoint`, and `Safe.RpcSafeClient`.

TypeScript applications should install `@types/node` because the public server
API references types from `node:http`.

The TypeScript 6 fixtures set `ignoreDeprecations: "6.0"` solely to
acknowledge the compiler's deprecation notice for the deliberately explicit
`esModuleInterop: false` test setting.

### Packaged Consumer Validation

`npm run package-test` builds a tarball with `npm pack`, installs that tarball
into isolated consumer fixtures, and runs the full module and TypeScript matrix
above. This verifies the published `exports` map, included files, declaration
resolution, module extensions, and runtime format instead of importing the
repository sources directly.

The same validation checks the packed artifact with `publint --strict` and
`@arethetypeswrong/cli` for both the root and `/safe` entrypoints.

Package validation runs in a dedicated Node.js 20 CI job and as part of
`prepublishOnly`, so declaration or packaging regressions block publication.

## Compatibility Coverage

The runtime tests cover:

- core endpoint calls;
- plain `node:http` handling;
- method schema validation;
- batch requests and notifications;
- Safe Mode serialization and HTTP behavior.

The isolated packaged consumers separately cover module resolution, runtime
exports, and TypeScript declaration compatibility.
