# F.A.I.L. Kit Integration - The Easy Way

You asked for an easier way to integrate the F.A.I.L. Kit. You were right. Requiring a custom evaluation server is too much friction.

Here are the new, one-liner integration methods for popular frameworks. No more separate servers. Just drop it in and run the audit.

---

## Next.js

For Next.js apps, use the `@fail-kit/middleware-nextjs` package.

### Installation

```bash
npm install @fail-kit/middleware-nextjs
```

### Usage

Create a new API route at `app/api/eval/run/route.ts`:

```typescript
// app/api/eval/run/route.ts

import { failAuditRoute } from "@fail-kit/middleware-nextjs";
import { yourAgent } from "@/lib/your-agent"; // Your existing agent logic

export const POST = failAuditRoute(async (prompt, context) => {
  // 1. Call your agent
  const result = await yourAgent.process(prompt);

  // 2. Return the response, actions, and receipts
  return {
    response: result.text,
    actions: result.actions,
    receipts: result.receipts,
  };
});
```

That's it. The `failAuditRoute` helper handles everything else:
- Creates the `/eval/run` endpoint
- Parses the request
- Calls your agent logic
- Validates the response format
- Auto-generates receipts if you don't provide them

### Simple Integration (No Actions)

If your agent just returns text, use `failAuditSimple`:

```typescript
// app/api/eval/run/route.ts

import { failAuditSimple } from "@fail-kit/middleware-nextjs";
import { yourAgent } from "@/lib/your-agent";

export const POST = failAuditSimple(yourAgent.process);
```

This automatically wraps your agent's string response in the required format.

---

## Express

For Express apps, use the `@fail-kit/middleware-express` package.

### Installation

```bash
npm install @fail-kit/middleware-express
```

### Usage

Add the middleware to your `app.js` or `server.js`:

```javascript
const express = require("express");
const { failAuditMiddleware } = require("@fail-kit/middleware-express");
const { yourAgent } = require("./lib/your-agent");

const app = express();

app.use(
  "/eval",
  failAuditMiddleware({
    handler: async (prompt, context) => {
      const result = await yourAgent.process(prompt);
      return {
        response: result.text,
        actions: result.actions,
        receipts: result.receipts,
      };
    },
  })
);

app.listen(8000);
```

This adds the `/eval/run` endpoint to your existing server.

### Simple Integration (No Actions)

```javascript
const { failAuditSimple } = require("@fail-kit/middleware-express");

app.use("/eval", failAuditSimple(yourAgent.process));
```

---

## FastAPI (Python)

For FastAPI apps, use the `fail-kit` PyPI package.

### Installation

```bash
pip install fail-kit
```

### Usage

Use the `fail_audit` decorator on your agent function:

```python
from fastapi import FastAPI
from fail_kit import fail_audit
from your_agent import your_agent_function

app = FastAPI()

@app.post("/eval/run")
@fail_audit(auto_receipts=True)
async def evaluate(prompt: str, context: dict):
    """This function is now wrapped for F.A.I.L. Kit evaluation."""
    result = await your_agent_function(prompt, context)
    return {
        "response": result["text"],
        "actions": result["actions"],
        "receipts": result["receipts"],
    }
```

The decorator handles the request parsing and response formatting.

### Simple Integration (No Actions)

```python
from fail_kit import fail_audit_simple

@app.post("/eval/run")
@fail_audit_simple
async def evaluate(prompt: str, context: dict):
    return await your_agent_function(prompt, context)
```

---

## How It Works

These middleware packages do three things:

1.  **Create the Endpoint**: They add the required `POST /eval/run` endpoint to your existing app.
2.  **Standardize I/O**: They handle the request and response formats, so you just need to provide your agent logic.
3.  **Auto-Generate Receipts**: If your agent returns actions but no receipts, the middleware will automatically generate basic receipts for you. This is enough to pass the initial audit, but you should add proper proof generation for real-world use.

## Next Steps

1.  **Publish the Middleware**: These middleware packages need to be published to npm and PyPI.
    - `@fail-kit/middleware-nextjs`
    - `@fail-kit/middleware-express`
    - `fail-kit` (Python)

2.  **Update the CLI**: The `fail-audit init` command should ask which framework the user has and provide the correct installation instructions.

3.  **Update the Documentation**: The main README should point to these new, easier integration methods.

This is how you get adoption. Make it so easy to use that developers have no excuse not to.
