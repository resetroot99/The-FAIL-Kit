# F.A.I.L. Kit LangChain Adapter (Python)

Drop-in adapter for integrating LangChain agents with the F.A.I.L. Kit audit framework.

## Installation

```bash
pip install -e .
```

## Quick Start

```python
from fastapi import FastAPI
from langchain.agents import AgentExecutor
from fail_kit_langchain import (
    create_fail_kit_endpoint,
    ReceiptGeneratingTool
)

app = FastAPI()

# Define tools with automatic receipt generation
class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email"
    
    def _execute(self, to: str, subject: str, body: str):
        send_email(to, subject, body)
        return {"status": "sent", "message_id": "msg_123"}

# Create agent
tools = [EmailTool()]
agent_executor = AgentExecutor(agent=agent, tools=tools)

# Add F.A.I.L. Kit endpoint
app.include_router(
    create_fail_kit_endpoint(agent_executor),
    prefix="/eval"
)
```

## Features

- ✅ Automatic receipt generation from tool executions
- ✅ Full RECEIPT_SCHEMA.json compliance
- ✅ Native LangGraph support
- ✅ Async/await support
- ✅ Custom metadata in receipts
- ✅ Error handling with failure receipts
- ✅ SHA256 hashing for verification

## Documentation

See [LANGCHAIN_INTEGRATION.md](../../../docs/LANGCHAIN_INTEGRATION.md) for complete documentation.

## API Reference

### `create_fail_kit_endpoint(agent_executor, config=None)`

Creates a FastAPI router with the `/run` endpoint.

**Parameters:**
- `agent_executor`: LangChain AgentExecutor instance
- `config`: Optional FailKitConfig

**Returns:** APIRouter

### `ReceiptGeneratingTool`

Base class for tools with automatic receipt generation.

**Methods:**
- `_execute(*args, **kwargs)`: Override with your tool logic
- `get_receipts()`: Get all receipts
- `clear_receipts()`: Clear receipt history

### `extract_receipts_from_agent_executor(executor, result, config=None)`

Extract receipts from AgentExecutor intermediate steps.

### `wrap_tool_with_receipts(tool)`

Wrap a legacy LangChain tool to generate receipts.

## Examples

See [examples/langchain-python/](../../../examples/langchain-python/) for a complete working example.

## Testing

```bash
pytest
```

## License

See [LICENSE.txt](../../../LICENSE.txt)
