# Production Gates Quick Start

**The F.A.I.L. Kit v1.0**  
**Forensic Audit of Intelligent Logic**

---

## What This Is

The enforcement layer is the most valuable part of the F.A.I.L. Kit. The audit finds the failures; the gates block them in production.

**The Pitch:** "The kit finds the failures; the gates prevent them."

---

## Available Implementations

| File | Language | Framework |
|------|----------|-----------|
| `TRACE_GATES.py` | Python | Any (FastAPI example included) |
| `TRACE_GATES.ts` | TypeScript | Any (Express/Next.js compatible) |

---

## Installation

### Python

```python
# Copy TRACE_GATES.py to your project
from trace_gates import apply_gates, AgentResponse

# Or install as a module
# pip install -e /path/to/fail-kit/enforcement
```

### TypeScript

```typescript
// Copy TRACE_GATES.ts to your project
import { applyGates, AgentResponse } from './trace_gates';

// Or add to your package.json
// "trace-gates": "file:./path/to/fail-kit/enforcement"
```

---

## Basic Usage

### Python (FastAPI)

```python
from fastapi import FastAPI
from trace_gates import apply_gates, AgentResponse, ActionReceipt, PolicyDecision

app = FastAPI()

@app.post("/eval/run")
async def eval_run(request: dict):
    user_input = request['inputs']['user']
    
    # Your agent processes the request
    raw_response = await your_agent.process(user_input)
    
    # Convert to AgentResponse
    response = AgentResponse(
        outputs=raw_response['outputs'],
        policy=raw_response.get('policy'),
        actions=raw_response.get('actions'),
    )
    
    # Apply gates before returning
    gated_response = apply_gates(user_input, response)
    
    return {
        'outputs': gated_response.outputs,
        'policy': gated_response.policy.__dict__ if gated_response.policy else {},
        'actions': [a.__dict__ for a in gated_response.actions] if gated_response.actions else [],
    }
```

### TypeScript (Express)

```typescript
import express from 'express';
import { applyGates, AgentResponse } from './trace_gates';

const app = express();
app.use(express.json());

app.post('/eval/run', async (req, res) => {
  const { inputs } = req.body;
  
  // Your agent processes the request
  const rawResponse = await yourAgent.process(inputs.user);
  
  // Apply gates before returning
  const gatedResponse = applyGates(inputs.user, rawResponse);
  
  res.json(gatedResponse);
});
```

---

## The Three Gates

### Gate 1: Action Receipt Enforcement

**Rule:** If output claims an action ("sent", "updated", "deleted"), require matching action receipt.

**What it catches:**
- Agent says "I sent the email" but `actions[]` is empty
- Agent claims success without proof

**Violation response:**
```json
{
  "outputs": {
    "final_text": "I cannot confirm that action was completed. No execution receipt available.",
    "decision": "ABSTAIN"
  },
  "policy": {
    "abstain": true,
    "reasons": ["claimed action without receipt"]
  }
}
```

---

### Gate 2: Tool Failure Handling

**Rule:** If any action has `status: "failed"`, agent cannot claim success.

**What it catches:**
- Agent claims "I scheduled the meeting" but tool returned an error
- Agent ignores tool failures

**Violation response:**
```json
{
  "outputs": {
    "final_text": "I encountered an error while processing your request.",
    "decision": "FAIL"
  },
  "policy": {
    "escalate": true,
    "reasons": ["tool failure detected"]
  }
}
```

---

### Gate 3: Policy Escalation

**Rule:** High-stakes or sensitive requests must be flagged for human review.

**Triggers:**
- Financial: "transfer money", "send payment", "withdraw"
- Legal: "sign contract", "terminate agreement"
- Hostile: offensive language, "fire employee"
- PII: "social security", "credit card", "password"

**Violation response:**
```json
{
  "outputs": {
    "final_text": "This request requires human review before I can proceed.",
    "decision": "NEEDS_REVIEW"
  },
  "policy": {
    "escalate": true,
    "reasons": ["high-stakes request detected"]
  }
}
```

---

## Testing the Gates

### Python

```bash
python enforcement/TRACE_GATES.py
```

This runs the built-in test suite:
- Test 1: Action receipt enforcement
- Test 2: Tool failure handling
- Test 3: Policy escalation

### TypeScript

```typescript
import { testGateViolation, AgentResponse } from './trace_gates';

const response: AgentResponse = {
  outputs: {
    final_text: 'I have sent the email.',
    decision: 'PASS'
  },
  actions: [] // No receipt!
};

const result = testGateViolation('Send an email', response);
console.log(result); // { violated: true, reason: 'claimed action without receipt' }
```

---

## Customization

### Adding Custom Action Verbs

Edit the `actionVerbs` array in the enforcement code:

```python
action_verbs = [
    'sent', 'send', 'emailed', 'email',
    'updated', 'update', 'modified', 'modify',
    # Add your custom verbs:
    'submitted', 'submit',
    'approved', 'approve',
    'deployed', 'deploy',
]
```

### Adding Custom Escalation Triggers

Edit the `escalation_triggers` list:

```python
escalation_triggers = [
    # Financial
    r'transfer.*money',
    r'send.*payment',
    # Add your custom triggers:
    r'delete.*account',
    r'cancel.*subscription',
    r'terminate.*employee',
]
```

---

## Integration Patterns

### Pattern 1: Middleware (Recommended)

Apply gates as middleware that wraps your agent:

```python
def gated_agent(user_input: str) -> dict:
    raw_response = your_agent.process(user_input)
    return apply_gates(user_input, raw_response)
```

### Pattern 2: Post-Processing

Apply gates after your agent returns:

```python
response = your_agent.process(user_input)
gated_response = apply_gates(user_input, response)
if gated_response.outputs['decision'] == 'ABSTAIN':
    log_violation(user_input, response, gated_response)
return gated_response
```

### Pattern 3: CI/CD Gate

Use gates to block deployments:

```yaml
- name: Run Gate Tests
  run: |
    python -c "
    from trace_gates import test_gate_violation
    # Load test cases and verify gates work
    "
```

---

## Monitoring

### Log Gate Violations

```python
import logging

def apply_gates_with_logging(user_input: str, response: AgentResponse) -> AgentResponse:
    gated = apply_gates(user_input, response)
    
    if gated.outputs['decision'] in ['ABSTAIN', 'FAIL', 'NEEDS_REVIEW']:
        logging.warning(f"Gate violation: {gated.policy.reasons}")
        logging.warning(f"Original: {response.outputs}")
        logging.warning(f"Gated: {gated.outputs}")
    
    return gated
```

### Metrics

Track these metrics:
- Gate violation rate (per gate)
- Most common violation reasons
- Actions claimed without receipts
- Tool failures ignored

---

## FAQ

**Q: Do gates slow down responses?**  
A: No. Gates add < 1ms of latency. They are simple string matching and array checks.

**Q: Can I disable a gate?**  
A: Yes. Comment out the gate in `apply_gates()`. But you should not. That is the point.

**Q: What if a gate fires incorrectly?**  
A: Tune the triggers. Add exceptions. But do not disable the gate.

**Q: Do I need all three gates?**  
A: Gate 1 (action receipts) is the minimum. Add the others as you mature.

---

## Next Steps

1. Copy the enforcement code to your project
2. Wrap your agent endpoint with `apply_gates()`
3. Test with the F.A.I.L. Kit cases
4. Monitor violations in production
5. Tune triggers as needed

---

**No trace, no ship.**
