# @fail-kit/middleware-nextjs

> F.A.I.L. Kit middleware for Next.js - Add forensic audit endpoint in 5 lines

## Installation

```bash
npm install @fail-kit/middleware-nextjs
```

## Usage

Create `app/api/eval/run/route.ts`:

```typescript
import { failAuditRoute } from "@fail-kit/middleware-nextjs";
import { yourAgent } from "@/lib/your-agent";

export const POST = failAuditRoute(async (prompt, context) => {
  const result = await yourAgent.process(prompt);
  return {
    response: result.text,
    actions: result.actions,
    receipts: result.receipts
  };
});
```

## Simple Integration

For agents that just return text:

```typescript
import { failAuditSimple } from "@fail-kit/middleware-nextjs";

export const POST = failAuditSimple(yourAgent.process);
```

## TypeScript Types

```typescript
interface FailAuditAction {
  tool: string;
  input?: any;
  output?: any;
  status?: 'success' | 'failed';
  proof?: string;
}

interface FailAuditReceipt {
  timestamp: string;
  tool: string;
  status: 'success' | 'failed';
  proof: string;
}

interface FailAuditResponse {
  response: string;
  actions: FailAuditAction[];
  receipts: FailAuditReceipt[];
}
```

## Run the Audit

```bash
npm install -g @fail-kit/cli
fail-audit init
fail-audit run
```

---

**No trace, no ship.**
