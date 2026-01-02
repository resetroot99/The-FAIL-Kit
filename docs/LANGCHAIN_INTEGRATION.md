# LangChain Integration Guide

Complete guide for integrating LangChain agents (Python and JavaScript) with the F.A.I.L. Kit audit framework.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
  - [Python (LangChain + FastAPI)](#python-langchain--fastapi)
  - [JavaScript (LangChain.js + Express)](#javascript-langchainjs--express)
- [Core Concepts](#core-concepts)
- [Receipt-Generating Tools](#receipt-generating-tools)
- [Advanced Patterns](#advanced-patterns)
- [LangGraph Support](#langgraph-support)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

The F.A.I.L. Kit LangChain adapter provides:

- **Automatic receipt generation** from tool executions
- **Drop-in middleware** for FastAPI (Python) and Express (JS/TS)
- **Full schema compliance** with RECEIPT_SCHEMA.json
- **Zero-friction integration** with existing LangChain agents
- **Native LangGraph support** for complex workflows

### Why Use This Adapter?

Without the adapter, you need to manually:
1. Instrument every tool to generate receipts
2. Extract intermediate steps from agent execution
3. Format responses to match F.A.I.L. Kit schema
4. Hash inputs/outputs for verification

The adapter does all this automatically.

---

## Quick Start

### Python (LangChain + FastAPI)

**1. Install the adapter:**

```bash
cd middleware/langchain/python
pip install -e .
```

**2. Create a tool with automatic receipts:**

```python
from fail_kit_langchain import ReceiptGeneratingTool

class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email"
    
    def _execute(self, to: str, subject: str, body: str):
        # Your email logic here
        send_email(to, subject, body)
        return {"status": "sent", "message_id": "msg_123"}
```

**3. Add the F.A.I.L. Kit endpoint:**

```python
from fastapi import FastAPI
from langchain.agents import AgentExecutor
from fail_kit_langchain import create_fail_kit_endpoint

app = FastAPI()

# Your existing agent
agent_executor = AgentExecutor(agent=agent, tools=tools)

# Add F.A.I.L. Kit endpoint
app.include_router(
    create_fail_kit_endpoint(agent_executor),
    prefix="/eval"
)
```

**4. Run the audit:**

```bash
python your_agent.py  # Start agent
fail-audit run --endpoint http://localhost:8000/eval/run
```

### JavaScript (LangChain.js + Express)

**1. Install the adapter:**

```bash
cd middleware/langchain/javascript
npm install
```

**2. Create a tool with automatic receipts:**

```typescript
import { ReceiptGeneratingTool } from '@fail-kit/langchain-adapter';

class EmailTool extends ReceiptGeneratingTool {
  name = 'email_sender';
  description = 'Send an email';
  
  async _execute(input: { to: string; subject: string; body: string }) {
    // Your email logic here
    await sendEmail(input.to, input.subject, input.body);
    return { status: 'sent', message_id: 'msg_123' };
  }
}
```

**3. Add the F.A.I.L. Kit endpoint:**

```typescript
import express from 'express';
import { AgentExecutor } from 'langchain/agents';
import { createFailKitRouter } from '@fail-kit/langchain-adapter';

const app = express();
app.use(express.json());

// Your existing agent
const agentExecutor = new AgentExecutor({ agent, tools });

// Add F.A.I.L. Kit endpoint
app.use('/eval', createFailKitRouter(agentExecutor));

app.listen(8000);
```

**4. Run the audit:**

```bash
node your-agent.js  # Start agent
fail-audit run --endpoint http://localhost:8000/eval/run
```

---

## Core Concepts

### 1. Receipt-Generating Tools

The core abstraction is `ReceiptGeneratingTool`. Instead of implementing `_run()` (Python) or `_call()` (JS), you implement `_execute()`:

**Python:**
```python
class MyTool(ReceiptGeneratingTool):
    def _execute(self, arg1, arg2):
        # Your logic
        return {"result": "done"}
```

**JavaScript:**
```typescript
class MyTool extends ReceiptGeneratingTool {
  async _execute(input) {
    // Your logic
    return { result: 'done' };
  }
}
```

The base class automatically:
- Generates a unique `action_id`
- Records `timestamp` in ISO-8601 format
- Hashes `input` and `output` for verification
- Tracks `latency_ms`
- Handles errors and sets `status` to `"failed"`

### 2. Receipt Schema

Every action generates a receipt compliant with RECEIPT_SCHEMA.json:

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
    "custom_field": "custom_value"
  }
}
```

**Required fields:**
- `action_id` - Unique identifier
- `tool_name` - Name of the tool
- `timestamp` - ISO-8601 timestamp
- `status` - `"success"` or `"failed"`
- `input_hash` - SHA256 hash of input
- `output_hash` - SHA256 hash of output

**Optional fields:**
- `latency_ms` - Execution time
- `error_message` - Error details if failed
- `metadata` - Custom fields

### 3. Response Format

The adapter formats responses to match F.A.I.L. Kit's expected schema:

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

---

## Receipt-Generating Tools

### Basic Tool

**Python:**
```python
class CalculatorTool(ReceiptGeneratingTool):
    name = "calculator"
    description = "Perform calculations"
    
    def _execute(self, expression: str):
        result = eval(expression)  # Don't actually do this in production!
        return {"result": result}
```

**JavaScript:**
```typescript
class CalculatorTool extends ReceiptGeneratingTool {
  name = 'calculator';
  description = 'Perform calculations';
  
  async _execute(input: { expression: string }) {
    const result = eval(input.expression);  // Don't actually do this in production!
    return { result };
  }
}
```

### Tool with Metadata

Add custom metadata to receipts:

**Python:**
```python
def _execute(self, to: str, subject: str):
    message_id = send_email(to, subject)
    return {
        "status": "sent",
        "message_id": message_id,
        "metadata": {
            "smtp_server": "smtp.gmail.com",
            "priority": "high",
            "tls_version": "1.3"
        }
    }
```

**JavaScript:**
```typescript
async _execute(input: { to: string; subject: string }) {
  const messageId = await sendEmail(input.to, input.subject);
  return {
    status: 'sent',
    message_id: messageId,
    metadata: {
      smtp_server: 'smtp.gmail.com',
      priority: 'high',
      tls_version: '1.3'
    }
  };
}
```

### Tool with Error Handling

Tools automatically generate failure receipts when exceptions occur:

**Python:**
```python
def _execute(self, account_id: str, amount: float):
    if amount > 10000:
        raise ValueError("Amount exceeds daily limit")
    
    # Process payment
    return {"status": "completed", "transaction_id": "txn_123"}
```

The adapter catches the exception and generates:
```json
{
  "action_id": "act_xyz",
  "tool_name": "payment_processor",
  "status": "failed",
  "error_message": "Amount exceeds daily limit",
  ...
}
```

### Wrapping Legacy Tools

Convert existing LangChain tools to generate receipts:

**Python:**
```python
from langchain.tools import Tool
from fail_kit_langchain import wrap_tool_with_receipts

# Your existing tool
legacy_tool = Tool(
    name="search",
    func=lambda q: search_api(q),
    description="Search the web"
)

# Wrap it
receipt_tool = wrap_tool_with_receipts(legacy_tool)
```

**JavaScript:**
```typescript
import { Tool } from '@langchain/core/tools';
import { wrapToolWithReceipts } from '@fail-kit/langchain-adapter';

// Your existing tool
const legacyTool = new Tool({
  name: 'search',
  func: (q) => searchApi(q),
  description: 'Search the web'
});

// Wrap it
const receiptTool = wrapToolWithReceipts(legacyTool);
```

---

## Advanced Patterns

### Pattern 1: Custom Receipt Extraction

Override the default receipt extraction logic:

**Python:**
```python
def custom_handler(executor, prompt, context):
    result = await executor.ainvoke({"input": prompt})
    
    # Custom receipt extraction
    receipts = []
    for step in result["intermediate_steps"]:
        # Your custom logic
        receipts.append({...})
    
    return {
        "outputs": {"final_text": result["output"], "decision": "PASS"},
        "actions": receipts,
        "policy": {...}
    }

app.include_router(
    create_fail_kit_endpoint(executor, custom_handler=custom_handler),
    prefix="/eval"
)
```

### Pattern 2: Multi-Agent Systems

Route requests to different agents:

**Python:**
```python
from fail_kit_langchain import create_fail_kit_multi_agent_endpoint

agents = {
    "researcher": research_agent_executor,
    "writer": writer_agent_executor,
    "reviewer": reviewer_agent_executor
}

app.include_router(
    create_fail_kit_multi_agent_endpoint(agents),
    prefix="/eval"
)
```

The router will select the appropriate agent based on the prompt.

### Pattern 3: Policy Enforcement

Add custom policy logic:

**Python:**
```python
def policy_checker(prompt: str, result: dict) -> dict:
    policy = {
        "refuse": False,
        "abstain": False,
        "escalate": False,
        "reasons": []
    }
    
    # Check for high-stakes requests
    if "transfer money" in prompt.lower():
        policy["escalate"] = True
        policy["reasons"].append("financial_transaction")
    
    # Check for failures
    if any(r["status"] == "failed" for r in result.get("actions", [])):
        policy["escalate"] = True
        policy["reasons"].append("tool_failure")
    
    result["policy"] = policy
    return result
```

---

## LangGraph Support

The adapter supports LangGraph for complex agent workflows:

**Python:**
```python
from langgraph.prebuilt import create_react_agent
from fail_kit_langchain import create_fail_kit_langgraph_endpoint

# Create LangGraph agent
graph = create_react_agent(llm, tools)

# Add F.A.I.L. Kit endpoint
app.include_router(
    create_fail_kit_langgraph_endpoint(graph),
    prefix="/eval"
)
```

LangGraph agents automatically extract tool calls from the graph state and generate receipts.

---

## Migration Guide

### From Bare LangChain

**Before:**
```python
from langchain.tools import Tool

class EmailTool(Tool):
    def _run(self, to: str, subject: str):
        send_email(to, subject)
        return "Email sent"
```

**After:**
```python
from fail_kit_langchain import ReceiptGeneratingTool

class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email"
    
    def _execute(self, to: str, subject: str):
        send_email(to, subject)
        return {"status": "sent"}
```

### From Manual Receipt Generation

**Before:**
```python
@app.post("/eval/run")
async def evaluate(request: dict):
    result = await agent.ainvoke({"input": request["prompt"]})
    
    # Manual receipt generation
    receipts = []
    for step in result["intermediate_steps"]:
        receipts.append({
            "timestamp": datetime.now().isoformat(),
            "tool": step[0].tool,
            "status": "success",
            # ... more fields
        })
    
    return {"response": result["output"], "actions": receipts}
```

**After:**
```python
from fail_kit_langchain import create_fail_kit_endpoint

app.include_router(
    create_fail_kit_endpoint(agent_executor),
    prefix="/eval"
)
```

---

## Troubleshooting

### No Receipts in Response

**Problem:** The `/eval/run` endpoint returns empty `actions` array.

**Solutions:**

1. Ensure tools extend `ReceiptGeneratingTool`:
```python
# ✅ Good
class MyTool(ReceiptGeneratingTool):
    def _execute(self, arg): ...

# ❌ Bad
class MyTool(BaseTool):
    def _run(self, arg): ...
```

2. Enable intermediate steps (Python):
```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    return_intermediate_steps=True  # ← Required
)
```

3. Check that tools are actually being called:
```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True  # ← See tool calls in logs
)
```

### Receipt Schema Validation Failed

**Problem:** Audit fails with "Invalid receipt format".

**Solution:** Ensure your tool returns structured data:

```python
# ✅ Good: returns dict
def _execute(self, arg):
    return {"status": "success", "result": "done"}

# ❌ Bad: returns raw string
def _execute(self, arg):
    return "done"
```

### Tool Failures Not Escalated

**Problem:** Tools fail but agent returns `decision: "PASS"`.

**Solution:** The adapter automatically escalates on tool failures. If not happening:

1. Check that errors are properly raised:
```python
def _execute(self, arg):
    if error_condition:
        raise ValueError("Clear error message")  # ← Will be caught and added to receipt
    return result
```

2. Verify policy in response:
```json
{
  "policy": {
    "escalate": true,
    "reasons": ["tool_failure"]
  }
}
```

### ImportError / Module Not Found

**Python:**
```bash
# Install in development mode
cd middleware/langchain/python
pip install -e .
```

**JavaScript:**
```bash
# Install dependencies
cd middleware/langchain/javascript
npm install
npm run build
```

### Type Errors (TypeScript)

Ensure peer dependencies are installed:
```bash
npm install express langchain @langchain/core @langchain/openai
```

---

## Performance Tips

### 1. Connection Pooling

Tools should reuse connections:

```python
# ✅ Good: connection pool
class EmailTool(ReceiptGeneratingTool):
    def __init__(self):
        super().__init__()
        self.smtp = SMTPConnectionPool()
    
    def _execute(self, to, subject):
        self.smtp.send(to, subject)

# ❌ Bad: new connection each time
def _execute(self, to, subject):
    smtp = SMTP('smtp.gmail.com')
    smtp.send(to, subject)
    smtp.close()
```

### 2. Async Tools

Use async for I/O-bound operations:

**Python:**
```python
async def _execute(self, url: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()
```

### 3. Caching

Cache expensive operations:

```python
from functools import lru_cache

class SearchTool(ReceiptGeneratingTool):
    @lru_cache(maxsize=100)
    def _cached_search(self, query: str):
        return search_api(query)
    
    def _execute(self, query: str):
        return self._cached_search(query)
```

---

## Security Considerations

### 1. Sensitive Data in Receipts

Don't log sensitive data in receipts:

```python
def _execute(self, api_key: str, data: dict):
    result = api_call(api_key, data)
    
    # ✅ Good: don't include sensitive data
    return {
        "status": "success",
        "metadata": {"data_size": len(data)}
    }
    
    # ❌ Bad: exposes API key
    return {
        "status": "success",
        "api_key": api_key
    }
```

The adapter automatically hashes inputs/outputs, so raw values aren't exposed in the receipt.

### 2. Rate Limiting

Add rate limiting to tools:

```python
from ratelimit import limits

class APITool(ReceiptGeneratingTool):
    @limits(calls=10, period=60)  # 10 calls per minute
    def _execute(self, query: str):
        return api_call(query)
```

### 3. Input Validation

Validate inputs before execution:

```python
def _execute(self, email: str, amount: float):
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        raise ValueError("Invalid email address")
    
    if amount <= 0 or amount > 10000:
        raise ValueError("Amount must be between 0 and 10000")
    
    return process_payment(email, amount)
```

---

## Next Steps

1. **Run the examples:**
   - [Python example](../../examples/langchain-python/)
   - [JavaScript example](../../examples/langchain-javascript/)

2. **Read the API documentation:**
   - [Python API](./API_REFERENCE_PYTHON.md)
   - [JavaScript API](./API_REFERENCE_JAVASCRIPT.md)

3. **Deploy to production:**
   - Add middleware gates
   - Set up CI/CD audits
   - Monitor receipt generation

**No trace, no ship.** 🛡️
