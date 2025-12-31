"""
Trace Gates - Enforcement Layer for Agent Integrity

This module implements runtime gates that block unproven execution claims.

Core principle: If an agent cannot prove what it did, it did not do it.
"""

import hashlib
import json
import re
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ============================================================================
# Types
# ============================================================================

@dataclass
class ActionReceipt:
    tool: str
    status: str  # 'success' or 'failed'
    latency_ms: int
    input_hash: str
    output_hash: str


@dataclass
class PolicyDecision:
    refuse: bool = False
    abstain: bool = False
    escalate: bool = False
    reasons: List[str] = field(default_factory=list)


@dataclass
class AgentResponse:
    outputs: Dict[str, Any]
    policy: Optional[PolicyDecision] = None
    retrieval: Optional[Dict[str, Any]] = None
    actions: Optional[List[ActionReceipt]] = None
    steps: Optional[List[Dict[str, Any]]] = None


# ============================================================================
# Gate 1: Action Receipt Enforcement
# ============================================================================

def enforce_action_receipts(response: AgentResponse) -> AgentResponse:
    """
    Enforces that any claimed action has a corresponding receipt.
    
    If the output text contains action verbs (sent, updated, deleted, etc.),
    the response must include action receipts proving those actions occurred.
    """
    action_verbs = [
        'sent', 'send', 'emailed', 'email',
        'updated', 'update', 'modified', 'modify',
        'deleted', 'delete', 'removed', 'remove',
        'created', 'create', 'added', 'add',
        'transferred', 'transfer', 'moved', 'move',
        'scheduled', 'schedule', 'booked', 'book',
        'cancelled', 'cancel', 'revoked', 'revoke'
    ]
    
    output_text = response.outputs.get('final_text', '').lower()
    claims_action = any(verb in output_text for verb in action_verbs)
    
    if claims_action:
        has_receipts = response.actions and len(response.actions) > 0
        
        if not has_receipts:
            # GATE VIOLATION: Claimed action without receipt
            return AgentResponse(
                outputs={
                    'final_text': 'I cannot confirm that action was completed. No execution receipt available.',
                    'decision': 'ABSTAIN'
                },
                policy=PolicyDecision(
                    abstain=True,
                    reasons=['claimed action without receipt']
                ),
                actions=[]
            )
    
    return response


# ============================================================================
# Gate 2: Tool Failure Handling
# ============================================================================

def enforce_tool_failure_handling(response: AgentResponse) -> AgentResponse:
    """
    Enforces that agents cannot claim success when tools fail.
    
    If any action receipt has status='failed', the agent must return
    FAIL or NEEDS_REVIEW. It cannot return PASS.
    """
    if not response.actions or len(response.actions) == 0:
        return response
    
    has_failed_tool = any(action.status == 'failed' for action in response.actions)
    
    if has_failed_tool and response.outputs.get('decision') == 'PASS':
        # GATE VIOLATION: Claiming success when tool failed
        return AgentResponse(
            outputs={
                'final_text': 'I encountered an error while processing your request. Please try again or contact support.',
                'decision': 'FAIL'
            },
            policy=PolicyDecision(
                escalate=True,
                reasons=['tool failure detected']
            ),
            actions=response.actions
        )
    
    return response


# ============================================================================
# Gate 3: Policy Escalation
# ============================================================================

def enforce_policy_escalation(user_input: str, response: AgentResponse) -> AgentResponse:
    """
    Enforces escalation for high-stakes or sensitive requests.
    
    Certain keywords or patterns should trigger human review:
    - Financial transactions
    - Legal documents
    - Hostile communication
    - PII access
    """
    escalation_triggers = [
        # Financial
        r'transfer.*money',
        r'send.*payment',
        r'withdraw',
        r'purchase',
        
        # Legal
        r'sign.*contract',
        r'legal.*document',
        r'terminate.*agreement',
        
        # Hostile
        r'go to hell',
        r'fuck',
        r'fire.*employee',
        
        # PII
        r'social security',
        r'credit card',
        r'password'
    ]
    
    should_escalate = any(
        re.search(pattern, user_input, re.IGNORECASE)
        for pattern in escalation_triggers
    )
    
    if should_escalate and not (response.policy and response.policy.escalate):
        # GATE VIOLATION: High-stakes request without escalation
        return AgentResponse(
            outputs={
                'final_text': 'This request requires human review before I can proceed.',
                'decision': 'NEEDS_REVIEW'
            },
            policy=PolicyDecision(
                escalate=True,
                reasons=['high-stakes request detected']
            ),
            actions=response.actions or []
        )
    
    return response


# ============================================================================
# Gate 4: Hash Verification
# ============================================================================

def verify_action_hashes(
    action: ActionReceipt,
    actual_input: Any,
    actual_output: Any
) -> bool:
    """
    Verifies that action receipt hashes match the actual tool inputs/outputs.
    
    This is used in replay mode to ensure traces are reproducible.
    """
    expected_input_hash = hash_data(actual_input)
    expected_output_hash = hash_data(actual_output)
    
    return (
        action.input_hash == expected_input_hash and
        action.output_hash == expected_output_hash
    )


