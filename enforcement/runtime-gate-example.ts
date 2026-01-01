// Runtime Gate Enforcement for Express
// Validates agent responses before returning to user

import crypto from 'crypto';

interface ActionReceipt {
  action_id: string;
  tool_name: string;
  timestamp: string;
  status: 'success' | 'failed';
  input_hash: string;
  output_hash: string;
  latency_ms?: number;
  error_message?: string;
}

interface AgentResponse {
  outputs: {
    final_text: string;
    decision: 'PASS' | 'FAIL' | 'NEEDS_REVIEW' | 'ABSTAIN';
  };
  actions?: ActionReceipt[];
  policy?: {
    escalate?: boolean;
    reason?: string;
  };
}

interface GateConfig {
  mode: 'strict' | 'warn' | 'off';
  policyPack?: string;
  escalateThreshold?: number;
  enforceReceipts?: boolean;
  enforceToolStatus?: boolean;
}

interface GateResult {
  allowed: boolean;
  decision: string;
  reason?: string;
  violations?: string[];
}

// Action verbs that indicate the agent claimed to do something
const ACTION_VERBS = [
  'sent', 'send', 'emailed', 'email',
  'updated', 'update', 'modified', 'modify',
  'deleted', 'delete', 'removed', 'remove',
  'created', 'create', 'added', 'add',
  'scheduled', 'schedule', 'booked', 'book',
  'transferred', 'transfer', 'paid', 'pay',
  'wrote', 'write', 'saved', 'save'
];

// High-stakes keywords that require escalation
const HIGH_STAKES_KEYWORDS = [
  'fire', 'terminate', 'delete all',
  'transfer money', 'payment', 'refund',
  'legal', 'contract', 'agreement',
  'confidential', 'sensitive', 'private'
];

/**
 * Check if output text claims an action was taken
 */
function claimedAction(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ACTION_VERBS.some(verb => {
    const pattern = new RegExp(`\\b(i|i've|i have)\\s+${verb}`, 'i');
    return pattern.test(lowerText);
  });
}

/**
 * Check if request is high-stakes
 */
function isHighStakes(text: string): boolean {
  const lowerText = text.toLowerCase();
  return HIGH_STAKES_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Validate receipts match claimed actions
 */
function hasMatchingReceipt(text: string, actions: ActionReceipt[]): boolean {
  if (!actions || actions.length === 0) {
    return false;
  }
  
  // Simple heuristic: if agent claims action and has receipts, consider matched
  // In production, implement more sophisticated matching
  return actions.some(a => a.status === 'success');
}

/**
 * Check if any tools failed
 */
function hasFailedTools(actions: ActionReceipt[]): boolean {
  if (!actions || actions.length === 0) {
    return false;
  }
  return actions.some(a => a.status === 'failed');
}

/**
 * Enforce gate rules on agent response
 */
export function enforceGates(
  response: AgentResponse,
  config: GateConfig,
  requestText?: string
): GateResult {
  if (config.mode === 'off') {
    return { allowed: true, decision: response.outputs.decision };
  }

  const violations: string[] = [];

  // Rule 1: Action claims require receipts
  if (config.enforceReceipts !== false) {
    const claimed = claimedAction(response.outputs.final_text);
    const hasReceipts = hasMatchingReceipt(
      response.outputs.final_text,
      response.actions || []
    );
    
    if (claimed && !hasReceipts) {
      violations.push('Claimed action without receipt');
    }
  }

  // Rule 2: Tool failures cannot report success
  if (config.enforceToolStatus !== false) {
    const failedTools = hasFailedTools(response.actions || []);
    if (failedTools && response.outputs.decision === 'PASS') {
      violations.push('Tool failure reported as success');
    }
  }

  // Rule 3: High-stakes requests require escalation
  if (requestText && isHighStakes(requestText)) {
    if (!response.policy?.escalate) {
      violations.push('High-stakes request without escalation flag');
    }
  }

  // Rule 4: Escalation flag must be honored
  if (response.policy?.escalate && response.outputs.decision === 'PASS') {
    violations.push('Escalation flag ignored');
  }

  // Determine result based on mode
  if (violations.length > 0) {
    if (config.mode === 'strict') {
      return {
        allowed: false,
        decision: 'NEEDS_REVIEW',
        reason: violations[0],
        violations
      };
    } else if (config.mode === 'warn') {
      console.warn('[FAIL-KIT GATE] Violations detected:', violations);
      return {
        allowed: true,
        decision: response.outputs.decision,
        violations
      };
    }
  }

  return {
    allowed: true,
    decision: response.outputs.decision
  };
}

/**
 * Express middleware for runtime gate enforcement
 */
export function gateMiddleware(config: GateConfig) {
  return async (req: any, res: any, next: any) => {
    // Intercept agent response
    const originalJson = res.json.bind(res);
    
    res.json = function(data: AgentResponse) {
      const requestText = req.body?.inputs?.user || req.body?.prompt;
      const gateResult = enforceGates(data, config, requestText);
      
      if (!gateResult.allowed) {
        // Log violation
        console.error('[FAIL-KIT GATE] Request blocked:', {
          timestamp: new Date().toISOString(),
          reason: gateResult.reason,
          violations: gateResult.violations,
          request: requestText
        });
        
        // Return gate violation response
        return originalJson({
          outputs: {
            final_text: 'Request could not be completed due to policy violation.',
            decision: 'NEEDS_REVIEW'
          },
          policy: {
            escalate: true,
            reason: gateResult.reason
          },
          gate_violation: {
            violations: gateResult.violations
          }
        });
      }
      
      // Log warnings if in warn mode
      if (config.mode === 'warn' && gateResult.violations) {
        console.warn('[FAIL-KIT GATE] Violations detected (warn mode):', {
          timestamp: new Date().toISOString(),
          violations: gateResult.violations,
          request: requestText
        });
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

// Example usage:
/*
import express from 'express';
import { gateMiddleware } from './runtime-gate-example';

const app = express();

app.use(express.json());

// Apply gate middleware
app.use('/agent', gateMiddleware({
  mode: 'strict',
  policyPack: 'finance',
  enforceReceipts: true,
  enforceToolStatus: true
}));

app.post('/agent/run', async (req, res) => {
  const result = await yourAgent.run(req.body);
  res.json(result); // Gate middleware will intercept
});

app.listen(8000);
*/
