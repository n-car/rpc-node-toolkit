const { URL } = require('node:url');

function sendJson(res, status, headers, body) {
  Object.entries(headers || {}).forEach(([name, value]) => {
    res.setHeader(name, value);
  });

  res.statusCode = status;

  if (status === 204 || body === undefined) {
    res.end();
    return;
  }

  res.end(JSON.stringify(body));
}

function readBody(req, maxBodyBytes) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;

    req.setEncoding('utf8');

    req.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBodyBytes) {
        const error = new Error('Request body too large');
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function createHttpHandler(endpoint, options = {}) {
  const path = options.path || '/rpc';
  const healthPath = options.healthPath || `${path}/health`;
  const maxBodyBytes = options.maxBodyBytes || 1024 * 1024;

  return async function rpcNodeHttpHandler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === healthPath) {
      sendJson(
        res,
        200,
        {
          'content-type': 'application/json',
        },
        {
          status: 'ok',
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    if (req.method !== 'POST' || url.pathname !== path) {
      sendJson(
        res,
        404,
        {
          'content-type': 'application/json',
        },
        {
          error: 'Not found',
        }
      );
      return;
    }

    try {
      const body = await readBody(req, maxBodyBytes);
      const result = await endpoint.handlePayload(body, {
        headers: req.headers,
        request: req,
        ip: req.socket?.remoteAddress,
      });

      sendJson(res, result.status, result.headers, result.body);
    } catch (error) {
      sendJson(
        res,
        error.statusCode || 500,
        {
          'content-type': 'application/json',
        },
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: error.statusCode === 413 ? -32600 : -32603,
            message: error.message || 'Internal error',
          },
        }
      );
    }
  };
}

module.exports = {
  createHttpHandler,
};
