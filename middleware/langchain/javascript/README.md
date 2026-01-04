# @fail-kit/langchain

> **v1.6.0** - LangChain.js adapter for F.A.I.L. Kit

Drop-in adapter for integrating LangChain.js agents with the F.A.I.L. Kit audit framework. Automatically generates receipts, enforces compliance, and provides resilience utilities.

## Installation

```bash
npm install @fail-kit/langchain
# or
yarn add @fail-kit/langchain
# or
pnpm add @fail-kit/langchain
```

## Quick Start

```typescript
import express from 'express';
import { AgentExecutor } from 'langchain/agents';
import {
  createFailKitRouter,
  ReceiptGeneratingTool
} from '@fail-kit/langchain';

const app = express();
app.use(express.json());

// Define tools with automatic receipt generation
class EmailTool extends ReceiptGeneratingTool {
  name = 'email_sender';
  description = 'Send an email';
  
  async _execute(input: { to: string; subject: string; body: string }) {
    await sendEmail(input.to, input.subject, input.body);
    return { status: 'sent', message_id: 'msg_123' };
  }
}

// Create agent
const tools = [new EmailTool()];
const agentExecutor = new AgentExecutor({ agent, tools });

// Add F.A.I.L. Kit endpoint
app.use('/eval', createFailKitRouter(agentExecutor));

app.listen(8000);
```

## Features

- ✅ Automatic receipt generation from tool executions
- ✅ Full RECEIPT_SCHEMA.json compliance
- ✅ TypeScript support with full type definitions
- ✅ Custom metadata in receipts
- ✅ Error handling with failure receipts
- ✅ SHA256 hashing for verification
- ✅ Works with LangGraph
- 🆕 **v1.6.0**: Compliance framework mappings (SOC2, PCI-DSS, HIPAA, GDPR)
- 🆕 **v1.6.0**: Resilience utilities (retry, timeout)
- 🆕 **v1.6.0**: Evidence generation for audits
- 🆕 **v1.6.0**: Secret detection

---

## v1.6.0 New Features

### Resilience Utilities

Add retry logic with exponential backoff to LLM calls:

```typescript
import { withRetry, withTimeout } from '@fail-kit/langchain';

// Retry with exponential backoff
const result = await withRetry(
  () => llm.invoke(prompt),
  {
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (error, attempt) => console.log(`Retry ${attempt}: ${error.message}`)
  }
);

// Execute with timeout
const response = await withTimeout(
  () => llm.invoke(prompt),
  30000 // 30 seconds
);
```

### Compliance Mappings

Check which compliance frameworks apply to each rule:

```typescript
import { COMPLIANCE_MAPPINGS, getComplianceBadges } from '@fail-kit/langchain';

// Get compliance badges for a rule
const badges = getComplianceBadges('FK001'); // ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR']

// Get specific controls
const controls = COMPLIANCE_MAPPINGS.FK001.soc2; // ['CC6.1', 'CC7.2', 'CC7.3']
```

### Evidence Generation

Generate signed evidence packages for audit exports:

```typescript
import { generateEvidencePackage, exportEvidenceAsCSV } from '@fail-kit/langchain';

// Collect receipts from your agent
const receipts = tool.getReceipts();

// Generate signed evidence package
const evidence = generateEvidencePackage(receipts, {
  gitHash: 'abc123',
  gitBranch: 'main'
});

console.log(JSON.stringify(evidence, null, 2));

// Or export as CSV
const csv = exportEvidenceAsCSV(receipts);
```

### Secret Detection

Scan code or prompts for exposed secrets:

```typescript
import { detectSecrets } from '@fail-kit/langchain';

const findings = detectSecrets(userInput);
if (findings.length > 0) {
  for (const secret of findings) {
    console.log(`⚠️ Found ${secret.type}: ${secret.masked}`);
  }
}
```

---

## API Reference

### `createFailKitRouter(agentExecutor, config?)`

Creates an Express router with the `/run` endpoint.

**Parameters:**
- `agentExecutor`: LangChain AgentExecutor instance
- `config`: Optional FailKitConfig

**Returns:** Express Router

### `ReceiptGeneratingTool`

Base class for tools with automatic receipt generation.

**Methods:**
- `_execute(input: any)`: Override with your tool logic
- `getReceipts()`: Get all receipts
- `clearReceipts()`: Clear receipt history

### `extractReceiptsFromAgentExecutor(executor, result, config?)`

Extract receipts from AgentExecutor intermediate steps.

### `wrapToolWithReceipts(tool)`

Wrap a legacy LangChain tool to generate receipts.

### `withRetry<T>(fn, config?)` 🆕

Execute function with retry logic.

```typescript
interface RetryConfig {
  maxRetries?: number;      // default: 3
  baseDelay?: number;       // default: 1000ms
  maxDelay?: number;        // default: 30000ms
  exponentialBase?: number; // default: 2
  jitter?: boolean;         // default: true
  onRetry?: (error: Error, attempt: number) => void;
}
```

### `withTimeout<T>(fn, timeoutMs)` 🆕

Execute function with timeout.

### `generateEvidencePackage(receipts, provenance?)` 🆕

Generate signed evidence package for audit.

### `exportEvidenceAsCSV(receipts)` 🆕

Export receipts as CSV string.

### `detectSecrets(text)` 🆕

Detect exposed secrets in text.

---

## Examples

See [examples/langchain-javascript/](../../../examples/langchain-javascript/) for a complete working example.

## Testing

```bash
npm test
```

## Related

- [@fail-kit/core](../../packages/core) - Core receipt generation library
- [F.A.I.L. Kit CLI](https://github.com/resetroot99/The-FAIL-Kit) - Command-line audit tool
- [F.A.I.L. Kit VS Code Extension](https://marketplace.visualstudio.com/items?itemName=AliJakvani.fail-kit-vscode) - IDE integration

## License

MIT License - See [LICENSE](../../../LICENSE.txt)
