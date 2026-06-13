const http = require('node:http');
const { RpcSafeClient, RpcSafeEndpoint, createHttpHandler } = require('../src');

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function stringifyForConsole(value) {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === 'bigint' ? `${item.toString()}n` : item),
    2
  );
}

async function main() {
  const rpc = new RpcSafeEndpoint();

  rpc.addMethod('types.echo', (_request, _context, params) => ({
    received: {
      text: params.text,
      markerString: params.markerString,
      whenIsDate: params.when instanceof Date,
      when: params.when,
      countType: typeof params.count,
      count: params.count,
      nested: params.nested,
    },
    serverValues: {
      markerString: 'S:server-literal',
      when: new Date('2026-01-02T03:04:05.000Z'),
      count: 9007199254740993n,
    },
  }));

  const server = http.createServer(
    createHttpHandler(rpc, {
      path: '/rpc',
    })
  );

  await listen(server);
  const { port } = server.address();
  const client = new RpcSafeClient(`http://127.0.0.1:${port}/rpc`);

  try {
    const result = await client.call('types.echo', {
      text: 'plain string',
      markerString: 'S:client-literal',
      when: new Date('2026-06-13T08:30:00.000Z'),
      count: 9007199254740993n,
      nested: {
        list: ['D:not-a-date', '123n'],
      },
    });

    console.log(stringifyForConsole(result));
  } finally {
    await close(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
