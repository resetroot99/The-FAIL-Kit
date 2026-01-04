# @fail-kit/core

> **v1.6.0** - Core library for F.A.I.L. Kit

Receipt generation, validation, compliance, and utilities for AI agent audit trails.

## Installation

```bash
npm install @fail-kit/core
# or
yarn add @fail-kit/core
# or
pnpm add @fail-kit/core
```

## Quick Start

### Receipt Generation

```typescript
import { receipt, createReceipt } from '@fail-kit/core';

// Fluent API (recommended)
const r = receipt()
  .tool('payment_processor')
  .input({ amount: 100, currency: 'USD' })
  .output({ transactionId: 'txn_123' })
  .proof('Payment processed successfully')
  .success()
  .build();

// Simple function
const r2 = createReceipt({
  toolName: 'email_sender',
  input: { to: 'user@example.com', subject: 'Hello' },
  output: { messageId: 'msg_123' },
  status: 'success',
});
```

### Receipt Validation

```typescript
import { ReceiptValidator, isValidReceipt, assertValidReceipt } from '@fail-kit/core';

// Validator class
const validator = new ReceiptValidator(receipt);
if (!validator.isValid()) {
  console.log(validator.getErrors());
  console.log(validator.getMissingFields());
}

// Quick check
if (isValidReceipt(receipt)) {
  console.log('Valid!');
}

// Assert (throws if invalid)
assertValidReceipt(receipt);
```

### Higher-Order Function Wrapper

```typescript
import { withReceipt } from '@fail-kit/core';

async function processPayment(amount: number) {
  // Your payment logic here
  return { transactionId: 'txn_123' };
}

// Wrap the function to auto-generate receipts
const processPaymentWithReceipt = withReceipt('payment_processor', processPayment);

const { result, receipt } = await processPaymentWithReceipt(100);
console.log(result);   // { transactionId: 'txn_123' }
console.log(receipt);  // ActionReceipt object
```

### Decorator (TypeScript)

```typescript
import { ReceiptGenerating } from '@fail-kit/core';

class PaymentService {
  @ReceiptGenerating('payment_processor')
  async processPayment(amount: number) {
    return { transactionId: 'txn_123' };
  }
}
```

## Features

- ✅ Receipt generation with fluent API
- ✅ Schema validation
- ✅ SHA-256 hashing
- ✅ TypeScript support
- 🆕 **v1.6.0**: Signed receipts with HMAC
- 🆕 **v1.6.0**: Compliance validation (SOC2, PCI-DSS, HIPAA, GDPR)
- 🆕 **v1.6.0**: Evidence generation for audits
- 🆕 **v1.6.0**: Resilience utilities (retry, timeout)
- 🆕 **v1.6.0**: Secret detection
- 🆕 **v1.6.0**: Provenance context helpers

---

## v1.6.0 New Features

### Signed Receipts

Create tamper-proof receipts with HMAC signatures:

```typescript
import { signedReceipt, signReceipt, verifyReceiptSignature } from '@fail-kit/core';

// Fluent API
const r = signedReceipt()
  .tool('payment_processor')
  .input({ amount: 100 })
  .output({ txnId: 'txn_123' })
  .withKey('my-secret-key')
  .buildSigned();

// Or sign an existing receipt
const signed = signReceipt(existingReceipt, 'my-secret-key');

// Verify signature
const isValid = verifyReceiptSignature(signed, 'my-secret-key');
```

### Compliance Validation

Validate receipts against compliance frameworks:

```typescript
import { ComplianceValidator, validateForCompliance, getComplianceBadges } from '@fail-kit/core';

// Check compliance status
const validator = new ComplianceValidator(receipt);

console.log(validator.isSOC2Compliant());    // true/false
console.log(validator.isPCIDSSCompliant());  // true/false
console.log(validator.isHIPAACompliant());   // true/false
console.log(validator.isGDPRCompliant());    // true/false

// Get all compliance status
const status = validator.getComplianceStatus();
// { soc2: { compliant: true, warnings: [] }, pciDss: { ... }, ... }

// Get compliance badges for a rule
const badges = getComplianceBadges('FK001'); // ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR', 'ISO27001', 'NIST']
```

### Evidence Generation

Generate signed evidence packages for audit exports:

```typescript
import { generateEvidencePackage, verifyEvidenceSignature, exportEvidenceAsCSV } from '@fail-kit/core';

const evidence = generateEvidencePackage(receipts, {
  gitHash: 'abc123',
  gitBranch: 'main'
});

// Verify integrity
const isValid = verifyEvidenceSignature(evidence);

// Export as CSV
const csv = exportEvidenceAsCSV(receipts);
```

### Resilience Utilities

Add retry and timeout logic to async operations:

