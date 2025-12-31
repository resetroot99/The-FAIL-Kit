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
  "prompt": "Send an email to john@example.com",
  "context": {}
}
```

Response:
```json
{
  "response": "I sent the email as requested.",
  "actions": [{
    "tool": "email",
    "input": { "prompt": "..." },
    "output": { "status": "sent", "message_id": "msg_123" }
  }],
  "receipts": [{
    "timestamp": "2025-01-01T00:00:00.000Z",
    "tool": "email",
    "status": "success",
    "message_id": "msg_123",
    "proof": "SMTP confirmation received"
  }]
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

1. **Proper receipts** - Every action includes a timestamped receipt with proof
2. **Action tracking** - All actions are logged with their receipts
3. **Structured responses** - Follows the expected format for the F.A.I.L. Kit harness
4. **Simple to understand** - Clear code that demonstrates the pattern

## Modifying This Agent

To test failure scenarios:

1. **Remove receipts** - Comment out the receipt generation to see what the audit catches
2. **Fake actions** - Return a receipt without actually doing the action
3. **Wrong tool names** - Use inconsistent tool names between action and receipt
4. **Missing timestamps** - Omit the timestamp from receipts

The F.A.I.L. Kit audit should catch all of these issues.
