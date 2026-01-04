# fail-kit

> **v1.6.0** - LangChain adapter for F.A.I.L. Kit (Python)

Drop-in adapter for integrating LangChain agents with the F.A.I.L. Kit audit framework. Automatically generates receipts, enforces compliance, and provides resilience utilities.

## Installation

```bash
pip install fail-kit
```

With FastAPI support:
```bash
pip install fail-kit[fastapi]
```

With LangGraph support:
```bash
pip install fail-kit[langgraph]
```

All extras:
```bash
pip install fail-kit[all]
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
- 🆕 **v1.6.0**: Compliance framework mappings (SOC2, PCI-DSS, HIPAA, GDPR)
- 🆕 **v1.6.0**: Resilience utilities (retry, timeout)
- 🆕 **v1.6.0**: Evidence generation for audits
- 🆕 **v1.6.0**: Secret detection

---

## v1.6.0 New Features

### Resilience Utilities

Add retry logic with exponential backoff to LLM calls:

```python
from fail_kit_langchain import with_retry, RetryConfig, with_timeout

# Retry with exponential backoff
result = await with_retry(
    lambda: llm.ainvoke(prompt),
    RetryConfig(max_retries=3, base_delay=1.0)
)

# Add timeout to async functions
@with_timeout(30.0)
async def call_llm(prompt: str):
    return await llm.ainvoke(prompt)
```

### Compliance Mappings

Check which compliance frameworks apply to each rule:

```python
from fail_kit_langchain import COMPLIANCE_MAPPINGS, get_compliance_badges

# Get compliance badges for a rule
badges = get_compliance_badges("FK001")  # ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR']

# Get specific controls
controls = COMPLIANCE_MAPPINGS["FK001"]["soc2"]  # ['CC6.1', 'CC7.2', 'CC7.3']
```

### Evidence Generation

Generate signed evidence packages for audit exports:

```python
from fail_kit_langchain import generate_evidence_package

# Collect receipts from your agent
receipts = tool.get_receipts()

# Generate signed evidence package
evidence = generate_evidence_package(
    receipts,
    git_hash="abc123",
    git_branch="main"
)

# Export as JSON
print(evidence.to_json())

# Export as CSV
print(evidence.to_csv())
```

### Secret Detection

Scan code or prompts for exposed secrets:

```python
from fail_kit_langchain import detect_secrets

findings = detect_secrets(user_input)
if findings:
    for secret in findings:
        print(f"⚠️ Found {secret['type']}: {secret['masked']}")
```

---

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

### `with_retry(func, config=None, on_retry=None)` 🆕

Execute async function with retry logic.

### `with_timeout(timeout_seconds)` 🆕

Decorator to add timeout to async functions.

### `generate_evidence_package(receipts, git_hash, git_branch)` 🆕

Generate signed evidence package for audit.

### `detect_secrets(text)` 🆕

Detect exposed secrets in text.

---

## Examples

See [examples/langchain-python/](../../../examples/langchain-python/) for a complete working example.

## Testing

```bash
pytest
```

## Related

- [@fail-kit/core](https://www.npmjs.com/package/@fail-kit/core) - Core receipt generation library (npm)
- [F.A.I.L. Kit CLI](https://github.com/resetroot99/The-FAIL-Kit) - Command-line audit tool
- [F.A.I.L. Kit VS Code Extension](https://marketplace.visualstudio.com/items?itemName=AliJakvani.fail-kit-vscode) - IDE integration

## License

MIT License - See [LICENSE](../../../LICENSE.txt)
