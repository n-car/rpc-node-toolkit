const http = require('node:http');
const { RpcClient, RpcEndpoint, createHttpHandler } = require('../src');

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function main() {
  const notifications = [];
  const rpc = new RpcEndpoint(null, {
    enableIntrospection: true,
  });

  rpc.addMethod('math.add', (_request, _context, params) => params.a + params.b);
  rpc.addMethod('events.track', (_request, _context, params) => {
    notifications.push(params);
  });

  const server = http.createServer(
    createHttpHandler(rpc, {
      path: '/rpc',
    })
  );

  await listen(server);
  const { port } = server.address();
  const client = new RpcClient(`http://127.0.0.1:${port}/rpc`, {}, {
    warnOnUnsafe: false,
  });

  try {
    const batchResults = await client.batch([
      { method: 'math.add', params: { a: 2, b: 3 }, id: 'add-1' },
      { method: '__rpc.capabilities', id: 'capabilities-1' },
    ]);

    await client.notify('events.track', {
      name: 'example-ran',
      source: 'batch-and-notification',
    });

    console.log(
      JSON.stringify(
        {
          batchResults,
          notificationsReceived: notifications.length,
        },
        null,
        2
      )
    );
  } finally {
    await close(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
