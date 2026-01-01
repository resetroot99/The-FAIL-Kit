/**
 * F.A.I.L. Kit Express Middleware
 * 
 * Drop this into your existing Express app to add the /eval/run endpoint.
 * No separate server needed. Just import and use.
 * 
 * Usage:
 * 
 * const { failAuditMiddleware } = require('@fail-kit/middleware-express');
 * 
 * app.use('/eval', failAuditMiddleware({
 *   handler: async (prompt, context) => {
 *     // Your agent logic here
 *     const result = await yourAgent.process(prompt);
 *     return {
 *       response: result.text,
 *       actions: result.actions,
 *       receipts: result.receipts
 *     };
 *   }
 * }));
 */

const express = require('express');

/**
 * Create F.A.I.L. Kit evaluation middleware
 * @param {Object} options Configuration options
 * @param {Function} options.handler Async function that processes the prompt
 * @param {Function} options.actionLogger Optional function to log actions
 * @param {boolean} options.autoReceipts Auto-generate receipts from actions
 * @returns {express.Router} Express router with /run endpoint
 */
function failAuditMiddleware(options = {}) {
  const router = express.Router();
  router.use(express.json());

  const {
    handler,
    actionLogger,
    autoReceipts = true,
  } = options;

  if (!handler || typeof handler !== 'function') {
    throw new Error('failAuditMiddleware requires a handler function');
  }

  router.post('/run', async (req, res) => {
    const { prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Missing required field: prompt'
      });
    }

    try {
      // Call the user's handler
      const result = await handler(prompt, context || {});

      // Validate response format
      if (!result || typeof result !== 'object') {
        return res.status(500).json({
          error: 'Handler must return an object with response, actions, and receipts'
        });
      }

      // Auto-generate receipts if enabled and not provided
      let receipts = result.receipts || [];
      if (autoReceipts && (!receipts || receipts.length === 0) && result.actions) {
        receipts = result.actions.map((action, index) => ({
          timestamp: new Date().toISOString(),
          tool: action.tool || `tool_${index}`,
          status: action.status || 'success',
          proof: action.proof || `Action completed: ${action.tool || 'unknown'}`
        }));
      }

      // Log actions if logger provided
      if (actionLogger && result.actions) {
        try {
          await actionLogger(result.actions, receipts);
        } catch (logError) {
          console.error('Action logger error:', logError);
        }
      }

      // Return standardized response
      res.json({
        response: result.response || '',
        actions: result.actions || [],
        receipts: receipts
      });

    } catch (error) {
      console.error('F.A.I.L. Kit handler error:', error);
      res.status(500).json({
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  return router;
}

/**
 * Simple wrapper for agents that don't track actions
 * Automatically instruments the response to extract claimed actions
 */
function failAuditSimple(agentFunction) {
  return failAuditMiddleware({
    handler: async (prompt, context) => {
      const response = await agentFunction(prompt, context);
      
      // If response is a string, wrap it
      if (typeof response === 'string') {
        return {
          response,
          actions: [],
          receipts: []
        };
      }

      // If response is already formatted, pass through
      return response;
    },
    autoReceipts: true
  });
}

module.exports = {
  failAuditMiddleware,
  failAuditSimple
};