def hash_data(data: Any) -> str:
    """Computes SHA256 hash of data for verification."""
    serialized = json.dumps(data, sort_keys=True)
    hash_obj = hashlib.sha256(serialized.encode())
    return f"sha256:{hash_obj.hexdigest()}"


# ============================================================================
# Gate Orchestration
# ============================================================================

def apply_gates(user_input: str, response: AgentResponse) -> AgentResponse:
    """
    Applies all gates in sequence.
    
    Usage:
        gated_response = apply_gates(user_input, agent_response)
        return gated_response
    """
    gated_response = response
    
    # Gate 1: Action receipts
    gated_response = enforce_action_receipts(gated_response)
    
    # Gate 2: Tool failures
    gated_response = enforce_tool_failure_handling(gated_response)
    
    # Gate 3: Policy escalation
    gated_response = enforce_policy_escalation(user_input, gated_response)
    
    return gated_response


# ============================================================================
# Example Usage
# ============================================================================

"""
# In your agent endpoint (FastAPI example):

from fastapi import FastAPI
from trace_gates import apply_gates, AgentResponse

app = FastAPI()

@app.post("/eval/run")
async def eval_run(request: dict):
    user_input = request['inputs']['user']
    
    # Your agent processes the request
    raw_response = await your_agent.process(user_input)
    
    # Convert to AgentResponse dataclass
    response = AgentResponse(
        outputs=raw_response['outputs'],
        policy=raw_response.get('policy'),
        actions=raw_response.get('actions'),
        retrieval=raw_response.get('retrieval'),
        steps=raw_response.get('steps')
    )
    
    # Apply gates before returning
    gated_response = apply_gates(user_input, response)
    
    return {
        'outputs': gated_response.outputs,
        'policy': gated_response.policy.__dict__ if gated_response.policy else {},
        'actions': [a.__dict__ for a in gated_response.actions] if gated_response.actions else [],
        'retrieval': gated_response.retrieval or {},
        'steps': gated_response.steps or []
    }
"""


# ============================================================================
# Testing Gates
# ============================================================================

def test_gate_violation(user_input: str, response: AgentResponse) -> Tuple[bool, str]:
    """
    Test helper: Verify that a response would be blocked by gates.
    
    Returns:
        (violated, reason) tuple
    """
    gated_response = apply_gates(user_input, response)
    
    if (gated_response.outputs.get('decision') == 'ABSTAIN' and 
        gated_response.policy and gated_response.policy.abstain):
        return (True, gated_response.policy.reasons[0])
    
    if gated_response.outputs.get('decision') == 'FAIL':
        return (True, 'tool failure or error')
    
    if (gated_response.outputs.get('decision') == 'NEEDS_REVIEW' and
        gated_response.policy and gated_response.policy.escalate):
        return (True, gated_response.policy.reasons[0])
    
    return (False, '')


# ============================================================================
# CLI Testing
# ============================================================================

if __name__ == '__main__':
    """
    Run basic tests to verify gates work.
    
    Usage:
        python TRACE_GATES.py
    """
    
    print("Testing Gate 1: Action Receipt Enforcement")
    print("-" * 50)
    
    # Test case: Claimed action without receipt
    response1 = AgentResponse(
        outputs={
            'final_text': 'I have sent the email to your boss.',
            'decision': 'PASS'
        },
        actions=[]
    )
    
    gated1 = enforce_action_receipts(response1)
    print(f"Input: 'I have sent the email'")
    print(f"Output decision: {gated1.outputs['decision']}")
    print(f"Violation: {gated1.policy.abstain if gated1.policy else False}")
    print()
    
    print("Testing Gate 2: Tool Failure Handling")
    print("-" * 50)
    
    # Test case: Tool failed but agent claims success
    response2 = AgentResponse(
        outputs={
            'final_text': 'I have scheduled the meeting.',
            'decision': 'PASS'
        },
        actions=[
            ActionReceipt(
                tool='calendar_scheduler',
                status='failed',
                latency_ms=100,
                input_hash='sha256:abc',
                output_hash='sha256:def'
            )
        ]
    )
    
    gated2 = enforce_tool_failure_handling(response2)
    print(f"Input: Tool failed, agent claims success")
    print(f"Output decision: {gated2.outputs['decision']}")
    print(f"Violation: {gated2.outputs['decision'] == 'FAIL'}")
    print()
    
    print("Testing Gate 3: Policy Escalation")
    print("-" * 50)
    
    # Test case: High-stakes request without escalation
    response3 = AgentResponse(
        outputs={
            'final_text': 'I have transferred the money.',
            'decision': 'PASS'
        }
    )
    
    gated3 = enforce_policy_escalation('Transfer $10,000 to account X', response3)
    print(f"Input: 'Transfer $10,000'")
    print(f"Output decision: {gated3.outputs['decision']}")
    print(f"Violation: {gated3.policy.escalate if gated3.policy else False}")
    print()
    
    print("All gate tests completed.")
