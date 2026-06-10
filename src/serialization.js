const DEFAULT_MAX_SERIALIZATION_DEPTH = 100;
const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

function createTraversalState() {
  return {
    depth: 0,
    seen: new WeakSet(),
  };
}

function serializeValue(value, options = {}, state = createTraversalState()) {
  const maxDepth =
    options.maxSerializationDepth || DEFAULT_MAX_SERIALIZATION_DEPTH;

  if (state.depth > maxDepth) {
    throw new Error('Serialization depth limit exceeded');
  }

  if (typeof value === 'bigint') {
    return `${value.toString()}n`;
  }

  if (value instanceof Date) {
    const isoString = value.toISOString();
    return options.safeEnabled ? `D:${isoString}` : isoString;
  }

  if (typeof value === 'string') {
    return options.safeEnabled ? `S:${value}` : value;
  }

  if (Array.isArray(value)) {
    if (state.seen.has(value)) {
      throw new Error('Circular reference detected during serialization');
    }

    state.seen.add(value);
    try {
      return value.map((item) =>
        serializeValue(item, options, {
          depth: state.depth + 1,
          seen: state.seen,
        })
      );
    } finally {
      state.seen.delete(value);
    }
  }

  if (value && typeof value === 'object') {
    if (state.seen.has(value)) {
      throw new Error('Circular reference detected during serialization');
    }

    state.seen.add(value);
    const result = {};

    try {
      Object.entries(value).forEach(([key, item]) => {
        result[key] = serializeValue(item, options, {
          depth: state.depth + 1,
          seen: state.seen,
        });
      });
    } finally {
      state.seen.delete(value);
    }

    return result;
  }

  return value;
}

function deserializeValue(value, options = {}, state = createTraversalState()) {
  const maxDepth =
    options.maxDeserializationDepth || DEFAULT_MAX_SERIALIZATION_DEPTH;

  if (state.depth > maxDepth) {
    throw new Error('Deserialization depth limit exceeded');
  }

  if (typeof value === 'string') {
    if (options.safeEnabled && value.startsWith('S:')) {
      return value.substring(2);
    }

    if (options.safeEnabled && value.startsWith('D:')) {
      const date = new Date(value.substring(2));
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    if (/^-?\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }

    if (!options.safeEnabled && ISO_DATE_REGEX.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  if (Array.isArray(value)) {
    if (state.seen.has(value)) {
      throw new Error('Circular reference detected during deserialization');
    }

    state.seen.add(value);
    try {
      return value.map((item) =>
        deserializeValue(item, options, {
          depth: state.depth + 1,
          seen: state.seen,
        })
      );
    } finally {
      state.seen.delete(value);
    }
  }

  if (value && typeof value === 'object') {
    if (state.seen.has(value)) {
      throw new Error('Circular reference detected during deserialization');
    }

    state.seen.add(value);
    const result = {};

    try {
      Object.entries(value).forEach(([key, item]) => {
        result[key] = deserializeValue(item, options, {
          depth: state.depth + 1,
          seen: state.seen,
        });
      });
    } finally {
      state.seen.delete(value);
    }

    return result;
  }

  return value;
}

module.exports = {
  deserializeValue,
  serializeValue,
};
