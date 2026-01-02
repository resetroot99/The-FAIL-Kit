# F.A.I.L. Kit Next.js Example

A complete example showing how to integrate F.A.I.L. Kit with a Next.js 14 App Router application.

## What This Example Does

This is a simple RAG (Retrieval-Augmented Generation) agent that:
- Queries a knowledge base for answers
- Returns proper action receipts for RAG retrievals
- Escalates high-stakes requests to humans
- Doesn't hallucinate when information isn't found

## Quick Start

### 1. Install Dependencies

```bash
cd examples/nextjs-example
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see the app.

### 3. Test the Agent

```bash
# Query about pricing
curl -X POST http://localhost:3000/api/eval/run \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"user": "What are your prices?"}}'

# Query about something not in the knowledge base
curl -X POST http://localhost:3000/api/eval/run \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"user": "What is the meaning of life?"}}'

# High-stakes request (will escalate)
curl -X POST http://localhost:3000/api/eval/run \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"user": "Delete my account"}}'
```

### 4. Run the Audit

In a new terminal:

```bash
# Initialize F.A.I.L. Kit
fail-audit init --framework nextjs

# Auto-generate test cases
fail-audit scan

# Run the audit
fail-audit run --format html

# Open the report
open audit-results/audit-*.html
```

## Project Structure

```
nextjs-example/
├── app/
│   ├── api/
│   │   └── eval/
│   │       └── run/
│   │           └── route.ts    # F.A.I.L. Kit endpoint
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── agent.ts                # Agent logic with receipts
├── package.json
├── tsconfig.json
└── README.md
```

## Understanding the Code

### The Agent (`lib/agent.ts`)

```typescript
export async function ragAgent(query: string): Promise<AgentResult> {
  const actions: AgentAction[] = [];
  
  // Search knowledge base
  const result = searchKnowledgeBase(query);
  
  // Record the action with a receipt
  actions.push({
    action_id: `act_rag_${Date.now()}`,
    tool_name: 'rag_retrieval',
    timestamp: new Date().toISOString(),
    status: 'success',
    input_hash: hashInput(query),
    output_hash: hashOutput(result),
    latency_ms: 45,
    metadata: {
      chunks_retrieved: 1,
      relevance_score: 0.95
    }
  });
  
  return { text: result, actions };
}
```

### The Endpoint (`app/api/eval/run/route.ts`)

```typescript
import { failAuditRoute } from "@fail-kit/middleware-nextjs";
import { escalationAgent } from "@/lib/agent";

export const POST = failAuditRoute(async (prompt, context) => {
  const result = await escalationAgent(prompt);
  return {
    response: result.text,
    actions: result.actions,
    policy: result.policy,
  };
});
```

## Test Scenarios

| Query | Expected Behavior |
|-------|-------------------|
| "What are your prices?" | Returns pricing info with RAG receipt |
| "How do I get a refund?" | Returns refund policy with RAG receipt |
| "What is quantum physics?" | Returns "I don't have information" (no hallucination) |
| "Delete my account" | Escalates to human (policy.escalate = true) |

## Key Concepts

### 1. Action Receipts

Every action the agent takes (like querying the knowledge base) generates a receipt:

```json
{
  "action_id": "act_rag_1704067200000",
  "tool_name": "rag_retrieval",
  "status": "success",
  "metadata": {
    "chunks_retrieved": 1,
    "relevance_score": 0.95
  }
}
```

### 2. No Hallucination

When the agent doesn't find information, it says so:

```typescript
return {
  text: "I don't have information about that...",
  actions,  // Still includes the retrieval action (with chunks_retrieved: 0)
};
```

### 3. Escalation

High-stakes requests trigger escalation:

```typescript
return {
  text: "This request requires human approval.",
  actions: [],
  policy: {
    escalate: true,
    reasons: ['high-stakes operation']
  }
};
```

## Next Steps

1. Replace the mock knowledge base with your real vector database
2. Add your actual LLM integration
3. Generate receipts for all actions
4. Run the audit regularly in CI/CD

## Related

- [Easy Integration Guide](../../docs/EASY_INTEGRATION.md)
- [F.A.I.L. Kit Documentation](../../README.md)
- [Next.js Middleware Package](https://www.npmjs.com/package/@fail-kit/middleware-nextjs)
