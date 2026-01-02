# LangChain Adapter - Get Started in 5 Minutes

## Installation

### Python

```bash
cd middleware/langchain/python
pip install -e .
```

### JavaScript/TypeScript

```bash
cd middleware/langchain/javascript
npm install
npm run build
```

## Basic Usage

### Python Example

```python
from fastapi import FastAPI
from langchain.agents import AgentExecutor
from fail_kit_langchain import create_fail_kit_endpoint, ReceiptGeneratingTool

app = FastAPI()

# 1. Create a receipt-generating tool
class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email to a recipient"
    
    def _execute(self, to: str, subject: str, body: str):
        # Your email sending logic
        send_email(to, subject, body)
        return {
            "status": "sent",
            "message_id": "msg_123"
        }

# 2. Create your agent with receipt-generating tools
tools = [EmailTool()]
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    return_intermediate_steps=True  # Required for receipt extraction
)

# 3. Add F.A.I.L. Kit endpoint
app.include_router(
    create_fail_kit_endpoint(agent_executor),
    prefix="/eval"
)

# 4. Run your app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### JavaScript/TypeScript Example

```typescript
import express from 'express';
import { AgentExecutor } from 'langchain/agents';
import { createFailKitRouter, ReceiptGeneratingTool } from '@fail-kit/langchain-adapter';

const app = express();
app.use(express.json());

// 1. Create a receipt-generating tool
class EmailTool extends ReceiptGeneratingTool {
  name = 'email_sender';
  description = 'Send an email to a recipient';
  
  async _execute(input: { to: string; subject: string; body: string }) {
    // Your email sending logic
    await sendEmail(input.to, input.subject, input.body);
    return {
      status: 'sent',
      message_id: 'msg_123'
    };
  }
}

// 2. Create your agent with receipt-generating tools
const tools = [new EmailTool()];
const agentExecutor = new AgentExecutor({ agent, tools });

// 3. Add F.A.I.L. Kit endpoint
app.use('/eval', createFailKitRouter(agentExecutor));

// 4. Run your app
app.listen(8000, () => {
  console.log('Agent running on http://localhost:8000');
});
```

## Testing

### Start Your Agent

```bash
# Python
python main.py

# JavaScript
node server.js  # or npm start
```

### Test the Endpoint

```bash
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Send an email to john@example.com with subject Hello"
  }'
```

### Run F.A.I.L. Kit Audit

```bash
fail-audit run --endpoint http://localhost:8000/eval/run
```

## Expected Response

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
      "latency_ms": 245
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

## Next Steps

1. **Run the complete examples:**
   - [Python example](../../examples/langchain-python/README.md)
   - [JavaScript example](../../examples/langchain-javascript/README.md)

2. **Read the documentation:**
   - [Complete Integration Guide](../../docs/LANGCHAIN_INTEGRATION.md)
   - [Quick Reference](../../docs/LANGCHAIN_QUICK_REFERENCE.md)

3. **Add more tools:**
   - Calendar scheduling
   - Database operations
   - API calls
   - File operations

4. **Deploy to production:**
   - Add middleware gates
   - Set up CI/CD audits
   - Monitor receipts

## Common Issues

**"No module named 'fail_kit_langchain'"**
```bash
cd middleware/langchain/python
pip install -e .
```

**"No receipts in response"**
- Ensure tools extend `ReceiptGeneratingTool`
- Enable `return_intermediate_steps=True` in AgentExecutor

**"Schema validation failed"**
- Return dict from `_execute()`: `{"result": "done"}`
- Don't return raw strings

## Documentation Links

- [Main README](README.md) - Overview and features
- [Integration Guide](../../docs/LANGCHAIN_INTEGRATION.md) - Complete guide (600+ lines)
- [Quick Reference](../../docs/LANGCHAIN_QUICK_REFERENCE.md) - One-page reference
- [Python API](python/README.md) - Python-specific details
- [JavaScript API](javascript/README.md) - JavaScript-specific details

---

**No trace, no ship.** 🛡️