```typescript
import { withRetry, withTimeout } from '@fail-kit/core';

// Retry with exponential backoff
const result = await withRetry(
  () => llm.invoke(prompt),
  {
    maxRetries: 3,
    baseDelay: 1000,
    jitter: true,
    onRetry: (error, attempt) => console.log(`Retry ${attempt}`)
  }
);

// Execute with timeout
const response = await withTimeout(
  () => llm.invoke(prompt),
  30000 // 30 seconds
);
```

### Secret Detection

Scan for exposed secrets:

```typescript
import { detectSecrets, hasSecrets } from '@fail-kit/core';

// Quick check
if (hasSecrets(userInput)) {
  throw new Error('Secrets detected in input!');
}

// Detailed findings
const findings = detectSecrets(code);
for (const secret of findings) {
  console.log(`${secret.severity}: ${secret.type} - ${secret.masked}`);
}
```

### Provenance Context

Add provenance metadata to receipts:

```typescript
import { generateProvenanceContext, addProvenanceToReceipt } from '@fail-kit/core';

const context = generateProvenanceContext({
  userId: 'user_123',
  sessionId: 'sess_abc',
  traceId: 'trace_xyz'
});

const receiptWithProvenance = addProvenanceToReceipt(receipt, context);
```

---

## Receipt Schema

A valid receipt includes:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action_id` | string | ✅ | Unique identifier (e.g., `act_xyz123_abc`) |
| `tool_name` | string | ✅ | Name of the tool that performed the action |
| `timestamp` | string | ✅ | ISO 8601 timestamp |
| `status` | string | ✅ | `success`, `failure`, `partial`, `pending`, `timeout` |
| `input_hash` | string | ✅ | SHA-256 hash of input (prefixed with `sha256:`) |
| `output_hash` | string | ✅ | SHA-256 hash of output (prefixed with `sha256:`) |
| `proof` | string | ❌ | Human-readable proof description |
| `metadata` | object | ❌ | Additional metadata |
| `error` | object | ❌ | Error information (if failed) |
| `duration_ms` | number | ❌ | Execution duration in milliseconds |
| `signature` | string | ❌ | 🆕 HMAC signature for tamper detection |

---

## API Reference

### Receipt Generation

| Function | Description |
|----------|-------------|
| `receipt()` | Create fluent receipt generator |
| `signedReceipt()` | Create fluent signed receipt generator 🆕 |
| `createReceipt(options)` | Create receipt from options |
| `createSignedReceipt(options)` | Create signed receipt 🆕 |
| `hashData(data)` | Hash data with SHA-256 |
| `generateActionId(prefix?)` | Generate unique action ID |
| `withReceipt(toolName, fn)` | Wrap function with receipt generation |
| `@ReceiptGenerating(toolName)` | Decorator for methods |
| `signReceipt(receipt, key?)` | Sign an existing receipt 🆕 |
| `verifyReceiptSignature(receipt, key?)` | Verify receipt signature 🆕 |

### Validation

| Function | Description |
|----------|-------------|
| `validateReceipt(receipt, options?)` | Validate with detailed results |
| `isValidReceipt(receipt)` | Quick boolean check |
| `assertValidReceipt(receipt)` | Throw if invalid |
| `validateForCompliance(receipt, options)` | Validate for compliance 🆕 |
| `ComplianceValidator` | Class with compliance methods 🆕 |

### Compliance

| Function | Description |
|----------|-------------|
| `COMPLIANCE_MAPPINGS` | Mapping of rules to frameworks 🆕 |
| `getComplianceBadges(ruleId)` | Get framework badges 🆕 |
| `getComplianceControls(ruleId, framework)` | Get specific controls 🆕 |

### Evidence

| Function | Description |
|----------|-------------|
| `generateEvidencePackage(receipts, provenance?)` | Create signed evidence 🆕 |
| `verifyEvidenceSignature(evidence)` | Verify evidence integrity 🆕 |
| `exportEvidenceAsCSV(receipts)` | Export as CSV 🆕 |

### Resilience

| Function | Description |
|----------|-------------|
| `withRetry<T>(fn, config?)` | Retry with exponential backoff 🆕 |
| `withTimeout<T>(fn, timeoutMs)` | Execute with timeout 🆕 |

### Security

| Function | Description |
|----------|-------------|
| `detectSecrets(text)` | Find exposed secrets 🆕 |
| `hasSecrets(text)` | Quick secret check 🆕 |

### Provenance

| Function | Description |
|----------|-------------|
| `generateProvenanceContext(options?)` | Generate provenance context 🆕 |
| `addProvenanceToReceipt(receipt, context)` | Add provenance metadata 🆕 |

---

## Integration with F.A.I.L. Kit

This package is part of the [F.A.I.L. Kit](https://github.com/resetroot99/The-FAIL-Kit) ecosystem:

- **CLI**: Run audits from command line
- **VS Code Extension**: Real-time analysis in your editor
- **LangChain Adapter**: Middleware for LangChain agents (Python & JS)

## License

MIT
