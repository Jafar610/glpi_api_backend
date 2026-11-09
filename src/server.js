const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');

const server = app.listen(config.port, () => {
  logger.info(`GLPI AI Integration Service started on port ${config.port}`);
  logger.info(`Health check endpoint: http://localhost:${config.port}/api/ai/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing HTTP server...');
  server.close(() => {
    logger.info('HTTP server closed.');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received. Closing HTTP server...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
