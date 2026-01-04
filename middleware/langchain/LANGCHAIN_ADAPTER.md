# LangChain Adapter for The-FAIL-Kit

## Overview

A comprehensive, production-ready adapter that enables seamless integration between LangChain agents and The-FAIL-Kit audit framework. Available for both **Python (FastAPI)** and **JavaScript/TypeScript (Express)**.

## What It Does

The adapter automatically:
- Generates action receipts from tool executions
- Extracts intermediate steps from agent runs
- Formats responses to match F.A.I.L. Kit schema
- Hashes inputs/outputs for verification (SHA256)
- Tracks execution latency and errors
- Handles custom metadata

**Result:** Zero-friction integration - add one line of code to enable F.A.I.L. Kit audits.

## Quick Start

### Python (LangChain + FastAPI)

```python
from fail_kit_langchain import create_fail_kit_endpoint, ReceiptGeneratingTool

# 1. Create receipt-generating tool
class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email"
    
    def _execute(self, to: str, subject: str, body: str):
        send_email(to, subject, body)
        return {"status": "sent", "message_id": "msg_123"}

# 2. Add F.A.I.L. Kit endpoint (one line!)
app.include_router(
    create_fail_kit_endpoint(agent_executor),
    prefix="/eval"
)
```

### JavaScript (LangChain.js + Express)

```typescript
import { createFailKitRouter, ReceiptGeneratingTool } from '@fail-kit/langchain-adapter';

// 1. Create receipt-generating tool
class EmailTool extends ReceiptGeneratingTool {
  name = 'email_sender';
  description = 'Send an email';
  
  async _execute(input: { to: string; subject: string; body: string }) {
    await sendEmail(input.to, input.subject, input.body);
    return { status: 'sent', message_id: 'msg_123' };
  }
}

// 2. Add F.A.I.L. Kit endpoint (one line!)
app.use('/eval', createFailKitRouter(agentExecutor));
```

## Key Features

### 1. Automatic Receipt Generation

Tools extending `ReceiptGeneratingTool` automatically generate receipts:

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
    "smtp_server": "smtp.gmail.com",
    "priority": "high"
  }
}
```

### 2. Full Schema Compliance

All receipts conform to [RECEIPT_SCHEMA.json](RECEIPT_SCHEMA.json) with:
- Required fields: `action_id`, `tool_name`, `timestamp`, `status`, `input_hash`, `output_hash`
- Optional fields: `latency_ms`, `error_message`, `metadata`, `trace_id`

### 3. Error Handling

Automatic failure receipts when tools fail:

```python
def _execute(self, amount: float):
    if amount > 10000:
        raise ValueError("Amount exceeds limit")  # Caught and added to receipt
    return process_payment(amount)
```

### 4. Legacy Tool Support

Wrap existing LangChain tools:

```python
# Python
from langchain.tools import Tool
legacy_tool = Tool(name="search", func=search_api, description="Search")
wrapped = wrap_tool_with_receipts(legacy_tool)

# JavaScript
import { Tool } from '@langchain/core/tools';
const legacyTool = new Tool({...});
const wrapped = wrapToolWithReceipts(legacyTool);
```

### 5. LangGraph Support (Python)

Native support for LangGraph workflows:

```python
from langgraph.prebuilt import create_react_agent
from fail_kit_langchain import create_fail_kit_langgraph_endpoint

