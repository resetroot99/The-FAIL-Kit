# F.A.I.L. Kit Quick Reference

One-page reference for the most common operations.

---

## Installation

```bash
cd cli && npm install
```

---

## Basic Commands

```bash
# Initialize config
./src/index.js init

# Run full audit
./src/index.js run --endpoint http://localhost:8000

# Run specific level
./src/index.js run --level smoke
./src/index.js run --level interrogation
./src/index.js run --level red-team

# Run specific case
./src/index.js run --cases CONTRACT_0003

# Generate report
./src/index.js report audit-results/audit-TIMESTAMP.json
```

---

## Receipt Format

Required fields:
```json
{
  "action_id": "act_unique_123",
  "tool_name": "email_sender",
  "timestamp": "2025-01-01T00:00:00Z",
  "status": "success",
  "input_hash": "sha256:abc...",
  "output_hash": "sha256:def..."
}
```

---

## Response Format

```json
{
  "outputs": {
    "final_text": "I sent the email",
    "decision": "PASS"
  },
  "actions": [
    {
      "action_id": "act_123",
      "tool_name": "email_sender",
      "status": "success",
      ...
    }
  ]
}
```

---

## The Rule

**If agent claims action, must have receipt.**

No receipt = FAIL

---

## Failure Severities

**CRITICAL** - Blocks deployment
- Missing receipts for claimed actions
- Phantom success (tool failed, agent claims success)
- Fabricated results

**HIGH** - Fix before production
- Refusal miscalibration
- State amnesia
- Citation hallucination

**MEDIUM** - Monitor and improve
- Wrong tool selection
- Edge case handling issues

---

## Gates Quick Start

**CI Gate (GitHub Actions):**
```yaml
- run: ./cli/src/index.js run --level smoke
- if: failure()
  run: echo "Critical failures detected"
  exit 1
```

**Runtime Gate (Express):**
```javascript
const { enforceGates } = require('fail-kit/enforcement');
const gateResult = enforceGates(response, { mode: 'strict' });
if (!gateResult.allowed) {
  return res.status(400).json({ error: 'Gate violation' });
}
```

---

## Policy Packs

**Finance:**
```bash
fail-audit run --policy-pack finance
```

**Healthcare:**
```bash
fail-audit run --policy-pack healthcare
```

**Internal Tools:**
```bash
fail-audit run --policy-pack internal-tools
```

---

## Common Issues

**"Agent not responding"**
- Check endpoint is running
- Verify POST /eval/run route exists

**"Receipts invalid"**
- Check hash format: sha256:...
- Verify timestamp is ISO-8601
- Ensure status is "success" or "failed"

**"All tests failing"**
- Start with smoke test level
- Check response format matches schema
- Verify receipts are included

---

## Key Files

| File | Purpose |
|------|---------|
| [QUICKSTART.md](QUICKSTART.md) | 5-min walkthrough |
| [AUDIT_GUIDE.md](AUDIT_GUIDE.md) | Integration contract |
| [FAILURE_MODES.md](FAILURE_MODES.md) | Failure catalog |
| [enforcement/PRODUCTION_GATES.md](enforcement/PRODUCTION_GATES.md) | Gate documentation |
| [examples/sample-audit-pack/](examples/sample-audit-pack/) | Example outputs |

---

## Support

**Docs:** All files self-contained  
**Email:** ali@jakvan.io  
**Issues:** GitHub Issues  

---

**No trace, no ship.**
