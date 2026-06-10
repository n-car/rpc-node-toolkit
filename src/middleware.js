class MiddlewareManager {
  constructor() {
    this.middlewares = {
      beforeCall: [],
      beforeValidation: [],
      afterValidation: [],
      afterCall: [],
      onError: [],
    };
  }

  use(hook, middleware) {
    if (!this.middlewares[hook]) {
      throw new Error(`Unknown middleware hook: ${hook}`);
    }

    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }

    this.middlewares[hook].push(middleware);
  }

  async execute(hook, context) {
    const middlewares = this.middlewares[hook] || [];

    return middlewares.reduce(
      (promise, middleware) =>
        promise.then(async (currentContext) => {
          const result = await middleware(currentContext);
          if (result && typeof result === 'object') {
            return { ...currentContext, ...result };
          }
          return currentContext;
        }),
      Promise.resolve(context)
    );
  }

  getMiddlewares(hook) {
    return this.middlewares[hook] || [];
  }
}

module.exports = {
  MiddlewareManager,
};