graph = create_react_agent(llm, tools)
app.include_router(
    create_fail_kit_langgraph_endpoint(graph),
    prefix="/eval"
)
```

## Installation

### Python

```bash
cd middleware/langchain/python
pip install -e .
```

**Dependencies:**
- fastapi >= 0.100.0
- langchain >= 0.1.0
- langchain-core >= 0.1.0
- pydantic >= 2.0.0

### JavaScript/TypeScript

```bash
cd middleware/langchain/javascript
npm install
npm run build
```

**Dependencies:**
- express ^4.18.0
- langchain >= 0.1.0
- @langchain/core >= 0.1.0

## Project Structure

```
The-FAIL-Kit/
├── middleware/langchain/
│   ├── README.md                    # Overview and features
│   ├── python/
│   │   ├── fail_kit_langchain.py   # Core adapter (450+ lines)
│   │   ├── pyproject.toml           # Package config
│   │   ├── test_fail_kit_langchain.py  # Test suite
│   │   └── README.md
│   └── javascript/
│       ├── src/
│       │   ├── index.ts             # Core adapter (550+ lines)
│       │   └── index.test.ts        # Test suite
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── examples/
│   ├── langchain-python/            # Complete Python example
│   │   ├── main.py                  # Working FastAPI app
│   │   ├── requirements.txt
│   │   └── README.md
│   └── langchain-javascript/        # Complete JS/TS example
│       ├── src/server.ts            # Working Express app
│       ├── package.json
│       └── README.md
└── docs/
    ├── LANGCHAIN_INTEGRATION.md     # Complete 600+ line guide
    └── LANGCHAIN_QUICK_REFERENCE.md # One-page reference
```

## Documentation

### Quick Start
- [Quick Reference](docs/LANGCHAIN_QUICK_REFERENCE.md) - One-page reference

### Complete Guides
- [LangChain Integration Guide](docs/LANGCHAIN_INTEGRATION.md) - Complete documentation (600+ lines)
- [Python Adapter README](middleware/langchain/python/README.md) - Python-specific API
- [JavaScript Adapter README](middleware/langchain/javascript/README.md) - JavaScript-specific API

### Examples
- [Python Example](examples/langchain-python/README.md) - Complete working FastAPI example
- [JavaScript Example](examples/langchain-javascript/README.md) - Complete working Express example

## Examples

### Complete Python Example

See [examples/langchain-python/](examples/langchain-python/) for a full working example with:
- EmailTool with receipts
- CalendarTool with receipts
- DatabaseTool with error handling
- FastAPI app setup
- Test endpoints

**Run it:**
```bash
cd examples/langchain-python
pip install -r requirements.txt
export OPENAI_API_KEY="your-key"
python main.py
```

### Complete JavaScript Example

See [examples/langchain-javascript/](examples/langchain-javascript/) for a full working example with:
- EmailTool with receipts
- CalendarTool with receipts
- DatabaseTool with error handling
- Express app setup
- Test endpoints

**Run it:**
```bash
cd examples/langchain-javascript
npm install
echo "OPENAI_API_KEY=your-key" > .env
npm start
```

## Testing Your Integration

1. **Start your agent:**
```bash
python main.py  # or node server.js
```

2. **Manual test:**
```bash
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Send an email to test@example.com"}'
```

3. **Run F.A.I.L. Kit audit:**
```bash
fail-audit run --endpoint http://localhost:8000/eval/run
```

## Advanced Features

### Custom Metadata

Add tool-specific metadata to receipts:

```python
def _execute(self, to: str, subject: str):
    result = send_email(to, subject)
    return {
        "status": "sent",
        "message_id": result.id,
        "metadata": {
            "smtp_server": "smtp.gmail.com",
            "priority": "high",
            "tls_version": "1.3"
        }
    }
```

### Custom Receipt Extraction

Override default extraction logic:

```python
def custom_handler(executor, prompt, context):
    result = await executor.ainvoke({"input": prompt})
    # Custom receipt extraction logic
    receipts = extract_my_custom_receipts(result)
    return format_response(result, receipts)

app.include_router(
    create_fail_kit_endpoint(executor, custom_handler=custom_handler),
    prefix="/eval"
)
```

### Multi-Agent Systems

Route to different specialized agents:

```python
agents = {
    "researcher": research_agent,
    "writer": writer_agent,
    "reviewer": reviewer_agent
}

