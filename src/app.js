const express = require('express');
const cors = require('cors');
const aiRoutes = require('./routes/ai.routes');
const errorHandler = require('./middleware/error-handler');
const logger = require('./utils/logger');

const app = express();

// Enable CORS for local GLPI web interface
app.use(cors({
  origin: [
    'https://helpdesk.wru.edu.et'
  ],
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Mount AI integration routes
app.use('/api/ai', aiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'GLPI AI Integration Service',
    version: '1.0.0',
    documentation: '/api/ai/health'
  });
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
