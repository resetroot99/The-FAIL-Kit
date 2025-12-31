/**
 * Trace Gates - Enforcement Layer for Agent Integrity
 * 
 * This module implements runtime gates that block unproven execution claims.
 * 
 * Core principle: If an agent cannot prove what it did, it did not do it.
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

interface ActionReceipt {
  tool: string;
  status: 'success' | 'failed';
  latency_ms: number;
  input_hash: string;
  output_hash: string;
}

interface PolicyDecision {
  refuse: boolean;
  abstain: boolean;
  escalate: boolean;
  reasons: string[];
}

interface AgentResponse {
  outputs: {
    final_text: string;
    decision: 'PASS' | 'FAIL' | 'NEEDS_REVIEW' | 'ABSTAIN';
  };
  policy?: PolicyDecision;
  retrieval?: {
    queries: string[];
    doc_ids: string[];
  };
  actions?: ActionReceipt[];
  steps?: Array<{ step: string; duration_ms: number }>;
}

// ============================================================================
// Gate 1: Action Receipt Enforcement
// ============================================================================

/**
 * Enforces that any claimed action has a corresponding receipt.
 * 
 * If the output text contains action verbs (sent, updated, deleted, etc.),
 * the response must include action receipts proving those actions occurred.
 */
export function enforceActionReceipts(response: AgentResponse): AgentResponse {
  const actionVerbs = [
    'sent', 'send', 'emailed', 'email',
    'updated', 'update', 'modified', 'modify',
    'deleted', 'delete', 'removed', 'remove',
    'created', 'create', 'added', 'add',
    'transferred', 'transfer', 'moved', 'move',
    'scheduled', 'schedule', 'booked', 'book',
    'cancelled', 'cancel', 'revoked', 'revoke'
  ];

  const outputText = response.outputs.final_text.toLowerCase();
  const claimsAction = actionVerbs.some(verb => outputText.includes(verb));

  if (claimsAction) {
    const hasReceipts = response.actions && response.actions.length > 0;
    
    if (!hasReceipts) {
      // GATE VIOLATION: Claimed action without receipt
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
        actions: []
      };
    }
  }

  return response;
}

// ============================================================================
// Gate 2: Tool Failure Handling
// ============================================================================

/**
 * Enforces that agents cannot claim success when tools fail.
 * 
 * If any action receipt has status='failed', the agent must return
 * FAIL or NEEDS_REVIEW. It cannot return PASS.
 */
export function enforceToolFailureHandling(response: AgentResponse): AgentResponse {
  if (!response.actions || response.actions.length === 0) {
    return response;
  }

  const hasFailedTool = response.actions.some(action => action.status === 'failed');

  if (hasFailedTool && response.outputs.decision === 'PASS') {
    // GATE VIOLATION: Claiming success when tool failed
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
      actions: response.actions
    };
  }

  return response;
}

// ============================================================================
// Gate 3: Policy Escalation
// ============================================================================

/**
 * Enforces escalation for high-stakes or sensitive requests.
 * 
 * Certain keywords or patterns should trigger human review:
 * - Financial transactions
 * - Legal documents
 * - Hostile communication
 * - PII access
 */
export function enforcePolicyEscalation(
  userInput: string,
  response: AgentResponse
): AgentResponse {
  const escalationTriggers = [
    // Financial
    /transfer.*money/i,
    /send.*payment/i,
    /withdraw/i,
    /purchase/i,
    
    // Legal
    /sign.*contract/i,
    /legal.*document/i,
    /terminate.*agreement/i,
    
    // Hostile
    /go to hell/i,
    /fuck/i,
    /fire.*employee/i,
    
    // PII
    /social security/i,
    /credit card/i,
    /password/i
  ];

  const shouldEscalate = escalationTriggers.some(pattern => pattern.test(userInput));

  if (shouldEscalate && !response.policy?.escalate) {
    // GATE VIOLATION: High-stakes request without escalation
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
      actions: response.actions || []
    };
  }

  return response;
}

// ============================================================================
// Gate 4: Hash Verification
// ============================================================================

/**
 * Verifies that action receipt hashes match the actual tool inputs/outputs.
 * 
 * This is used in replay mode to ensure traces are reproducible.
 */
export function verifyActionHashes(
  action: ActionReceipt,
  actualInput: any,
  actualOutput: any
): boolean {
  const expectedInputHash = hashData(actualInput);
  const expectedOutputHash = hashData(actualOutput);

  return (
    action.input_hash === expectedInputHash &&
    action.output_hash === expectedOutputHash
  );
}

/**
 * Computes SHA256 hash of data for verification.
 */
export function hashData(data: any): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');
  return `sha256:${hash}`;
}

// ============================================================================
// Gate Orchestration
// ============================================================================

/**
 * Applies all gates in sequence.
 * 
 * Usage:
 *   const gatedResponse = applyGates(userInput, agentResponse);
 *   return gatedResponse;
 */
export function applyGates(
  userInput: string,
  response: AgentResponse
): AgentResponse {
  let gatedResponse = response;

  // Gate 1: Action receipts
  gatedResponse = enforceActionReceipts(gatedResponse);

  // Gate 2: Tool failures
  gatedResponse = enforceToolFailureHandling(gatedResponse);

  // Gate 3: Policy escalation
  gatedResponse = enforcePolicyEscalation(userInput, gatedResponse);

  return gatedResponse;
}

// ============================================================================
// Example Usage
// ============================================================================

/*

// In your agent endpoint:

app.post('/eval/run', async (req, res) => {
  const { inputs } = req.body;
  
  // Your agent processes the request
  const rawResponse = await yourAgent.process(inputs.user);
  
  // Apply gates before returning
  const gatedResponse = applyGates(inputs.user, rawResponse);
  
  res.json(gatedResponse);
});

*/

// ============================================================================
// Testing Gates
// ============================================================================

/**
 * Test helper: Verify that a response would be blocked by gates.
 */
export function testGateViolation(
  userInput: string,
  response: AgentResponse
): { violated: boolean; reason: string } {
  const gatedResponse = applyGates(userInput, response);

  if (gatedResponse.outputs.decision === 'ABSTAIN' && 
      gatedResponse.policy?.abstain) {
    return { violated: true, reason: gatedResponse.policy.reasons[0] };
  }

  if (gatedResponse.outputs.decision === 'FAIL') {
    return { violated: true, reason: 'tool failure or error' };
  }

  if (gatedResponse.outputs.decision === 'NEEDS_REVIEW' &&
      gatedResponse.policy?.escalate) {
    return { violated: true, reason: gatedResponse.policy.reasons[0] };
  }

  return { violated: false, reason: '' };
}

// ============================================================================
// Export
// ============================================================================

export default {
  enforceActionReceipts,
  enforceToolFailureHandling,
  enforcePolicyEscalation,
  verifyActionHashes,
  hashData,
  applyGates,
  testGateViolation
};
