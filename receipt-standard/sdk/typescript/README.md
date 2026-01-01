# TypeScript Receipt SDK

Validate and generate receipts for AI agent actions.

## Installation

```bash
npm install @fail-kit/receipt-standard
```

## Usage

### Validating a Receipt

```typescript
import { validateReceipt } from '@fail-kit/receipt-standard';

const receipt = {
  action_id: "act_123",
  tool_name: "email_sender",
  timestamp: "2025-01-01T00:00:00Z",
  status: "success",
  input_hash: "sha256:abc...",
  output_hash: "sha256:def..."
};

const result = validateReceipt(receipt);
if (result.valid) {
  console.log("Receipt is valid");
} else {
  console.error("Validation errors:", result.errors);
}
```

### Generating a Receipt

```typescript
import { generateReceipt } from '@fail-kit/receipt-standard';

const receipt = generateReceipt({
  toolName: "email_sender",
  input: { to: "user@example.com", subject: "Hello" },
  output: { message_id: "msg_123", status: "sent" },
  status: "success"
});

console.log(receipt);
// {
//   action_id: "act_abc123...",
//   tool_name: "email_sender",
//   timestamp: "2025-01-01T10:00:00.000Z",
//   status: "success",
//   input_hash: "sha256:...",
//   output_hash: "sha256:...",
//   latency_ms: 0
// }
```

## API

See [index.ts](index.ts) for full API documentation.

## License

MIT
