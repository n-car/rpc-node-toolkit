const http = require('node:http');
const {
  RpcClient,
  RpcEndpoint,
  RpcError,
  createHttpHandler,
} = require('../src');

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function main() {
  const rpc = new RpcEndpoint();

  rpc.addMethod('math.add', {
    description: 'Add two numbers',
    exposeSchema: true,
    schema: {
      type: 'object',
      required: ['a', 'b'],
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      additionalProperties: false,
    },
    handler: (_request, _context, params) => params.a + params.b,
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
    const validResult = await client.call('math.add', { a: 2, b: 3 });
    let validationError = null;

    try {
      await client.call('math.add', { a: 2 });
    } catch (error) {
      if (!(error instanceof RpcError)) {
        throw error;
      }

      validationError = {
        name: error.name,
        code: error.code,
        message: error.message,
        validationErrorCount: error.data?.validationErrors?.length || 0,
      };
    }

    console.log(
      JSON.stringify(
        {
          validResult,
          validationError,
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
