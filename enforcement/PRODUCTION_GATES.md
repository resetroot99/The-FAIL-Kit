# Production Gates
## Enforcement Layer for Agent Integrity

This document explains how to enforce the receipt standard in development and production.

---

## Three Enforcement Modes

### 1. CI Gate - Block Deployment

**Purpose:** Prevent agents with critical failures from reaching production.

**How it works:** Run audit as part of CI/CD pipeline. If critical failures detected, build fails.

**When to use:**
- Pre-deployment verification
- Pull request validation
- Release gating

**Example:** GitHub Actions workflow that runs audit on every PR.

See [ci-gate-example.yaml](ci-gate-example.yaml) for implementation.

---

### 2. Runtime Gate - Block or Escalate

**Purpose:** Enforce policies in production. Prevent execution without proof.

**How it works:** Middleware intercepts agent responses. If receipts missing or policies violated, return NEEDS_REVIEW or FAIL instead of executing.

**When to use:**
- Production enforcement
- High-stakes actions (payments, data deletion)
- Regulated environments

**Example:** Express middleware that validates receipts before responding to user.

See [runtime-gate-example.ts](runtime-gate-example.ts) for implementation.

---

### 3. Policy Packs - Vertical-Specific Rules

**Purpose:** Pre-configured gate rules for specific domains.

**How it works:** YAML configuration files define rules for different verticals (finance, healthcare, legal).

**When to use:**
- Domain-specific compliance requirements
- Industry regulations
- Custom organizational policies

**Available packs:**
- [finance.yaml](policy-packs/finance.yaml) - Transaction receipts, approval thresholds
- [healthcare.yaml](policy-packs/healthcare.yaml) - PHI handling, audit trails
- [internal-tools.yaml](policy-packs/internal-tools.yaml) - Write operations, data access

---

## What Gets Enforced

### Rule 1: Action Claims Require Receipts

**Trigger:** Output text contains action verbs (sent, updated, deleted, created, scheduled)

**Enforcement:** Must have matching action receipt in trace

**Failure mode:** Return NEEDS_REVIEW with message "Claimed action without proof"

**Code check:**
```typescript
if (claimedAction(output.text) && !hasMatchingReceipt(actions)) {
  return { decision: "NEEDS_REVIEW", reason: "No receipt for claimed action" };
}
```

---

### Rule 2: Tool Failures Cannot Report Success

**Trigger:** Any action receipt has status: "failed"

**Enforcement:** Agent cannot return decision: "PASS"

**Failure mode:** Force FAIL or NEEDS_REVIEW

**Code check:**
```typescript
const hasFailedTools = actions.some(a => a.status === "failed");
if (hasFailedTools && output.decision === "PASS") {
  return { decision: "FAIL", reason: "Tool failure reported as success" };
}
```

---

### Rule 3: High-Stakes Requests Escalate

**Trigger:** Request contains high-stakes keywords or actions above threshold

**Enforcement:** Set policy.escalate = true, route to human review

**Failure mode:** Return NEEDS_REVIEW with escalation flag

**Code check:**
```typescript
if (isHighStakes(request) && !hasHumanApproval(metadata)) {
  return { 
    decision: "NEEDS_REVIEW", 
    policy: { escalate: true },
    reason: "High-stakes action requires human approval"
  };
}
```

---

### Rule 4: Citations Must Link to Sources

**Trigger:** Output includes citations or references

**Enforcement:** Verify cited documents exist and contain claimed information

**Failure mode:** Return ABSTAIN if citations invalid

**Code check:**
```typescript
if (hasCitations(output) && !allCitationsValid(output, retrievedDocs)) {
  return { decision: "ABSTAIN", reason: "Invalid or fabricated citations" };
}
```

---

## Configuration

Gates can be configured via:

1. **Environment variables**
   ```bash
   FAIL_KIT_GATE_MODE=strict
   FAIL_KIT_ESCALATE_THRESHOLD=1000
   FAIL_KIT_POLICY_PACK=finance
   ```

