const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const glpiService = require('../services/glpi.service');
const sanitize = require('../utils/sanitize');

/**
 * Health check endpoint.
 */
router.get('/health', async (req, res, next) => {
  try {
    let glpiConnected = false;
    let glpiError = null;

    try {
      await glpiService.withSession(async () => {
        glpiConnected = true;
      });
    } catch (err) {
      glpiError = 'GLPI connection test failed';
    }

    res.json({
      success: true,
      service: 'glpi-ai-service',
      status: 'operational',
      timestamp: new Date().toISOString(),
      dependencies: {
        glpiApi: glpiConnected ? 'connected' : 'disconnected',
        glpiError: glpiError || undefined,
        geminiModel: 'gemini-3.8-flash'
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Ticket Diagnostic Test Endpoint.
 */
router.get('/tickets/:id/test-glpi', async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const rawTicket = await glpiService.getTicket(ticketId);

    res.json({
      success: true,
      ticket: {
        id: rawTicket.id,
        name: rawTicket.name,
        status: rawTicket.status,
        date: rawTicket.date,
        itilcategories_id: rawTicket.itilcategories_id,
        sanitizedContent: sanitize.sanitizeTicketContent(rawTicket.content)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Feature A & B: Analyze Ticket with AI
 * Supports both POST and GET for browser/tool flexibility
 */
router.post('/tickets/:id/analyze', (req, res, next) => aiController.analyzeTicket(req, res, next));
router.get('/tickets/:id/analyze', (req, res, next) => aiController.analyzeTicket(req, res, next));

/**
 * Feature E: Ticket Summarization
 */
router.post('/tickets/:id/summarize', (req, res, next) => aiController.summarizeTicket(req, res, next));
router.get('/tickets/:id/summarize', (req, res, next) => aiController.summarizeTicket(req, res, next));

/**
 * Feature D: Troubleshooting Assistant
 */
router.post('/tickets/:id/troubleshoot', (req, res, next) => aiController.troubleshootTicket(req, res, next));
router.get('/tickets/:id/troubleshoot', (req, res, next) => aiController.troubleshootTicket(req, res, next));

/**
 * Feature G & Phase 6: Apply Approved Recommendation
 */
router.post('/tickets/:id/apply-recommendation', (req, res, next) => aiController.applyRecommendation(req, res, next));

/**
 * Feature H: Floating Chatbot – free-form conversation
 * POST /api/ai/chat
 * Body: { message: string, history?: [{role:'user'|'assistant', content:string}] }
 */
router.post('/chat', (req, res, next) => aiController.chatWithAI(req, res, next));

module.exports = router;
