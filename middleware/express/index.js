/**
 * F.A.I.L. Kit - Express Middleware
 * 
 * Drop-in middleware for enforcing agent integrity gates in Express apps.
 * 
 * Usage:
 *   const { failGates } = require('@fail-kit/middleware-express');
 *   app.use('/agent', failGates());
 */

const crypto = require('crypto');

/**
 * Default configuration
 */
const defaultConfig = {
  enforceReceipts: true,
  enforceToolFailures: true,
  enforcePolicyEscalation: true,
  actionVerbs: [
    'sent', 'send', 'emailed', 'email',
    'updated', 'update', 'modified', 'modify',
    'deleted', 'delete', 'removed', 'remove',
    'created', 'create', 'added', 'add',
    'transferred', 'transfer', 'moved', 'move',
    'scheduled', 'schedule', 'booked', 'book',
    'cancelled', 'cancel', 'revoked', 'revoke'
  ],
  escalationPatterns: [
    /transfer.*money/i,
    /send.*payment/i,
    /withdraw/i,
    /purchase/i,
    /sign.*contract/i,
    /legal.*document/i,
    /terminate.*agreement/i,
    /go to hell/i,
    /fuck/i,
    /fire.*employee/i,
    /social security/i,
    /credit card/i,
    /password/i
  ]
};

/**
 * Create F.A.I.L. gates middleware
 */
function failGates(config = {}) {
  const opts = { ...defaultConfig, ...config };
  
  return function failGatesMiddleware(req, res, next) {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override res.json to intercept agent responses
    res.json = function(data) {
      // Apply gates
      const gatedData = applyGates(req, data, opts);
      
      // Log gate violations
      if (gatedData._gateViolation) {
        console.warn('[F.A.I.L. Gates] Violation detected:', {
          path: req.path,
          violation: gatedData._gateViolation,
          original: data.outputs?.decision,
          gated: gatedData.outputs?.decision
        });
      }
      
      // Remove internal metadata
      delete gatedData._gateViolation;
      
      // Send gated response
      return originalJson(gatedData);
    };
    
    next();
  };
}

/**
 * Apply all gates to agent response
 */
function applyGates(req, response, config) {
  let gated = { ...response };
  
  // Gate 1: Action receipt enforcement
  if (config.enforceReceipts) {
    gated = enforceActionReceipts(gated, config);
  }
  
  // Gate 2: Tool failure handling
  if (config.enforceToolFailures) {
    gated = enforceToolFailureHandling(gated);
  }
  
  // Gate 3: Policy escalation
  if (config.enforcePolicyEscalation) {
    const userInput = req.body?.inputs?.user || req.body?.user || '';
    gated = enforcePolicyEscalation(userInput, gated, config);
  }
  
  return gated;
}

/**
 * Gate 1: Enforce action receipts
 */
function enforceActionReceipts(response, config) {
  if (!response.outputs) return response;
  
  const outputText = (response.outputs.final_text || '').toLowerCase();
  const claimsAction = config.actionVerbs.some(verb => outputText.includes(verb));
  
  if (claimsAction) {
    const hasReceipts = response.actions && response.actions.length > 0;
    
    if (!hasReceipts) {
      return {
        outputs: {
          final_text: 'I cannot confirm that action was completed. No execution receipt available.',
          decision: 'ABSTAIN'
        },
        policy: {
          refuse: false,
          abstain: true,
          escalate: false,
          reasons: ['claimed action without receipt']
        },
        actions: [],
        _gateViolation: 'action_without_receipt'
      };
    }
  }
  
  return response;
}

/**
 * Gate 2: Enforce tool failure handling
 */
function enforceToolFailureHandling(response) {
  if (!response.actions || response.actions.length === 0) {
    return response;
  }
  
  const hasFailedTool = response.actions.some(action => action.status === 'failed');
  
  if (hasFailedTool && response.outputs?.decision === 'PASS') {
    return {
      outputs: {
        final_text: 'I encountered an error while processing your request. Please try again or contact support.',
        decision: 'FAIL'
      },
      policy: {
        refuse: false,
        abstain: false,
        escalate: true,
        reasons: ['tool failure detected']
      },
      actions: response.actions,
      _gateViolation: 'tool_failure_ignored'
    };
  }
  
  return response;
}

/**
 * Gate 3: Enforce policy escalation
 */
function enforcePolicyEscalation(userInput, response, config) {
  const shouldEscalate = config.escalationPatterns.some(pattern => pattern.test(userInput));
  
  if (shouldEscalate && !(response.policy?.escalate)) {
    return {
      outputs: {
        final_text: 'This request requires human review before I can proceed.',
        decision: 'NEEDS_REVIEW'
      },
      policy: {
        refuse: false,
        abstain: false,
        escalate: true,
        reasons: ['high-stakes request detected']
      },
      actions: response.actions || [],
      _gateViolation: 'missing_escalation'
    };
  }
  
  return response;
}

/**
 * Utility: Hash data for verification
 */
function hashData(data) {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');
  return `sha256:${hash}`;
}

module.exports = {
  failGates,
  applyGates,
  enforceActionReceipts,
  enforceToolFailureHandling,
  enforcePolicyEscalation,
  hashData
};
