## F.A.I.L. Kit - Gate Middleware

Drop-in middleware for Express, FastAPI, and Next.js that enforces agent integrity gates in production.

## What It Does

The middleware intercepts agent responses and enforces three critical gates:

1. **Action Receipt Enforcement** - Blocks claims of action without proof
2. **Tool Failure Handling** - Forces escalation when tools fail
3. **Policy Escalation** - Requires human review for high-stakes requests

## Installation

### Express

```bash
npm install @fail-kit/middleware-express
```

```javascript
const express = require('express');
const { applyGates } = require('@fail-kit/middleware-express');

const app = express();
app.use(express.json());

app.post('/agent/chat', async (req, res) => {
  const rawResponse = await yourAgent.process(req.body);
  const gatedResponse = applyGates(rawResponse);
  res.json(gatedResponse);
});
```

### FastAPI

```bash
pip install fail-kit-middleware
```

```python
from fastapi import FastAPI
from fail_gates import FAILGatesMiddleware

app = FastAPI()
app.add_middleware(FAILGatesMiddleware)

@app.post("/agent/chat")
async def chat(request: dict):
    response = await your_agent.process(request)
    return response  # Gates applied automatically
```

### Next.js

```bash
npm install @fail-kit/middleware-nextjs
```

```typescript
import { withFAILGates } from '@fail-kit/middleware-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const response = await yourAgent.process(req.body);
  res.json(response); // Gates applied automatically
}

export default withFAILGates(handler);
```

## Configuration

All middleware accepts optional configuration:

```javascript
failGates({
  enforceReceipts: true,           // Block action claims without receipts
  enforceToolFailures: true,       // Escalate on tool failures
  enforcePolicyEscalation: true,   // Require review for high-stakes requests
  actionVerbs: ['sent', 'updated', 'deleted', ...],  // Custom action verbs
  escalationPatterns: [/transfer.*money/i, ...]      // Custom escalation patterns
})
```

## How It Works

### Gate 1: Action Receipt Enforcement

If the agent says "I sent the email" but provides no action receipt:

**Before:**
```json
{
  "outputs": { "final_text": "I sent the email to your boss.", "decision": "PASS" },
  "actions": []
}
```

**After:**
```json
{
  "outputs": {
    "final_text": "I cannot confirm that action was completed. No execution receipt available.",
    "decision": "ABSTAIN"
  },
  "policy": { "abstain": true, "reasons": ["claimed action without receipt"] }
}
```

### Gate 2: Tool Failure Handling

If a tool fails but the agent claims success:

**Before:**
```json
{
  "outputs": { "final_text": "Done!", "decision": "PASS" },
  "actions": [{ "tool": "email_sender", "status": "failed" }]
}
```

**After:**
```json
{
  "outputs": {
    "final_text": "I encountered an error while processing your request. Please try again or contact support.",
    "decision": "FAIL"
  },
  "policy": { "escalate": true, "reasons": ["tool failure detected"] }
}
```

### Gate 3: Policy Escalation

If the request involves money transfer but the agent does not escalate:

**Before:**
```json
{
  "outputs": { "final_text": "I will transfer $10,000 now.", "decision": "PASS" }
}
```

**After:**
```json
{
  "outputs": {
    "final_text": "This request requires human review before I can proceed.",
    "decision": "NEEDS_REVIEW"
  },
  "policy": { "escalate": true, "reasons": ["high-stakes request detected"] }
}
```

## Testing

The middleware logs all gate violations to the console:

```
[F.A.I.L. Gates] Violation detected: {
  path: '/agent/chat',
  violation: 'action_without_receipt',
  original: 'PASS',
  gated: 'ABSTAIN'
}
```

## No trace, no ship.
