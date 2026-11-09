const glpiService = require('./glpi.service');
const geminiService = require('./gemini.service');
const { sanitizeTicketContent } = require('../utils/sanitize');
const logger = require('../utils/logger');

// GLPI Priority Name to ID map
const PRIORITY_MAP = {
  'very low': 1,
  'low': 2,
  'medium': 3,
  'high': 4,
  'very high': 5,
  'major': 6
};

class TicketAnalysisService {
  /**
   * Orchestrate end-to-end AI analysis for a GLPI ticket.
   */
  async analyzeTicket(ticketId) {
    const numericId = parseInt(ticketId, 10);
    logger.info(`Starting AI analysis for Ticket #${numericId}`);

    // 1. Fetch raw ticket from GLPI API
    const ticket = await glpiService.getTicket(numericId);

    // 2. Fetch active categories and technician groups for context
    const [categories, groups] = await Promise.all([
      glpiService.getCategories(),
      glpiService.getGroups()
    ]);

    // 3. Sanitize inputs (strip HTML, emails, phones, credentials)
    const sanitizedTitle = sanitizeTicketContent(ticket.name, 200);
    const sanitizedDescription = sanitizeTicketContent(ticket.content, 3000);

    // 4. Request structured analysis from Gemini
    const aiResult = await geminiService.analyzeTicket({
      id: numericId,
      title: sanitizedTitle,
      description: sanitizedDescription,
      categories,
      groups
    });

    // 5. Strict Validation and ID Alignment against actual GLPI database objects
    const validated = this._validateAndAlignResponse(aiResult, categories, groups);

    logger.info(`AI analysis completed successfully for Ticket #${numericId}`, {
      suggestedCategory: validated.suggestedCategory,
      suggestedPriority: validated.suggestedPriority,
      recommendedGroup: validated.recommendedGroup
    });

    return {
      ticketId: numericId,
      ticketTitle: ticket.name,
      analyzedAt: new Date().toISOString(),
      ...validated
    };
  }

  /**
   * Summarize ticket conversation.
   */
  async summarizeTicket(ticketId) {
    const numericId = parseInt(ticketId, 10);
    const [ticket, followups] = await Promise.all([
      glpiService.getTicket(numericId),
      glpiService.getTicketFollowups(numericId)
    ]);

    const sanitizedTitle = sanitizeTicketContent(ticket.name, 200);
    const sanitizedDescription = sanitizeTicketContent(ticket.content, 2000);
    const sanitizedFollowups = followups.map(f => ({
      date: f.date,
      content: sanitizeTicketContent(f.content, 1000)
    }));

    return geminiService.summarizeTicket({
      id: numericId,
      title: sanitizedTitle,
      description: sanitizedDescription,
      followups: sanitizedFollowups
    });
  }

  /**
   * Get specific troubleshooting steps.
   */
  async getTroubleshooting(ticketId) {
    const numericId = parseInt(ticketId, 10);
    const ticket = await glpiService.getTicket(numericId);

    return geminiService.troubleshootTicket({
      id: numericId,
      title: sanitizeTicketContent(ticket.name, 200),
      description: sanitizeTicketContent(ticket.content, 2000)
    });
  }

  /**
   * Apply an approved AI recommendation to a ticket.
   */
  async applyRecommendation(ticketId, { itilcategories_id, priority, groups_id }) {
    const numericId = parseInt(ticketId, 10);
    logger.info(`Applying approved recommendation to Ticket #${numericId}`, {
      itilcategories_id,
      priority,
      groups_id
    });

    const updatePayload = {};
    if (itilcategories_id) updatePayload.itilcategories_id = parseInt(itilcategories_id, 10);
    if (priority && priority >= 1 && priority <= 6) updatePayload.priority = parseInt(priority, 10);

    // 1. Update Category & Priority on the ticket
    if (Object.keys(updatePayload).length > 0) {
      await glpiService.updateTicket(numericId, updatePayload);
    }

    // 2. Assign Group if specified
    if (groups_id) {
      await glpiService.assignGroupToTicket(numericId, parseInt(groups_id, 10));
    }

    // 3. Record Audit Trail in Ticket Timeline
    try {
      const auditText = `[AI Assistant] Recommendation approved & applied: ` +
        `Category ID: ${itilcategories_id || 'unchanged'}, Priority: ${priority || 'unchanged'}, Group ID: ${groups_id || 'unchanged'}.`;
      await glpiService.addFollowup(numericId, auditText);
    } catch (e) {
      logger.warn('Could not record followup audit log', { error: e.message });
    }

    return {
      ticketId: numericId,
      status: 'applied',
      appliedAt: new Date().toISOString()
    };
  }

