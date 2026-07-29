'use strict';

const assert = require('node:assert/strict');
const Main = require('rpc-node-toolkit');
const Safe = require('rpc-node-toolkit/safe');

assert.equal(Main, Main.RpcEndpoint);
assert.equal(Safe.RpcEndpoint, Main.RpcEndpoint);
assert.equal(Safe.RpcSafeEndpoint, Main.RpcSafeEndpoint);
assert.equal(Safe.RpcClient, Main.RpcClient);
assert.equal(Safe.RpcSafeClient, Main.RpcSafeClient);
assert.equal(Safe.createHttpHandler, Main.createHttpHandler);
assert.equal(Safe.SchemaValidator, Main.SchemaValidator);

const endpoint = new Main({ consumer: 'commonjs' });
const safeEndpoint = new Safe.RpcSafeEndpoint({ consumer: 'commonjs' });
const client = new Main.RpcClient('http://127.0.0.1/rpc');
const safeClient = new Safe.RpcSafeClient('http://127.0.0.1/safe');

assert.ok(endpoint instanceof Main);
assert.ok(safeEndpoint instanceof Safe.RpcSafeEndpoint);
assert.ok(client instanceof Main.RpcClient);
assert.ok(safeClient instanceof Safe.RpcSafeClient);
assert.equal(typeof Main.createHttpHandler(endpoint), 'function');
