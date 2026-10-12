const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEnvelope } = require('../src/protocol');
const { RpcEndpoint } = require('../src/endpoint');

test('invalid envelopes always use null id, including non-finite native ids', () => {
  const valid = { jsonrpc: '2.0', method: 'echo', id: 42 };
  for (const input of [
    null, [], {}, { ...valid, jsonrpc: '1.0' }, { ...valid, method: 42 },
    ...[null, true, 'bad', 42].map((params) => ({ ...valid, params })),
    ...[true, {}, [], NaN, Infinity, -Infinity].map((id) => ({ ...valid, id })),
  ]) {
    const response = validateEnvelope(input);
    assert.equal(response.valid, false);
    assert.equal(response.error.code, -32600);
    assert.equal(response.responseId, null);
  }
});

test('explicit null ids respond, valid notifications stay silent, mixed batches isolate invalid items', async () => {
  const rpc = new RpcEndpoint();
  rpc.addMethod('null', () => null);
  const result = await rpc.handlePayload([
    null, {}, { jsonrpc: '2.0', method: 'null', id: null },
    { jsonrpc: '2.0', method: 'missing' },
  ]);
  assert.equal(result.body.length, 3);
  for (const error of result.body.slice(0, 2)) {
    assert.equal(error.id, null);
    assert.equal(error.error.code, -32600);
  }
  assert.deepEqual(result.body[2], { jsonrpc: '2.0', id: null, result: null });
});
