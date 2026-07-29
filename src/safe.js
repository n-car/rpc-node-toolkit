const Main = require('./index');

module.exports = {
  ...Main,
};

// Make spread-based re-exports visible to Node's CommonJS named-export
// detection without changing the existing object values or property order.
module.exports.RpcEndpoint = Main.RpcEndpoint;
module.exports.RpcSafeEndpoint = Main.RpcSafeEndpoint;
module.exports.createHttpHandler = Main.createHttpHandler;
module.exports.MiddlewareManager = Main.MiddlewareManager;
module.exports.SchemaBuilder = Main.SchemaBuilder;
module.exports.SchemaValidator = Main.SchemaValidator;
module.exports.commonSchemas = Main.commonSchemas;
module.exports.serializeValue = Main.serializeValue;
module.exports.deserializeValue = Main.deserializeValue;
module.exports.RpcClient = Main.RpcClient;
module.exports.RpcSafeClient = Main.RpcSafeClient;
module.exports.RpcError = Main.RpcError;
module.exports.RpcHttpError = Main.RpcHttpError;
