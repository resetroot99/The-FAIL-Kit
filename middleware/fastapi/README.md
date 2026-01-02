# F.A.I.L. Kit - FastAPI Middleware

[![PyPI version](https://badge.fury.io/py/fail-kit.svg)](https://badge.fury.io/py/fail-kit)

Zero-config FastAPI middleware for AI agent auditing.

## Installation

```bash
pip install fail-kit
```

## Quick Start

```python
from fastapi import FastAPI
from fail_kit import fail_audit

app = FastAPI()

@app.post("/eval/run")
@fail_audit(auto_receipts=True)
async def evaluate(prompt: str, context: dict):
    # Your agent logic here
    result = await your_agent(prompt)
    return {
        "response": result["text"],
        "actions": result["actions"],
        "receipts": result["receipts"]
    }
```

Then run the audit:

```bash
pip install fail-kit-cli  # Or: npm install -g @fail-kit/cli
fail-audit scan
fail-audit run --format html
```

## Usage

### With Actions and Receipts

```python
from fail_kit import fail_audit, FailAuditAction
from datetime import datetime

@app.post("/eval/run")
@fail_audit(auto_receipts=True)
async def evaluate(prompt: str, context: dict):
    # Create an action
    action = FailAuditAction(
        tool="database_query",
        input=prompt,
        output="Query result",
        status="success",
        latency_ms=45
    )
    
    return {
        "response": "Here's what I found...",
        "actions": [action.to_dict()],
    }
    # Receipts are auto-generated!
```

### Simple Text Response

```python
from fail_kit import fail_audit_simple

@app.post("/eval/run")
@fail_audit_simple
async def evaluate(prompt: str, context: dict):
    return f"Answer to: {prompt}"
```

### With Escalation

```python
from fail_kit import fail_audit

@app.post("/eval/run")
@fail_audit(auto_receipts=True)
async def evaluate(prompt: str, context: dict):
    if "delete" in prompt.lower():
        return {
            "response": "This requires human approval.",
            "actions": [],
            "policy": {
                "escalate": True,
                "reasons": ["high-stakes operation"]
            }
        }
    
    return {"response": "Done!", "actions": []}
```

## API Reference

### `@fail_audit(auto_receipts=True, action_logger=None)`

Decorator for agent endpoints.

- `auto_receipts`: Automatically generate receipts from actions
- `action_logger`: Optional async function to log actions

### `@fail_audit_simple`

Simple decorator for text-only agents.

### `FailAuditAction`

Helper class for creating actions:

```python
action = FailAuditAction(
    tool="tool_name",
    input="input data",
    output="output data",
    status="success",  # or "failed"
    latency_ms=100
)
```

### `FailAuditReceipt`

Helper class for creating receipts:

```python
receipt = FailAuditReceipt(
    tool="tool_name",
    status="success",
    proof="Proof of execution"
)
```

## Links

- [Documentation](https://github.com/resetroot99/The-FAIL-Kit)
- [Easy Integration Guide](https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/EASY_INTEGRATION.md)
- [CLI Package](https://www.npmjs.com/package/@fail-kit/cli)
- [Examples](https://github.com/resetroot99/The-FAIL-Kit/tree/main/examples/fastapi-example)

## License

MIT
