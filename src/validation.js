const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class SchemaValidator {
  constructor(options = {}) {
    this.ajv = new Ajv({
      allErrors: true,
      removeAdditional: options.removeAdditional || false,
      useDefaults: options.useDefaults !== false,
      coerceTypes: options.coerceTypes || false,
      strict: false,
      ...options.ajvOptions,
    });

    addFormats(this.ajv);
    this.addCustomFormats();
  }

  addCustomFormats() {
    this.ajv.addFormat('bigint', {
      type: 'string',
      validate: (data) => /^-?\d+n?$/.test(data),
    });

    this.ajv.addFormat('objectid', {
      type: 'string',
      validate: (data) => /^[0-9a-fA-F]{24}$/.test(data),
    });
  }

  validate(params, schema) {
    const validator = this.ajv.compile(schema);
    const valid = validator(params);

    return {
      valid,
      errors: valid ? null : validator.errors,
      data: params,
    };
  }

  addKeyword(name, definition) {
    this.ajv.addKeyword(name, definition);
  }
}

const commonSchemas = {
  pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      sort: { type: 'string' },
      order: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
    },
  },
  userId: {
    oneOf: [
      { type: 'string', format: 'objectid' },
      { type: 'string', format: 'uuid' },
      { type: 'integer', minimum: 1 },
    ],
  },
  email: {
    type: 'string',
    format: 'email',
    maxLength: 255,
  },
  bigintString: {
    type: 'string',
    format: 'bigint',
  },
  dateString: {
    type: 'string',
    format: 'date-time',
  },
};

class SchemaBuilder {
  constructor() {
    this.schema = {
      type: 'object',
      properties: {},
      required: [],
    };
  }

  property(name, definition, required = false) {
    this.schema.properties[name] = definition;
    if (required) {
      this.schema.required.push(name);
    }
    return this;
  }

  properties(properties) {
    Object.entries(properties).forEach(([name, definition]) => {
      this.property(name, definition);
    });
    return this;
  }

  required(fields) {
    this.schema.required = [...new Set([...this.schema.required, ...fields])];
    return this;
  }

  additionalProperties(allowed) {
    this.schema.additionalProperties = allowed;
    return this;
  }

  build() {
    return this.schema;
  }
}

module.exports = {
  SchemaBuilder,
  SchemaValidator,
  commonSchemas,
};
