# F.A.I.L. Kit Integration - The Easy Way

[![npm version](https://img.shields.io/npm/v/@fail-kit/cli.svg)](https://www.npmjs.com/package/@fail-kit/cli)

Zero-config integration for popular frameworks. No separate servers. Just drop it in and run the audit.

---

## Table of Contents

- [Quick Start (2 minutes)](#quick-start-2-minutes)
- [Next.js Integration](#nextjs-integration)
- [Express Integration](#express-integration)
- [FastAPI Integration](#fastapi-integration)
- [Running Your First Audit](#running-your-first-audit)
- [Understanding Results](#understanding-results)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (2 minutes)

### Step 1: Install the CLI

```bash
npm install -g @fail-kit/cli
```

### Step 2: Install Middleware for Your Framework

```bash
# Next.js
npm install @fail-kit/middleware-nextjs

# Express
npm install @fail-kit/middleware-express

# FastAPI (Python)
pip install fail-kit
```

### Step 3: Add the Endpoint (5 lines of code)

See framework-specific sections below.

### Step 4: Run the Audit

```bash
# Initialize config
fail-audit init

# Auto-generate test cases
fail-audit scan

# Run the audit
fail-audit run --format html
```

---

## Next.js Integration

### Installation

```bash
npm install @fail-kit/middleware-nextjs
```

### Complete Example

Create `app/api/eval/run/route.ts`:

```typescript
// app/api/eval/run/route.ts
import { failAuditRoute } from "@fail-kit/middleware-nextjs";

// Your agent logic (replace with your actual agent)
async function myAgent(prompt: string) {
  // This is where your LLM/agent logic goes
  const response = `Processed: ${prompt}`;
  
  // If your agent takes actions, return them here
  const actions = [
    {
      action_id: `act_${Date.now()}`,
      tool_name: "text_processor",
      timestamp: new Date().toISOString(),
      status: "success",
      latency_ms: 50
    }
  ];
  
  return { text: response, actions };
}

export const POST = failAuditRoute(async (prompt, context) => {
  const result = await myAgent(prompt);
  
  return {
    response: result.text,
    actions: result.actions,
    // Receipts are auto-generated if not provided
  };
});
```

### Simple Agent (Text Only)

If your agent just returns text with no actions:

```typescript
// app/api/eval/run/route.ts
import { failAuditSimple } from "@fail-kit/middleware-nextjs";

async function mySimpleAgent(prompt: string): Promise<string> {
  return `Answer to: ${prompt}`;
}

export const POST = failAuditSimple(mySimpleAgent);
```

### With OpenAI

```typescript
// app/api/eval/run/route.ts
import { failAuditRoute } from "@fail-kit/middleware-nextjs";
import OpenAI from "openai";

const openai = new OpenAI();

export const POST = failAuditRoute(async (prompt, context) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  
  return {
    response: completion.choices[0].message.content || "",
    actions: [], // Add actions if your agent uses tools
  };
});
```

---

## Express Integration

### Installation

```bash
npm install @fail-kit/middleware-express
```

### Complete Example

```javascript
// server.js
const express = require("express");
const { failAuditMiddleware } = require("@fail-kit/middleware-express");

const app = express();
app.use(express.json());

// Your agent logic
async function myAgent(prompt) {
  const response = `Processed: ${prompt}`;
  const actions = [
    {
      action_id: `act_${Date.now()}`,
      tool_name: "text_processor",
      timestamp: new Date().toISOString(),
      status: "success",
      latency_ms: 50
    }
  ];
  return { text: response, actions };
}

// Add the F.A.I.L. Kit endpoint
app.use("/eval", failAuditMiddleware({
  handler: async (prompt, context) => {
    const result = await myAgent(prompt);
    return {
      response: result.text,
      actions: result.actions,
    };
  }
}));

// Your other routes
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(8000, () => {
  console.log("Server running on http://localhost:8000");
  console.log("F.A.I.L. Kit endpoint: http://localhost:8000/eval/run");
});
```

### Simple Agent (Text Only)

```javascript
const { failAuditSimple } = require("@fail-kit/middleware-express");

async function mySimpleAgent(prompt) {
  return `Answer to: ${prompt}`;
}

app.use("/eval", failAuditSimple(mySimpleAgent));
```

### With LangChain

```javascript
const { failAuditMiddleware } = require("@fail-kit/middleware-express");
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage } = require("@langchain/core/messages");

const model = new ChatOpenAI({ modelName: "gpt-4" });

app.use("/eval", failAuditMiddleware({
  handler: async (prompt, context) => {
    const result = await model.invoke([new HumanMessage(prompt)]);
    return {
      response: result.content,
      actions: [],
    };
  }
}));
```

---

## FastAPI Integration

### Installation

```bash
pip install fail-kit
```

### Complete Example

```python
# main.py
from fastapi import FastAPI
from fail_kit import fail_audit
from datetime import datetime

app = FastAPI()

# Your agent logic
async def my_agent(prompt: str) -> dict:
    response = f"Processed: {prompt}"
    actions = [
        {
            "action_id": f"act_{int(datetime.now().timestamp())}",
            "tool_name": "text_processor",
            "timestamp": datetime.now().isoformat(),
            "status": "success",
            "latency_ms": 50
        }
    ]
    return {"text": response, "actions": actions}

@app.post("/eval/run")
@fail_audit(auto_receipts=True)
async def evaluate(request: dict):
    prompt = request.get("inputs", {}).get("user", "")
    result = await my_agent(prompt)
    return {
        "response": result["text"],
        "actions": result["actions"],
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
```

### Simple Agent (Text Only)

```python
from fail_kit import fail_audit_simple

@app.post("/eval/run")
@fail_audit_simple
async def evaluate(prompt: str, context: dict):
    return f"Answer to: {prompt}"
```

### With LangChain

```python
from fail_kit import fail_audit
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

model = ChatOpenAI(model="gpt-4")

@app.post("/eval/run")
@fail_audit(auto_receipts=True)
async def evaluate(request: dict):
    prompt = request.get("inputs", {}).get("user", "")
    result = await model.ainvoke([HumanMessage(content=prompt)])
    return {
        "response": result.content,
        "actions": [],
    }
```

---

## Running Your First Audit

### 1. Start Your Server

```bash
# Express
node server.js

# Next.js
npm run dev

# FastAPI
uvicorn main:app --reload
```

### 2. Initialize F.A.I.L. Kit

```bash
# Interactive setup
fail-audit init

# Or with flags
fail-audit init --framework express --install
```

### 3. Auto-Generate Test Cases

```bash
# Scan your codebase and generate test cases
fail-audit scan

# Preview what would be generated (no files written)
fail-audit scan --dry-run
```

### 4. Run the Audit

```bash
# Run all test cases
fail-audit run

# Generate HTML report
fail-audit run --format html

# Run in CI mode (exit code 1 on failures)
fail-audit run --ci
```

### 5. View Results

```bash
# Open the HTML report
open audit-results/audit-*.html
```

---

## Understanding Results

### Pass

```
✓ AUTO_RECEIPT_HTTP_REQUEST_001... PASS (245ms)
```

Your agent correctly returned a receipt for the action.

### Fail

```
✗ AUTO_ERROR_DATABASE_QUERY_001... FAIL (312ms)
  Reason: Expected policy.escalate=true, got false
```

The test expected the agent to escalate (ask for human review) when the database query failed, but it didn't.

### Common Failure Types

| Failure | What It Means | How to Fix |
|---------|---------------|------------|
| Missing receipts | Agent claimed action but didn't provide proof | Add receipt generation to your agent |
| Policy mismatch | Agent didn't escalate when it should have | Add escalation logic for high-stakes actions |
| Schema validation | Response format is incorrect | Check your response structure |
| Forbidden claims | Agent claimed to do something it shouldn't | Review your agent's response generation |

---

## Troubleshooting

### "Cannot connect to endpoint"

```
✗ Could not reach endpoint: http://localhost:8000/eval/run
```

**Fix:** Make sure your server is running and the endpoint exists.

```bash
# Test the endpoint manually
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"user": "Hello"}}'
```

### "No test cases found"

```
✗ No test cases found in: ./cases
```

**Fix:** Run `fail-audit scan` to auto-generate test cases.

```bash
fail-audit scan
```

### "Module not found: @fail-kit/middleware-*"

**Fix:** Install the middleware package.

```bash
npm install @fail-kit/middleware-express
# or
npm install @fail-kit/middleware-nextjs
```

### "All tests failing"

Check that your agent returns the correct response format:

```json
{
  "outputs": {
    "final_text": "Your response here",
    "decision": "PASS"
  },
  "actions": [
    {
      "action_id": "act_123",
      "tool_name": "your_tool",
      "status": "success"
    }
  ]
}
```

The middleware handles this format automatically - make sure your handler returns `response` and `actions`.

### "Tests pass locally but fail in CI"

Make sure your CI environment:
1. Has the agent server running
2. Can reach the endpoint (network connectivity)
3. Has the correct environment variables

```yaml
# GitHub Actions example
- name: Start server
  run: npm start &
  
- name: Wait for server
  run: sleep 5
  
- name: Run audit
  run: fail-audit run --ci
```

---

## What's Next?

- **[CI/CD Integration](CI_CD_GUIDE.md)** - Run audits on every push
- **[Custom Test Cases](../CUSTOM_CASES.md)** - Create tests for your specific tools
- **[Failure Modes](../FAILURE_MODES.md)** - Understand what the tests catch
- **[Examples](../examples/)** - Complete working examples

---

## Getting Help

- **Documentation:** [README](../README.md)
- **Issues:** [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)
- **Email:** [ali@jakvan.io](mailto:ali@jakvan.io)

---

*Zero-config. Zero manual tests. Maximum coverage.*
