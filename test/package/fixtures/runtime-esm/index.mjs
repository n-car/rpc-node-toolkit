import assert from 'node:assert/strict';
import RpcEndpoint, {
  RpcClient,
  RpcEndpoint as NamedRpcEndpoint,
  RpcSafeClient,
  RpcSafeEndpoint,
  SchemaValidator,
  createHttpHandler,
} from 'rpc-node-toolkit';
import {
  RpcClient as SafeRootClient,
  RpcEndpoint as SafeRootEndpoint,
  RpcSafeClient as SafePresetClient,
  RpcSafeEndpoint as SafePresetEndpoint,
  SchemaValidator as SafeSchemaValidator,
  createHttpHandler as createSafeHttpHandler,
} from 'rpc-node-toolkit/safe';

assert.equal(RpcEndpoint, NamedRpcEndpoint);
assert.equal(SafeRootEndpoint, RpcEndpoint);
assert.equal(SafeRootClient, RpcClient);
assert.equal(SafePresetEndpoint, RpcSafeEndpoint);
assert.equal(SafePresetClient, RpcSafeClient);
assert.equal(SafeSchemaValidator, SchemaValidator);
assert.equal(createSafeHttpHandler, createHttpHandler);

const endpoint = new RpcEndpoint({ consumer: 'esm' });
const safeEndpoint = new SafePresetEndpoint({ consumer: 'esm' });
const client = new RpcClient('http://127.0.0.1/rpc');
const safeClient = new SafePresetClient('http://127.0.0.1/safe');

assert.ok(endpoint instanceof RpcEndpoint);
assert.ok(safeEndpoint instanceof SafePresetEndpoint);
assert.ok(client instanceof RpcClient);
assert.ok(safeClient instanceof SafePresetClient);
assert.equal(typeof createHttpHandler(endpoint), 'function');
