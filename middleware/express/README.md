# @fail-kit/middleware-express

> F.A.I.L. Kit middleware for Express - Add forensic audit endpoint in 5 lines

## Installation

```bash
npm install @fail-kit/middleware-express
```

## Usage

```javascript
const express = require("express");
const { failAuditMiddleware } = require("@fail-kit/middleware-express");

const app = express();

app.use("/eval", failAuditMiddleware({
  handler: async (prompt, context) => {
    // Your agent logic here
    const result = await yourAgent.process(prompt);
    return {
      response: result.text,
      actions: result.actions,
      receipts: result.receipts
    };
  }
}));

app.listen(8000);
```

## Simple Integration

For agents that just return text:

```javascript
const { failAuditSimple } = require("@fail-kit/middleware-express");

app.use("/eval", failAuditSimple(yourAgent.process));
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `handler` | Function | required | Async function that processes prompts |
| `autoReceipts` | boolean | `true` | Auto-generate receipts from actions |
| `actionLogger` | Function | - | Optional callback to log actions |

## Run the Audit

```bash
npm install -g @fail-kit/cli
fail-audit init
fail-audit run
```

---

**No trace, no ship.**
