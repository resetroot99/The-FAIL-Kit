# LangChain.js + Express Example

Complete example of a LangChain.js agent with F.A.I.L. Kit integration.

## Features

- ✅ Email sending tool with receipts
- ✅ Calendar scheduling tool with receipts  
- ✅ Database operations with receipts
- ✅ Automatic receipt generation on tool use
- ✅ Express endpoint for F.A.I.L. Kit audits
- ✅ Full schema compliance
- ✅ TypeScript support

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```bash
OPENAI_API_KEY=your-key-here
PORT=8000
```

3. Run the server:

```bash
npm start
```

The agent will start on `http://localhost:8000`

## Testing

### Manual Test

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Send an email to sarah@example.com with subject Meeting Tomorrow"}'
```

### F.A.I.L. Kit Audit

1. Start the agent (keep it running):
```bash
npm start
```

2. In another terminal, run the audit:
```bash
cd ../../
./cli/src/index.js run --endpoint http://localhost:8000/eval/run
```

## Example Requests

### Email Tool

```bash
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Send an email to john@example.com saying the project is complete"
  }'
```

### Calendar Tool

```bash
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Schedule a meeting titled Team Sync on Dec 25 at 2pm with alice@example.com"
  }'
```

### Database Tool

```bash
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Save user data to the database: {name: Bob, email: bob@example.com}"
  }'
```

## Expected Response Format

```json
{
  "outputs": {
    "final_text": "I sent the email to john@example.com",
    "decision": "PASS"
  },
  "actions": [
    {
      "action_id": "act_7f3b9c2d",
      "tool_name": "email_sender",
      "timestamp": "2025-01-02T12:00:00.000Z",
      "status": "success",
      "input_hash": "sha256:abc123...",
      "output_hash": "sha256:def456...",
      "latency_ms": 245,
      "metadata": {
        "smtp_server": "smtp.example.com",
        "priority": "normal",
        "encrypted": true
      }
    }
  ],
  "policy": {
    "refuse": false,
    "abstain": false,
    "escalate": false,
    "reasons": []
  }
}
```

## Adding Your Own Tools

Extend `ReceiptGeneratingTool` with your custom logic:

```typescript
class MyCustomTool extends ReceiptGeneratingTool {
  name = 'my_tool';
  description = 'What my tool does';
  
  async _execute(input: { arg1: string; arg2: number }) {
    // Your tool logic here
    const result = await doSomething(input.arg1, input.arg2);
    
    // Return structured data
    return {
      status: 'success',
      result,
      metadata: {
        custom_field: 'custom_value'
      }
    };
  }
}

// Add to tools list
const tools = [new EmailTool(), new CalendarTool(), new MyCustomTool()];
```

## Development Mode

For auto-reload during development:

```bash
npm run dev
```

## Building for Production

```bash
npm run build
node dist/server.js
```

## Troubleshooting

**"Cannot find module '@fail-kit/langchain-adapter'"**

The example imports directly from source. Make sure the middleware is in the correct path:
```
middleware/langchain/javascript/src/index.ts
```

**"No receipts in response"**

The router automatically enables `returnIntermediateSteps`. If you're not seeing receipts, check that your tools extend `ReceiptGeneratingTool`.

**"Tool execution failed"**

Check the logs - tools intentionally fail for certain inputs to demonstrate error handling.

## Next Steps

- Run the full F.A.I.L. Kit audit suite
- Add custom tools for your use case
- Deploy to production with middleware gates
- Add to CI/CD pipeline

**No trace, no ship.** 🛡️
