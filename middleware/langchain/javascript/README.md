# F.A.I.L. Kit LangChain Adapter (JavaScript/TypeScript)

Drop-in adapter for integrating LangChain.js agents with the F.A.I.L. Kit audit framework.

## Installation

```bash
npm install
npm run build
```

## Quick Start

```typescript
import express from 'express';
import { AgentExecutor } from 'langchain/agents';
import {
  createFailKitRouter,
  ReceiptGeneratingTool
} from '@fail-kit/langchain-adapter';

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

## Documentation

See [LANGCHAIN_INTEGRATION.md](../../../docs/LANGCHAIN_INTEGRATION.md) for complete documentation.

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

## Examples

See [examples/langchain-javascript/](../../../examples/langchain-javascript/) for a complete working example.

## Testing

```bash
npm test
```

## License

See [LICENSE.txt](../../../LICENSE.txt)