2. **Config file** (fail-audit.config.json)
   ```json
   {
     "gates": {
       "mode": "strict",
       "enforce_receipts": true,
       "enforce_tool_status": true,
       "escalate_high_stakes": true
     }
   }
   ```

3. **Policy pack** (policy-packs/*.yaml)
   ```yaml
   name: finance
   rules:
     - require_receipt: true
       actions: [transfer, payment, refund]
     - escalate_above: 1000
       action: transfer
   ```

---

## Deployment Patterns

### Pattern 1: Fail Closed

Block all requests that violate gates. Return error to user.

**When to use:** High-stakes production systems (finance, healthcare)

**Risk:** False positives block valid requests

**Mitigation:** Provide clear error messages with remediation steps

---

### Pattern 2: Log and Continue

Log gate violations but allow execution. Monitor over time.

**When to use:** Early development, low-stakes applications

**Risk:** Violations reach production

**Mitigation:** Set alerts, review logs regularly, migrate to fail closed

---

### Pattern 3: Escalate to Human

Route violations to human review queue. Human makes final decision.

**When to use:** Medium-stakes applications, complex decision scenarios

**Risk:** Human review bottleneck

**Mitigation:** Define clear escalation criteria, automate low-risk cases

---

## Testing Gates

### Test with Reference Agent

```bash
# Start reference agent with gates enabled
cd examples/reference-agent
FAIL_KIT_GATE_MODE=strict npm start

# Run audit
cd ../../
./cli/src/index.js run --endpoint http://localhost:8000
```

### Test Specific Gate Rules

```bash
# Test action receipt enforcement
./cli/src/index.js run --cases CONTRACT_0003

# Test tool failure handling
./cli/src/index.js run --cases AGENT_0008

# Test escalation policy
./cli/src/index.js run --cases CONTRACT_0004
```

---

## Integration Examples

### Express.js

```javascript
const { enforceGates } = require('fail-kit/enforcement');

app.post('/agent/run', async (req, res) => {
  const result = await agent.run(req.body);
  
  const gateResult = enforceGates(result, {
    mode: 'strict',
    policyPack: 'finance'
  });
  
  if (gateResult.blocked) {
    return res.status(400).json({
      error: 'Gate violation',
      reason: gateResult.reason
    });
  }
  
  res.json(result);
});
```

### FastAPI

```python
from fail_kit.gates import enforce_gates

@app.post("/agent/run")
async def run_agent(request: dict):
    result = await agent.run(request)
    
    gate_result = enforce_gates(result, mode="strict", policy_pack="finance")
    
    if gate_result.blocked:
        raise HTTPException(
            status_code=400,
            detail={"error": "Gate violation", "reason": gate_result.reason}
        )
    
    return result
```

---

## Monitoring Gates

Track gate violations over time:

**Metrics to monitor:**
- Gate violation rate
- Violation type distribution
- False positive rate
- Time to remediation

**Alerting thresholds:**
- CRITICAL: Violation rate > 10%
- HIGH: New violation type appears
- MEDIUM: Violation rate increasing trend

**Dashboard queries:**
```sql
SELECT 
  gate_rule,
  COUNT(*) as violations,
  COUNT(DISTINCT agent_id) as affected_agents
FROM gate_violations
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY gate_rule
ORDER BY violations DESC;
```

---

## Troubleshooting

### Gate blocks valid requests

**Symptom:** Agent provides receipts but gate still blocks

**Cause:** Receipt format incorrect or incomplete

**Fix:** Validate receipt against RECEIPT_SCHEMA.json

### False escalations

**Symptom:** Low-risk requests trigger escalation

**Cause:** Escalation threshold too low or keywords too broad

**Fix:** Tune policy pack thresholds, refine keyword matching

### Performance impact

**Symptom:** Gate enforcement adds significant latency

**Cause:** Complex validation or external lookups

**Fix:** Cache validation results, optimize gate rules, run async

---

## Next Steps

1. Choose enforcement mode (CI, runtime, or both)
2. Select policy pack for your domain
3. Integrate gates into your stack
4. Test with audit cases
5. Monitor violations
6. Tune policies based on production data

---

**Contact:** [ali@jakvan.io](mailto:ali@jakvan.io)
