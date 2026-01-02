# LangChain Adapter - Quick Reference

One-page reference for The-FAIL-Kit LangChain adapter.

## Installation

```bash
# Python
cd middleware/langchain/python && pip install -e .

# JavaScript
cd middleware/langchain/javascript && npm install && npm run build
```

## 5-Minute Setup

### Python

```python
# 1. Import
from fail_kit_langchain import create_fail_kit_endpoint, ReceiptGeneratingTool

# 2. Create tool
class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email"
    
    def _execute(self, to: str, subject: str):
        send_email(to, subject)
        return {"status": "sent"}

# 3. Add endpoint
app.include_router(
    create_fail_kit_endpoint(agent_executor),
    prefix="/eval"
)
```

### JavaScript

```typescript
// 1. Import
import { createFailKitRouter, ReceiptGeneratingTool } from '@fail-kit/langchain-adapter';

// 2. Create tool
class EmailTool extends ReceiptGeneratingTool {
  name = 'email_sender';
  description = 'Send an email';
  
  async _execute(input: { to: string; subject: string }) {
    await sendEmail(input.to, input.subject);
    return { status: 'sent' };
  }
}

// 3. Add endpoint
app.use('/eval', createFailKitRouter(agentExecutor));
```

## API Reference

### Python

| Function | Description |
|----------|-------------|
| `create_fail_kit_endpoint(executor, config?)` | Create FastAPI router with `/run` endpoint |
| `ReceiptGeneratingTool` | Base class for tools with auto-receipts |
| `extract_receipts_from_agent_executor(...)` | Extract receipts from intermediate steps |
| `wrap_tool_with_receipts(tool)` | Wrap legacy tool |
| `create_fail_kit_langgraph_endpoint(graph)` | LangGraph support |

### JavaScript

| Function | Description |
|----------|-------------|
| `createFailKitRouter(executor, config?)` | Create Express router with `/run` endpoint |
| `ReceiptGeneratingTool` | Base class for tools with auto-receipts |
| `extractReceiptsFromAgentExecutor(...)` | Extract receipts from intermediate steps |
| `wrapToolWithReceipts(tool)` | Wrap legacy tool |
| `createSimpleFailKitRouter(fn)` | Simple wrapper for basic agents |

## Receipt Format

```json
{
  "action_id": "act_7f3b9c2d",
  "tool_name": "email_sender",
  "timestamp": "2025-01-02T12:00:00.000Z",
  "status": "success",
  "input_hash": "sha256:abc123...",
  "output_hash": "sha256:def456...",
  "latency_ms": 245,
  "metadata": {
    "custom_field": "value"
  }
}
```

## Common Patterns

### Custom Metadata

```python
return {
    "result": "done",
    "metadata": {"priority": "high"}
}
```

### Error Handling

```python
def _execute(self, arg):
    if invalid:
        raise ValueError("Error message")
    return result
```

### Wrap Legacy Tool

```python
legacy = Tool(name="search", func=search)
wrapped = wrap_tool_with_receipts(legacy)
```

## Testing

```bash
# Start agent
python main.py  # or node server.js

# Run audit (in another terminal)
fail-audit run --endpoint http://localhost:8000/eval/run
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No receipts | Extend `ReceiptGeneratingTool`, enable `return_intermediate_steps=True` |
| Schema error | Return dict, not string: `{"result": "done"}` |
| Import error | Run `pip install -e .` or `npm install && npm run build` |

## Documentation

- **Complete Guide:** [docs/LANGCHAIN_INTEGRATION.md](docs/LANGCHAIN_INTEGRATION.md)
- **Python Example:** [examples/langchain-python/](examples/langchain-python/)
- **JavaScript Example:** [examples/langchain-javascript/](examples/langchain-javascript/)

## Example Tools

### Email Tool

```python
class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    
    def _execute(self, to: str, subject: str, body: str):
        send_email(to, subject, body)
        return {
            "status": "sent",
            "message_id": "msg_123",
            "metadata": {"priority": "high"}
        }
```

### Database Tool

```python
class DBTool(ReceiptGeneratingTool):
    name = "database_writer"
    
    def _execute(self, table: str, data: dict):
        if validate(data):
            db.insert(table, data)
            return {"status": "success", "record_id": "rec_123"}
        raise ValueError("Invalid data")
```

### API Tool

```typescript
class APITool extends ReceiptGeneratingTool {
  name = 'api_caller';
  
  async _execute(input: { endpoint: string; data: any }) {
    const response = await fetch(input.endpoint, {
      method: 'POST',
      body: JSON.stringify(input.data)
    });
    return {
      status: response.ok ? 'success' : 'failed',
      data: await response.json()
    };
  }
}
```

## Configuration

```python
# Python
config = FailKitConfig(
    auto_receipts=True,
    include_metadata=True,
    track_latency=True,
    hash_algorithm="sha256"
)

app.include_router(
    create_fail_kit_endpoint(agent_executor, config=config),
    prefix="/eval"
)
```

```typescript
// JavaScript
const config: FailKitConfig = {
  autoReceipts: true,
  includeMetadata: true,
  trackLatency: true,
  hashAlgorithm: 'sha256'
};

app.use('/eval', createFailKitRouter(agentExecutor, config));
```

## Response Format

```json
{
  "outputs": {
    "final_text": "I sent the email to john@example.com",
    "decision": "PASS"
  },
  "actions": [
    { /* receipt 1 */ },
    { /* receipt 2 */ }
  ],
  "policy": {
    "refuse": false,
    "abstain": false,
    "escalate": false,
    "reasons": []
  }
}
```

## Quick Test

```bash
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Send an email to test@example.com"}'
```

---

**No trace, no ship.** 🛡️
