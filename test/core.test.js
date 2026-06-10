const assert = require('node:assert/strict');
const http = require('node:http');
const { test } = require('node:test');
const {
  RpcEndpoint,
  RpcSafeEndpoint,
  createHttpHandler,
} = require('../src');

test('handles a standard JSON-RPC call', async () => {
  const rpc = new RpcEndpoint();
  rpc.addMethod('add', (_request, _context, params) => params.a + params.b);

  const response = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'add',
    params: { a: 2, b: 3 },
    id: 1,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    jsonrpc: '2.0',
    id: 1,
    result: 5,
  });
});

test('returns no body for notifications', async () => {
  const rpc = new RpcEndpoint();
  let called = false;
  rpc.addMethod('notify', () => {
    called = true;
  });

  const response = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'notify',
  });

  assert.equal(called, true);
  assert.equal(response.status, 204);
  assert.equal(response.body, undefined);
});

test('handles batch requests and filters notifications', async () => {
  const rpc = new RpcEndpoint();
  rpc.addMethod('echo', (_request, _context, params) => params);

  const response = await rpc.handlePayload([
    {
      jsonrpc: '2.0',
      method: 'echo',
      params: { value: 1 },
      id: 'a',
    },
    {
      jsonrpc: '2.0',
      method: 'echo',
      params: { ignored: true },
    },
  ]);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [
    {
      jsonrpc: '2.0',
      id: 'a',
      result: { value: 1 },
    },
  ]);
});

test('enforces Safe Mode header in strict mode', async () => {
  const rpc = new RpcSafeEndpoint();
  rpc.addMethod('echo', (_request, _context, params) => params);

  const response = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'echo',
    params: { value: 'S:test' },
    id: 1,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.error.code, -32600);
});

test('decodes and encodes Safe Mode values when header is present', async () => {
  const rpc = new RpcSafeEndpoint();
  rpc.addMethod('echo', (_request, _context, params) => params);

  const response = await rpc.handlePayload(
    {
      jsonrpc: '2.0',
      method: 'echo',
      params: {
        value: 'S:test',
        count: '123n',
      },
      id: 1,
    },
    {
      headers: {
        'x-rpc-safe-enabled': 'true',
      },
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.result, {
    value: 'S:test',
    count: '123n',
  });
});

test('serves a JSON-RPC endpoint with node:http', async () => {
  const rpc = new RpcEndpoint();
  rpc.addMethod('test', () => ({ ok: true }));

  const server = http.createServer(
    createHttpHandler(rpc, {
      path: '/api',
    })
  );

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      }),
    });

    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      jsonrpc: '2.0',
      id: 1,
      result: { ok: true },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('exposes comparable introspection methods', async () => {
  const rpc = new RpcEndpoint(null, {
    enableIntrospection: true,
  });

  rpc.addMethod('ping', {
    handler: () => 'pong',
    description: 'Return pong',
    exposeSchema: true,
    schema: {
      type: 'object',
    },
  });

  const version = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: '__rpc.version',
    id: 1,
  });
  assert.equal(version.body.result.toolkit, 'rpc-node-toolkit');

  const describe = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: '__rpc.describe',
    params: { method: 'ping' },
    id: 2,
  });
  assert.equal(describe.body.result.name, 'ping');
  assert.equal(describe.body.result.description, 'Return pong');

  const capabilities = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: '__rpc.capabilities',
    id: 3,
  });
  assert.equal(capabilities.body.result.introspection, true);
});

test('validates params against method schemas', async () => {
  const rpc = new RpcEndpoint();
  const hooks = [];

  rpc.use('beforeValidation', (ctx) => {
    hooks.push(`before:${ctx.method}`);
  });
  rpc.use('afterValidation', (ctx) => {
    hooks.push(`after:${ctx.method}`);
  });

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
  });

  const valid = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'add',
    params: { a: 2, b: 3 },
    id: 1,
  });

  assert.deepEqual(valid.body, {
    jsonrpc: '2.0',
    id: 1,
    result: 5,
  });
  assert.deepEqual(hooks, ['before:add', 'after:add']);

  const invalid = await rpc.handlePayload({
    jsonrpc: '2.0',
    method: 'add',
    params: { a: 2 },
    id: 2,
  });

  assert.equal(invalid.body.error.code, -32602);
  assert.equal(invalid.body.error.message, 'Validation failed');
  assert.equal(Array.isArray(invalid.body.error.data.validationErrors), true);
  assert.equal(invalid.body.error.data.validationErrors.length > 0, true);
});
