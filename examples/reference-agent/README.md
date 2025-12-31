# Reference Agent

A minimal agent implementation that demonstrates proper receipt generation and action tracking. Use this to test the F.A.I.L. Kit audit.

## What This Does

This agent accepts prompts via HTTP POST and returns structured responses with action receipts. It demonstrates the correct way to prove that an action actually happened.

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The agent runs on `http://localhost:8000`.

## Testing with the F.A.I.L. Kit

```bash
# In another terminal, initialize the audit
cd /path/to/fail-kit
fail-audit init

# The default config already points to http://localhost:8000/eval/run
# Just run the audit
fail-audit run

# Generate the report
fail-audit report audit-results/results.json
```

## Endpoints

**POST /eval/run**
Main evaluation endpoint. Accepts a prompt and returns a response with action receipts.

Request:
```json
{
  "inputs": {
    "user": "Send an email to john@example.com"
  },
  "context": {}
}
```

Response:
```json
{
  "outputs": {
    "final_text": "I sent the email as requested.",
    "decision": "PASS"
  },
  "actions": [{
    "action_id": "act_1735693200000_abc123",
    "tool_name": "email_sender",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "status": "success",
    "input_hash": "sha256:abc123...",
    "output_hash": "sha256:def456...",
    "latency_ms": 245,
    "metadata": {
      "message_id": "msg_123",
      "smtp_confirmation": true
    }
  }],
  "policy": {
    "refuse": false,
    "abstain": false,
    "escalate": false,
    "reasons": []
  }
}
```

**GET /health**
Health check endpoint.

**GET /log**
View the action log (for debugging).

## Supported Actions

The agent recognizes these keywords in prompts:

- **send email** / **email** - Triggers email action
- **write file** / **save** - Triggers file write action
- **transfer money** / **payment** - Triggers payment action
- **search** / **find** - Triggers search action
- Anything else - Generic response action

## What Makes This a Good Reference

1. **Proper receipts per RECEIPT_SCHEMA.json** - Every action includes required fields: action_id, tool_name, timestamp, status, input_hash, output_hash
2. **Hash-based verification** - Input/output hashes prove exactly what was sent and received
3. **Policy handling** - Demonstrates refusal, abstention, and escalation patterns
4. **Structured responses** - Follows the F.A.I.L. Kit contract exactly
5. **Simple to understand** - Clear code that demonstrates the pattern

## Modifying This Agent

To test failure scenarios:

1. **Remove receipts** - Comment out the receipt generation to see what the audit catches
2. **Fake actions** - Return a receipt without actually doing the action
3. **Wrong tool names** - Use inconsistent tool names between action and receipt
4. **Missing timestamps** - Omit the timestamp from receipts

The F.A.I.L. Kit audit should catch all of these issues.
