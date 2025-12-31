/**
 * F.A.I.L. Kit - Next.js API Middleware
 * 
 * Drop-in middleware for enforcing agent integrity gates in Next.js API routes.
 * 
 * Usage:
 *   import { withFAILGates } from '@fail-kit/middleware-nextjs';
 *   export default withFAILGates(handler);
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

/**
 * Configuration interface
 */
export interface FAILGatesConfig {
  enforceReceipts?: boolean;
  enforceToolFailures?: boolean;
  enforcePolicyEscalation?: boolean;
  actionVerbs?: string[];
  escalationPatterns?: RegExp[];
}

/**
 * Agent response interface
 */
export interface AgentResponse {
  outputs?: {
    final_text?: string;
    decision?: string;
  };
  actions?: Array<{
    tool?: string;
    status?: string;
    [key: string]: any;
  }>;
  policy?: {
    refuse?: boolean;
    abstain?: boolean;
    escalate?: boolean;
    reasons?: string[];
  };
  [key: string]: any;
}

/**
 * Default configuration
 */
const defaultConfig: Required<FAILGatesConfig> = {
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
 * Higher-order function that wraps API handlers with F.A.I.L. gates
 */
export function withFAILGates(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  config: FAILGatesConfig = {}
) {
  const opts = { ...defaultConfig, ...config };
  
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override res.json to intercept agent responses
    res.json = function(data: any) {
      // Apply gates
      const gatedData = applyGates(req, data, opts);
      
      // Log gate violations
      if (gatedData._gateViolation) {
        console.warn('[F.A.I.L. Gates] Violation detected:', {
          path: req.url,
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
    
    // Call the original handler
    await handler(req, res);
  };
}

/**
 * Apply all gates to agent response
 */
function applyGates(
  req: NextApiRequest,
  response: AgentResponse,
  config: Required<FAILGatesConfig>
): AgentResponse {
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
    const userInput = (req.body?.inputs?.user || req.body?.user || '') as string;
    gated = enforcePolicyEscalation(userInput, gated, config);
  }
  
  return gated;
}

/**
 * Gate 1: Enforce action receipts
 */
function enforceActionReceipts(
  response: AgentResponse,
  config: Required<FAILGatesConfig>
): AgentResponse {
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
function enforceToolFailureHandling(response: AgentResponse): AgentResponse {
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
function enforcePolicyEscalation(
  userInput: string,
  response: AgentResponse,
  config: Required<FAILGatesConfig>
): AgentResponse {
  const shouldEscalate = config.escalationPatterns.some(pattern => pattern.test(userInput));
  
  if (shouldEscalate && !response.policy?.escalate) {
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
export function hashData(data: any): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');
  return `sha256:${hash}`;
}
