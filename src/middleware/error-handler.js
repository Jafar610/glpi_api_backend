const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.response && err.response.status) || 500;
  const message = err.message || 'An unexpected internal error occurred';

  // Log error with request context (without sensitive body parts)
  logger.error(`Error processing ${req.method} ${req.originalUrl}`, {
    statusCode,
    message,
    code: err.code
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message: statusCode === 500 ? 'Internal service error. Please try again later.' : message,
      status: statusCode
    }
  });
}

module.exports = errorHandler;
