# F.A.I.L. Kit Express Example

A complete example showing how to integrate F.A.I.L. Kit with an Express application.

## What This Example Does

This is a simple "Order Processing" agent that can:
- Check order status (uses database lookup)
- Process payments (uses payment processor)
- Handle cancellations (escalates to human)

The agent generates proper action receipts for each operation.

## Quick Start

### 1. Install Dependencies

```bash
cd examples/express-example
npm install
```

### 2. Start the Server

```bash
npm start
```

You should see:
```
╔══════════════════════════════════════════════════════════════╗
║  F.A.I.L. Kit Express Example                                ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:8000                     ║
║  F.A.I.L. Kit endpoint: http://localhost:8000/eval/run       ║
╚══════════════════════════════════════════════════════════════╝
```

### 3. Test the Agent

```bash
# Check order status
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"user": "Check the status of order ORD-001"}}'
```

Expected response:
```json
{
  "outputs": {
    "final_text": "Order ORD-001 for John Doe is currently pending. Total: $99.99",
    "decision": "PASS"
  },
  "actions": [
    {
      "action_id": "act_lookup_1704067200000",
      "tool_name": "database_query",
      "status": "success"
    }
  ]
}
```

### 4. Run the Audit

In a new terminal:

```bash
# Initialize F.A.I.L. Kit
fail-audit init --framework express

# Auto-generate test cases
fail-audit scan

# Run the audit
fail-audit run --format html

# Open the report
open audit-results/audit-*.html
```

## Understanding the Code

### The Agent Function

```javascript
async function processOrderAgent(prompt, context) {
  const actions = [];
  
  // ... agent logic ...
  
  // Record actions with receipts
  actions.push({
    action_id: `act_lookup_${Date.now()}`,
    tool_name: 'database_query',
    timestamp: new Date().toISOString(),
    status: 'success',
    input_hash: '...',
    output_hash: '...',
    latency_ms: 45
  });
  
  return { response, actions };
}
```

### The F.A.I.L. Kit Integration

```javascript
app.use('/eval', failAuditMiddleware({
  handler: async (prompt, context) => {
    const result = await processOrderAgent(prompt, context);
    return {
      response: result.response,
      actions: result.actions,
    };
  }
}));
```

That's it! The middleware handles:
- Request parsing
- Response formatting
- Auto-generating receipts if needed

## Test Scenarios

| Prompt | Expected Behavior |
|--------|-------------------|
| "Check order ORD-001" | Returns status with database receipt |
| "Process payment" | Returns confirmation with payment receipt |
| "Cancel my order" | Escalates to human (no action taken) |
| "What can you do?" | Returns help text (no actions) |

## Next Steps

1. Replace the mock database with your real data layer
2. Add your actual agent logic
3. Generate receipts for all actions your agent takes
4. Run `fail-audit scan` to auto-generate test cases
5. Run `fail-audit run` to audit your agent

## Files

- `server.js` - Main Express server with agent logic
- `package.json` - Dependencies and scripts
- `README.md` - This file

## Related

- [Easy Integration Guide](../../docs/EASY_INTEGRATION.md)
- [F.A.I.L. Kit Documentation](../../README.md)
- [Express Middleware Package](https://www.npmjs.com/package/@fail-kit/middleware-express)
