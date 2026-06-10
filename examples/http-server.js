const http = require('node:http');
const { RpcEndpoint, createHttpHandler } = require('../src');

const rpc = new RpcEndpoint(null, {
  enableIntrospection: true,
});

rpc.addMethod('test', (_request, _context, params) => ({
  ok: true,
  params,
}));

const server = http.createServer(
  createHttpHandler(rpc, {
    path: '/api',
  })
);

server.listen(3000, '0.0.0.0', () => {
  console.log('RPC Node Toolkit example listening on http://0.0.0.0:3000/api');
});
