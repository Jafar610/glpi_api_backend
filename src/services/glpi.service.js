const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

class GlpiService {
  constructor() {
    this.apiEndpoint = config.glpi.apiEndpoint;
    this.userToken = config.glpi.userToken;
    this.appToken = config.glpi.appToken;
  }

  /**
   * Helper to build common headers.
   */
  _buildHeaders(extraHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders
    };
    if (this.appToken) {
      headers['App-Token'] = this.appToken;
    }
    return headers;
  }

  /**
   * Initialize a new GLPI API session using the service account user token.
   */
  async initSession() {
    try {
      const headers = this._buildHeaders({
        'Authorization': `user_token ${this.userToken}`
      });

      const response = await axios.get(`${this.apiEndpoint}/initSession`, {
        headers,
        timeout: 10000
      });

      if (response.data && response.data.session_token) {
        return response.data.session_token;
      }
      throw new Error('GLPI did not return a session_token');
    } catch (err) {
      const errDetails = err.response ? err.response.data : err.message;
      logger.error('Failed to init GLPI session', { error: errDetails });
      throw new Error(`GLPI Authentication Error: ${JSON.stringify(errDetails)}`);
    }
  }

  /**
   * Kill / close an active GLPI session token.
   */
  async killSession(sessionToken) {
    if (!sessionToken) return;
    try {
      const headers = this._buildHeaders({
        'Session-Token': sessionToken
      });
      await axios.get(`${this.apiEndpoint}/killSession`, {
        headers,
        timeout: 5000
      });
    } catch (err) {
      logger.warn('Failed to cleanly terminate GLPI session', {
        error: err.response ? err.response.data : err.message
      });
    }
  }

  /**
   * Execute an operation inside a session lifecycle.
   * Guarantees session cleanup even if the operation throws.
   */
  async withSession(callback) {
    const sessionToken = await this.initSession();
    try {
      return await callback(sessionToken);
    } finally {
      await this.killSession(sessionToken);
    }
  }

  /**
   * Retrieve a ticket by ID.
   */
  async getTicket(ticketId) {
    const numericId = parseInt(ticketId, 10);
    if (!numericId || numericId <= 0) {
      const error = new Error('Invalid ticket ID');
      error.statusCode = 400;
      throw error;
    }

    return this.withSession(async (sessionToken) => {
      try {
        const headers = this._buildHeaders({ 'Session-Token': sessionToken });
        const response = await axios.get(`${this.apiEndpoint}/Ticket/${numericId}`, {
          headers,
          timeout: 10000
        });
        return response.data;
      } catch (err) {
        if (err.response && err.response.status === 404) {
          const error = new Error(`Ticket #${numericId} not found`);
          error.statusCode = 404;
          throw error;
        }
        throw err;
      }
    });
  }

  /**
   * Retrieve ticket comments/followups for summarization.
   */
  async getTicketFollowups(ticketId) {
    const numericId = parseInt(ticketId, 10);
    return this.withSession(async (sessionToken) => {
      const headers = this._buildHeaders({ 'Session-Token': sessionToken });
      try {
        const response = await axios.get(`${this.apiEndpoint}/Ticket/${numericId}/ITILFollowup`, {
          headers,
          timeout: 10000
        });
        return Array.isArray(response.data) ? response.data : [];
      } catch (err) {
        // If no followups exist or endpoint returns 404, return empty array
        return [];
      }
    });
  }

  /**
   * Retrieve available ITIL categories.
   */
  async getCategories() {
    return this.withSession(async (sessionToken) => {
      const headers = this._buildHeaders({ 'Session-Token': sessionToken });
      const response = await axios.get(`${this.apiEndpoint}/ITILCategory`, {
        headers,
        params: { range: '0-100' },
        timeout: 10000
      });
      return Array.isArray(response.data) ? response.data : [];
    });
  }

  /**
   * Retrieve available technician groups.
   */
  async getGroups() {
    return this.withSession(async (sessionToken) => {
      const headers = this._buildHeaders({ 'Session-Token': sessionToken });
      const response = await axios.get(`${this.apiEndpoint}/Group`, {
        headers,
        params: { range: '0-100' },
        timeout: 10000
      });
      return Array.isArray(response.data) ? response.data : [];
    });
  }

  /**
   * Update a ticket (used when applying approved recommendations).
   */
  async updateTicket(ticketId, updateData) {
    const numericId = parseInt(ticketId, 10);
    return this.withSession(async (sessionToken) => {
      const headers = this._buildHeaders({ 'Session-Token': sessionToken });
      const payload = {
        input: {
          id: numericId,
          ...updateData
        }
      };
      const response = await axios.put(`${this.apiEndpoint}/Ticket/${numericId}`, payload, {
        headers,
        timeout: 10000
      });
      return response.data;
    });
  }

  /**
   * Assign a group to a ticket (Actor type: ASSIGN = 2).
   */
  async assignGroupToTicket(ticketId, groupId) {
    const numericTicketId = parseInt(ticketId, 10);
    const numericGroupId = parseInt(groupId, 10);
    if (!numericTicketId || !numericGroupId) return null;

    return this.withSession(async (sessionToken) => {
      const headers = this._buildHeaders({ 'Session-Token': sessionToken });
      try {
        const payload = {
          input: {
            tickets_id: numericTicketId,
            groups_id: numericGroupId,
            type: 2 // ASSIGN
          }
        };
        const response = await axios.post(`${this.apiEndpoint}/Group_Ticket`, payload, {
          headers,
          timeout: 10000
        });
        return response.data;
      } catch (err) {
        logger.warn('Could not assign group via Group_Ticket', {
          error: err.response ? err.response.data : err.message
        });
        return null;
      }
    });
  }

  /**
   * Add an audit followup / comment to the ticket.
   */
  async addFollowup(ticketId, content) {
    const numericTicketId = parseInt(ticketId, 10);
    return this.withSession(async (sessionToken) => {
      const headers = this._buildHeaders({ 'Session-Token': sessionToken });
      const payload = {
        input: {
          items_id: numericTicketId,
          itemtype: 'Ticket',
          content: content,
          is_private: 0
        }
      };
      const response = await axios.post(`${this.apiEndpoint}/ITILFollowup`, payload, {
        headers,
        timeout: 10000
      });
      return response.data;
    });
  }
}

module.exports = new GlpiService();