  /**
   * Validates and verifies AI output against existing GLPI entities.
   * Ensures the AI never invents invalid category IDs or group IDs.
   */
  _validateAndAlignResponse(aiOutput, categories, groups) {
    // 1. Resolve Category
    let matchedCategory = categories.find(c =>
      c.id === aiOutput.suggestedCategoryId ||
      (c.completename && c.completename.toLowerCase() === (aiOutput.suggestedCategory || '').toLowerCase()) ||
      (c.name && c.name.toLowerCase() === (aiOutput.suggestedCategory || '').toLowerCase())
    );

    // Fallback: match partial category name
    if (!matchedCategory && aiOutput.suggestedCategory) {
      matchedCategory = categories.find(c =>
        (c.completename || c.name || '').toLowerCase().includes(aiOutput.suggestedCategory.toLowerCase())
      );
    }

    // 2. Resolve Group
    let matchedGroup = groups.find(g =>
      g.id === aiOutput.recommendedGroupId ||
      (g.completename && g.completename.toLowerCase() === (aiOutput.recommendedGroup || '').toLowerCase()) ||
      (g.name && g.name.toLowerCase() === (aiOutput.recommendedGroup || '').toLowerCase())
    );

    // Fallback: match partial group name
    if (!matchedGroup && aiOutput.recommendedGroup) {
      matchedGroup = groups.find(g =>
        (g.completename || g.name || '').toLowerCase().includes(aiOutput.recommendedGroup.toLowerCase())
      );
    }

    // 3. Resolve Priority (Default: Medium = 3)
    let priorityId = parseInt(aiOutput.suggestedPriorityId, 10);
    if (!priorityId || priorityId < 1 || priorityId > 6) {
      const pName = (aiOutput.suggestedPriority || 'medium').toLowerCase().trim();
      priorityId = PRIORITY_MAP[pName] || 3;
    }

    const priorityNames = {
      1: 'Very Low',
      2: 'Low',
      3: 'Medium',
      4: 'High',
      5: 'Very High',
      6: 'Major'
    };

    return {
      summary: typeof aiOutput.summary === 'string' && aiOutput.summary ? aiOutput.summary : 'Summary unavailable.',
      suggestedCategory: matchedCategory ? (matchedCategory.completename || matchedCategory.name) : (aiOutput.suggestedCategory || 'General'),
      suggestedCategoryId: matchedCategory ? matchedCategory.id : null,
      suggestedPriority: priorityNames[priorityId] || 'Medium',
      suggestedPriorityId: priorityId,
      possibleCause: typeof aiOutput.possibleCause === 'string' ? aiOutput.possibleCause : 'Pending technician inspection.',
      recommendedGroup: matchedGroup ? (matchedGroup.completename || matchedGroup.name) : (aiOutput.recommendedGroup || 'IT Support'),
      recommendedGroupId: matchedGroup ? matchedGroup.id : null,
      troubleshootingSteps: Array.isArray(aiOutput.troubleshootingSteps) && aiOutput.troubleshootingSteps.length > 0
        ? aiOutput.troubleshootingSteps
        : ['Verify physical connections.', 'Check device status.', 'Escalate to technician.'],
      confidence: ['low', 'medium', 'high'].includes((aiOutput.confidence || '').toLowerCase())
        ? aiOutput.confidence.toLowerCase()
        : 'medium',
      requiresTechnicianReview: true,
      safetyWarning: aiOutput.safetyWarning || null,
      isAiGenerated: true
    };
  }
}

module.exports = new TicketAnalysisService();
