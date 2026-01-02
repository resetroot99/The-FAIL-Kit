# LangChain Middleware Suite

Complete middleware adapters for integrating LangChain agents (Python and JavaScript/TypeScript) with the F.A.I.L. Kit audit framework.

## Directory Structure

```
langchain/
├── README.md                    # This file
├── python/                      # Python adapter (FastAPI)
│   ├── fail_kit_langchain.py   # Main adapter module
│   ├── pyproject.toml           # Package configuration
│   ├── test_fail_kit_langchain.py  # Tests
│   └── README.md                # Python-specific docs
├── javascript/                  # JavaScript/TypeScript adapter (Express)
│   ├── src/
│   │   ├── index.ts            # Main adapter module
│   │   └── index.test.ts       # Tests
│   ├── package.json             # Package configuration
│   ├── tsconfig.json            # TypeScript config
│   ├── jest.config.js           # Jest config
│   └── README.md                # JavaScript-specific docs
```

## Quick Links

- **[Complete Integration Guide](../../docs/LANGCHAIN_INTEGRATION.md)** - Full documentation
- **[Python Example](../../examples/langchain-python/)** - Working FastAPI example
- **[JavaScript Example](../../examples/langchain-javascript/)** - Working Express example

## Features

Both adapters provide:

- ✅ **Automatic receipt generation** - No manual instrumentation needed
- ✅ **Drop-in middleware** - Add one line to existing agents
- ✅ **Full schema compliance** - Matches RECEIPT_SCHEMA.json exactly
- ✅ **Receipt-generating tools** - Base class for custom tools
- ✅ **Legacy tool wrapping** - Convert existing tools
- ✅ **Error handling** - Automatic failure receipts
- ✅ **SHA256 verification** - Hash inputs/outputs
- ✅ **Custom metadata** - Extend receipts with tool-specific data
- ✅ **LangGraph support** (Python) - For complex agent workflows

## Installation

### Python

```bash
cd python/
pip install -e .
```

### JavaScript/TypeScript

```bash
cd javascript/
npm install
npm run build
```

## Usage

### Python (FastAPI + LangChain)

```python
from fastapi import FastAPI
from fail_kit_langchain import create_fail_kit_endpoint, ReceiptGeneratingTool

app = FastAPI()

class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email"
    
    def _execute(self, to: str, subject: str):
        send_email(to, subject)
        return {"status": "sent"}

tools = [EmailTool()]
agent_executor = AgentExecutor(agent=agent, tools=tools)

app.include_router(
    create_fail_kit_endpoint(agent_executor),
    prefix="/eval"
)
```

### JavaScript (Express + LangChain.js)

```typescript
import express from 'express';
import { createFailKitRouter, ReceiptGeneratingTool } from '@fail-kit/langchain-adapter';

const app = express();

class EmailTool extends ReceiptGeneratingTool {
  name = 'email_sender';
  description = 'Send an email';
  
  async _execute(input: { to: string; subject: string }) {
    await sendEmail(input.to, input.subject);
    return { status: 'sent' };
  }
}

const tools = [new EmailTool()];
const agentExecutor = new AgentExecutor({ agent, tools });

app.use('/eval', createFailKitRouter(agentExecutor));
```

## Testing

### Python

```bash
cd python/
pytest
```

### JavaScript

```bash
cd javascript/
npm test
```

## Running the Examples

### Python Example

```bash
cd ../../examples/langchain-python/
pip install -r requirements.txt
export OPENAI_API_KEY="your-key"
python main.py
```

Then in another terminal:
```bash
fail-audit run --endpoint http://localhost:8000/eval/run
```

### JavaScript Example

```bash
cd ../../examples/langchain-javascript/
npm install
echo "OPENAI_API_KEY=your-key" > .env
npm start
```

Then in another terminal:
```bash
fail-audit run --endpoint http://localhost:8000/eval/run
```

## Key Concepts

### 1. Receipt-Generating Tools

Instead of implementing `_run()` or `_call()`, implement `_execute()`:

```python
# Python
class MyTool(ReceiptGeneratingTool):
    def _execute(self, arg):
        return {"result": "done"}

# JavaScript
class MyTool extends ReceiptGeneratingTool {
  async _execute(input) {
    return { result: 'done' };
  }
}
```

The base class handles:
- Unique ID generation
- Timestamp recording
- Input/output hashing
- Latency tracking
- Error handling

### 2. Receipt Format

Every tool execution generates a receipt:

```json
{
  "action_id": "act_7f3b9c2d",
  "tool_name": "email_sender",
  "timestamp": "2025-01-02T12:00:00.000Z",
  "status": "success",
  "input_hash": "sha256:abc...",
  "output_hash": "sha256:def...",
  "latency_ms": 245
}
```

### 3. F.A.I.L. Kit Response Format

The adapter formats responses to match the expected schema:

```json
{
  "outputs": {
    "final_text": "I sent the email",
    "decision": "PASS"
  },
  "actions": [ /* receipts */ ],
  "policy": {
    "refuse": false,
    "abstain": false,
    "escalate": false,
    "reasons": []
  }
}
```

## Advanced Features

### Custom Metadata

```python
def _execute(self, arg):
    return {
        "result": "done",
        "metadata": {
            "custom_field": "value"
        }
    }
```

### Error Handling

```python
def _execute(self, arg):
    if invalid_input:
        raise ValueError("Clear error message")
    return result
```

Errors are automatically caught and added to receipts.

### Legacy Tool Wrapping

```python
from langchain.tools import Tool
from fail_kit_langchain import wrap_tool_with_receipts

legacy = Tool(name="search", func=search_func, description="Search")
wrapped = wrap_tool_with_receipts(legacy)
```

### LangGraph Support (Python)

```python
from langgraph.prebuilt import create_react_agent
from fail_kit_langchain import create_fail_kit_langgraph_endpoint

graph = create_react_agent(llm, tools)
app.include_router(
    create_fail_kit_langgraph_endpoint(graph),
    prefix="/eval"
)
```

## Common Issues

### No Receipts Generated

Ensure tools extend `ReceiptGeneratingTool` and `return_intermediate_steps=True`:

```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    return_intermediate_steps=True  # ← Required
)
```

### Schema Validation Failed

Tools should return structured data:

```python
# ✅ Good
return {"status": "success", "result": data}

# ❌ Bad
return "done"
```

### ImportError

Install in development mode:

```bash
# Python
pip install -e .

# JavaScript
npm install && npm run build
```

## Documentation

- **[Complete Integration Guide](../../docs/LANGCHAIN_INTEGRATION.md)** - Full documentation with examples
- **[Python README](python/README.md)** - Python-specific details
- **[JavaScript README](javascript/README.md)** - JavaScript-specific details

## License

See [LICENSE.txt](../../LICENSE.txt)

---

**No trace, no ship.** 🛡️
