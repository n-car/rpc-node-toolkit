const {
  RpcClient,
  RpcError,
  RpcHttpError,
  RpcSafeClient,
} = require('rpc-toolkit-js-client');
const { RpcEndpoint, RpcSafeEndpoint } = require('./endpoint');
const { createHttpHandler } = require('./http');
const { MiddlewareManager } = require('./middleware');
const { deserializeValue, serializeValue } = require('./serialization');
const {
  SchemaBuilder,
  SchemaValidator,
  commonSchemas,
} = require('./validation');

module.exports = RpcEndpoint;
module.exports.RpcEndpoint = RpcEndpoint;
module.exports.RpcSafeEndpoint = RpcSafeEndpoint;
module.exports.createHttpHandler = createHttpHandler;
module.exports.MiddlewareManager = MiddlewareManager;
module.exports.SchemaBuilder = SchemaBuilder;
module.exports.SchemaValidator = SchemaValidator;
module.exports.commonSchemas = commonSchemas;
module.exports.serializeValue = serializeValue;
module.exports.deserializeValue = deserializeValue;
module.exports.RpcClient = RpcClient;
module.exports.RpcSafeClient = RpcSafeClient;
module.exports.RpcError = RpcError;
module.exports.RpcHttpError = RpcHttpError;
