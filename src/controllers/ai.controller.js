const ticketAnalysisService = require('../services/ticket-analysis.service');
const geminiService = require('../services/gemini.service');

class AiController {
  /**
   * POST /api/ai/tickets/:id/analyze
   */
  async analyzeTicket(req, res, next) {
    try {
      const ticketId = req.params.id;
      const result = await ticketAnalysisService.analyzeTicket(ticketId);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/tickets/:id/summarize
   */
  async summarizeTicket(req, res, next) {
    try {
      const ticketId = req.params.id;
      const result = await ticketAnalysisService.summarizeTicket(ticketId);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/tickets/:id/troubleshoot
   */
  async troubleshootTicket(req, res, next) {
    try {
      const ticketId = req.params.id;
      const result = await ticketAnalysisService.getTroubleshooting(ticketId);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/tickets/:id/apply-recommendation
   */
  async applyRecommendation(req, res, next) {
    try {
      const ticketId = req.params.id;
      const { itilcategories_id, priority, groups_id } = req.body || {};
      const result = await ticketAnalysisService.applyRecommendation(ticketId, {
        itilcategories_id,
        priority,
        groups_id
      });
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
  /**
   * POST /api/ai/chat
   * Body: { message: string, history?: [{role, content}] }
   */
  async chatWithAI(req, res, next) {
    try {
      const { message, history = [] } = req.body || {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ success: false, error: { message: 'message is required.' } });
      }
      const result = await geminiService.chatWithUser(message.trim(), history);
      res.json({ success: true, reply: result.reply, modelUsed: result.modelUsed });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AiController();
