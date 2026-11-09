/**
 * Structured Logger with automatic sensitive data redaction.
 */

const SENSITIVE_KEYS = ['token', 'user_token', 'session_token', 'password', 'api_key', 'authorization'];

function redactSensitive(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitive);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk));
    if (isSensitive && typeof value === 'string') {
      sanitized[key] = value.length > 8 ? `${value.substring(0, 4)}...[REDACTED]` : '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitive(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  let logStr = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    try {
      const sanitizedMeta = redactSensitive(meta);
      logStr += ` ${JSON.stringify(sanitizedMeta)}`;
    } catch {
      logStr += ` [Unserializable Meta]`;
    }
  }
  return logStr;
}

const logger = {
  info: (msg, meta) => console.log(formatMessage('info', msg, meta)),
  warn: (msg, meta) => console.warn(formatMessage('warn', msg, meta)),
  error: (msg, meta) => console.error(formatMessage('error', msg, meta)),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatMessage('debug', msg, meta));
    }
  }
};

module.exports = logger;
