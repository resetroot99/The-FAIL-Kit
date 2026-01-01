# Receipt Standard

**Version:** 1.0.0  
**License:** MIT  
**Status:** Open Standard

---

The Receipt Standard is an open specification for proving that AI agents actually performed the actions they claim.

---

## The Problem

AI agents can claim they took an action ("I sent the email") without proving it happened. In traditional software, actions leave traces: API responses, database transactions, logs. With AI agents, claims and actions are often decoupled.

**This creates liability.** Users trust what agents say they did. If the action never happened, who is responsible?

---

## The Solution

**If an agent claims it took an action, it must provide a receipt.**

A receipt is structured proof that:
1. An action was attempted
2. The tool was invoked with specific inputs
3. The tool returned specific outputs
4. The operation succeeded or failed

---

## Receipt Format

Minimal example:

```json
{
  "action_id": "act_unique_123",
  "tool_name": "email_sender",
  "timestamp": "2025-01-01T00:00:00Z",
  "status": "success",
  "input_hash": "sha256:abc123...",
  "output_hash": "sha256:def456..."
}
```

With optional fields:

```json
{
  "action_id": "act_unique_123",
  "tool_name": "email_sender",
  "timestamp": "2025-01-01T00:00:00Z",
  "status": "success",
  "input_hash": "sha256:abc123...",
  "output_hash": "sha256:def456...",
  "latency_ms": 245,
  "trace_id": "trace_abc",
  "metadata": {
    "message_id": "msg_789"
  }
}
```

---

## Why Hashes?

**input_hash** proves what was sent to the tool.  
**output_hash** proves what the tool returned.

Together, they enable replay: reproduce the exact execution later.

Hashing prevents receipts from leaking sensitive data while still providing proof of execution.

---

## The Rule

**If the agent cannot produce a receipt, it did not act.**

Or it acted in a way that cannot be audited. Either way: failure.

---

## Quick Start

### Install SDK

**TypeScript:**
```bash
npm install @fail-kit/receipt-standard
```

**Python:**
```bash
pip install fail-kit-receipt-standard
```

### Generate Receipt

**TypeScript:**
```typescript
import { generateReceipt } from '@fail-kit/receipt-standard';

const receipt = generateReceipt({
  toolName: "email_sender",
  input: { to: "user@example.com", subject: "Hello" },
  output: { message_id: "msg_123", status: "sent" },
  status: "success"
});
```

**Python:**
```python
from receipt_standard import generate_receipt

receipt = generate_receipt(
    tool_name="email_sender",
    input_data={"to": "user@example.com", "subject": "Hello"},
    output_data={"message_id": "msg_123", "status": "sent"},
    status="success"
)
```

### Validate Receipt

**TypeScript:**
```typescript
import { validateReceipt } from '@fail-kit/receipt-standard';

const result = validateReceipt(receipt);
if (!result.valid) {
  console.error("Invalid receipt:", result.errors);
}
```

**Python:**
```python
from receipt_standard import validate_receipt

result = validate_receipt(receipt)
if not result["valid"]:
    print("Invalid receipt:", result["errors"])
```

---

## Integration Examples

- [LangChain](examples/langchain-receipt-example.py)
- [Express.js](examples/express-receipt-example.js)
- [FastAPI](examples/fastapi-receipt-example.py)

See [examples/](examples/) for more.

---

## Specification

Full JSON Schema: [SCHEMA.json](SCHEMA.json)

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| action_id | string | Unique identifier (UUID recommended) |
| tool_name | string | Name of invoked tool |
| timestamp | string | ISO-8601 timestamp |
| status | enum | "success" or "failed" |
| input_hash | string | SHA256 hash of input |
| output_hash | string | SHA256 hash of output |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| trace_id | string | Link to broader trace |
| latency_ms | integer | Performance tracking |
| error_message | string | Details if failed |
| metadata | object | Additional context |

---

## Why Open Source This?

Execution integrity shouldn't be proprietary. Every AI agent builder should be able to prove what their agent did.

By open-sourcing the receipt standard, we aim to:

1. **Make it the default** - Become the standard for agent tracing
2. **Enable interoperability** - Work across all agent frameworks
3. **Provide foundation** - For compliance and audit requirements
4. **Community driven** - Let the community extend and improve

---

## Commercial Tools

While the receipt standard is open (MIT), commercial tools build on top:

**F.A.I.L. Kit** - Commercial audit and enforcement platform
- 50 curated test cases for execution integrity
- Pre-configured enforcement gates (CI/runtime)
- Production-ready policy packs (finance, healthcare, etc.)
- Professional audit reports and deliverables
- Advisory services for custom audits

The receipt standard is free. The audit kit provides the testing and enforcement layer.

See [The F.A.I.L. Kit](https://github.com/resetroot99/The-FAIL-Kit) for the full commercial product.

---

## Contributing

We welcome contributions:

- Clarifications to the spec
- Additional SDK languages
- Framework integration examples
- Bug fixes and improvements

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## SDK Libraries

Official libraries:

- [TypeScript SDK](sdk/typescript/) - Receipt validation and generation for Node.js
- [Python SDK](sdk/python/) - Receipt validation and generation for Python

Community libraries welcome for other languages (Go, Rust, Java, C#, etc.)

---

## License

MIT License - See [LICENSE](LICENSE) for details.

Receipt specification and SDK libraries are MIT.  
The F.A.I.L. Kit (test cases, enforcement, templates) remains commercially licensed.

---

## Contact

**Specification questions:** spec@jakvan.io  
**SDK issues:** [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)  
**Commercial inquiries:** ali@jakvan.io

---

**No trace, no ship.**