app.include_router(
    create_fail_kit_multi_agent_endpoint(agents),
    prefix="/eval"
)
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| No receipts in response | Ensure tools extend `ReceiptGeneratingTool` and `return_intermediate_steps=True` |
| Schema validation failed | Return structured dict: `{"result": "done"}` not raw strings |
| Import error | Run `pip install -e .` or `npm install && npm run build` |
| Tool failures not escalated | The adapter automatically escalates failures - check your policy settings |

## API Reference

### Python

#### `create_fail_kit_endpoint(agent_executor, config=None)`
Create FastAPI router with `/run` endpoint.

#### `ReceiptGeneratingTool`
Base class for tools with automatic receipt generation.
- `_execute(*args, **kwargs)` - Override with your tool logic
- `get_receipts()` - Get all receipts
- `clear_receipts()` - Clear receipt history

#### `extract_receipts_from_agent_executor(executor, result, config=None)`
Extract receipts from AgentExecutor intermediate steps.

#### `wrap_tool_with_receipts(tool)`
Wrap legacy LangChain tool to generate receipts.

#### `create_fail_kit_langgraph_endpoint(graph, config=None)`
Create endpoint for LangGraph agents.

### JavaScript/TypeScript

#### `createFailKitRouter(agentExecutor, config?)`
Create Express router with `/run` endpoint.

#### `ReceiptGeneratingTool`
Base class for tools with automatic receipt generation.
- `_execute(input)` - Override with your tool logic
- `getReceipts()` - Get all receipts
- `clearReceipts()` - Clear receipt history

#### `extractReceiptsFromAgentExecutor(executor, result, config?)`
Extract receipts from AgentExecutor intermediate steps.

#### `wrapToolWithReceipts(tool)`
Wrap legacy LangChain tool to generate receipts.

#### `createSimpleFailKitRouter(agentFunction)`
Simple wrapper for agents without action tracking.

## Testing

Both adapters include comprehensive test suites:

```bash
# Python
cd middleware/langchain/python
pytest

# JavaScript
cd middleware/langchain/javascript
npm test
```

## Configuration

### Python

```python
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

### JavaScript

```typescript
const config: FailKitConfig = {
  autoReceipts: true,
  includeMetadata: true,
  trackLatency: true,
  hashAlgorithm: 'sha256'
};

app.use('/eval', createFailKitRouter(agentExecutor, config));
```

## Migration Guide

### From Manual Integration

**Before:**
```python
@app.post("/eval/run")
async def evaluate(request: dict):
    result = await agent.ainvoke({"input": request["prompt"]})
    receipts = []
    for step in result["intermediate_steps"]:
        receipts.append({
            "timestamp": datetime.now().isoformat(),
            "tool": step[0].tool,
            # ... manual receipt construction
        })
    return {"response": result["output"], "actions": receipts}
```

**After:**
```python
app.include_router(
    create_fail_kit_endpoint(agent_executor),
    prefix="/eval"
)
```

### From Bare LangChain Tools

**Before:**
```python
class EmailTool(BaseTool):
    def _run(self, to: str):
        send_email(to)
        return "Email sent"
```

**After:**
```python
class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email"
    
    def _execute(self, to: str):
        send_email(to)
        return {"status": "sent"}
```

## Performance & Security

### Performance Tips
- Use connection pooling in tools
- Implement async tools for I/O operations
- Cache expensive operations

### Security Considerations
- Don't log sensitive data in receipts (hashes protect raw values)
- Validate inputs before execution
- Add rate limiting to tools

## Support & Contributing

- **Issues:** [GitHub Issues](https://github.com/yourusername/The-FAIL-Kit/issues)
- **Documentation:** [docs/LANGCHAIN_INTEGRATION.md](docs/LANGCHAIN_INTEGRATION.md)
- **Examples:** [examples/](examples/)

## License

See [LICENSE.txt](LICENSE.txt)

---

**No trace, no ship.**
