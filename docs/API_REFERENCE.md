# API Reference

Complete API documentation for The F.A.I.L. Kit.

## Evaluation Endpoint

### POST /eval/run

The core endpoint that your agent must implement for F.A.I.L. Kit audits.

**Request:**

```json
{
  "prompt": "string",
  "context": {
    "mode": "chat" | "agent",
    "tools_available": ["tool_name"],
    "user_id": "string (optional)"
  }
}
```

**Response:**

```json
{
  "response": "string",
  "actions": [
    {
      "action_id": "string",
      "tool_name": "string",
      "timestamp": "ISO8601",
      "status": "success" | "failed",
      "input_hash": "sha256:...",
      "output_hash": "sha256:...",
      "latency_ms": 123
    }
  ],
  "receipts": [
    {
      "timestamp": "ISO8601",
      "tool": "string",
      "status": "success" | "failed",
      "proof": "string",
      "message_id": "string (optional)"
    }
  ],
  "policy": {
    "refuse": false,
    "abstain": false,
    "escalate": false,
    "reasons": ["string"]
  }
}
```

**Status Codes:**

- `200 OK` - Request processed successfully
- `400 Bad Request` - Invalid request format
- `500 Internal Server Error` - Agent error
- `503 Service Unavailable` - Agent temporarily unavailable

---

## Receipt Schema

### Action Receipt

Required fields for proving an action occurred:

```typescript
interface ActionReceipt {
  action_id: string;          // Unique identifier for this action
  tool_name: string;          // Name of the tool/function called
  timestamp: string;          // ISO8601 timestamp
  status: 'success' | 'failed';
  input_hash: string;         // SHA256 hash of input (format: "sha256:...")
  output_hash: string;        // SHA256 hash of output
  latency_ms: number;         // Execution time in milliseconds
  
  // Optional but recommended
  idempotency_key?: string;   // For deduplication
  retry_count?: number;       // Number of retries
  error_code?: string;        // If status is 'failed'
  metadata?: Record<string, any>;
}
```

### Policy Decision

```typescript
interface PolicyDecision {
  refuse: boolean;            // Agent refused to execute
  abstain: boolean;           // Agent cannot provide answer
  escalate: boolean;          // Requires human review
  reasons: string[];          // Why this decision was made
}
```

---

## CLI Commands

### fail-audit init

Initialize audit configuration.

```bash
fail-audit init [options]
```

**Options:**

- `-y, --yes` - Skip prompts, use defaults
- `-e, --endpoint <url>` - Set endpoint URL
- `-t, --timeout <ms>` - Set timeout in milliseconds
- `--test` - Test endpoint connectivity after setup
- `--install` - Auto-install middleware
- `-f, --framework <name>` - Framework: nextjs, express, fastapi, other

**Example:**

```bash
fail-audit init --endpoint http://localhost:8000 --framework express
```

---

### fail-audit run

Run the audit against your agent.

```bash
fail-audit run [options]
```

**Options:**

- `-e, --endpoint <url>` - Override configured endpoint
- `-l, --level <level>` - Run specific level: smoke, interrogation, red-team
- `-c, --cases <ids>` - Run specific test cases (comma-separated)
- `-f, --format <format>` - Output format: json, html, markdown, junit
- `-o, --output <path>` - Output file path
- `--timeout <ms>` - Request timeout
- `--parallel <n>` - Run tests in parallel (default: 1)

**Examples:**

```bash
# Run all tests
fail-audit run

# Run only smoke tests
fail-audit run --level smoke

# Run specific cases
fail-audit run --cases CONTRACT_0001,AGENT_0008

# Generate HTML report
fail-audit run --format html --output report.html

# Run with custom timeout
fail-audit run --timeout 60000
```

---

### fail-audit scan

Auto-generate test cases from your codebase.

```bash
fail-audit scan [options]
```

**Options:**

- `-d, --dir <path>` - Directory to scan (default: current)
- `-o, --output <path>` - Output directory for generated cases
- `--framework <name>` - Framework hint for better detection

**Example:**

```bash
fail-audit scan --dir ./src --output ./cases
```

---

### fail-audit report

Generate report from audit results.

```bash
fail-audit report <results-file> [options]
```

**Options:**

- `-f, --format <format>` - Output format: html, markdown, json
- `-o, --output <path>` - Output file path

**Example:**

```bash
fail-audit report audit-results/results.json --format html
```

---

### fail-audit doctor

Run diagnostics on your setup.

```bash
fail-audit doctor
```

Checks:
- Node.js version
- npm dependencies
- Endpoint connectivity
- Configuration validity
- Test case files

---

## Middleware API

### Express

```javascript
const { failAuditMiddleware } = require('@fail-kit/middleware-express');

app.use('/eval', failAuditMiddleware({
  handler: async (prompt, context) => {
    // Your agent logic
    return {
      response: 'string',
      actions: [],
      receipts: []
    };
  },
  
  // Optional configuration
  timeout: 30000,
  validateReceipts: true,
  enforceGates: true
}));
```

---

### Next.js

```typescript
import { failAuditRoute } from '@fail-kit/middleware-nextjs';

export const POST = failAuditRoute(async (prompt, context) => {
  // Your agent logic
  return {
    response: 'string',
    actions: [],
    receipts: []
  };
});
```

---

### FastAPI

```python
from fail_kit import fail_audit

@app.post("/eval/run")
@fail_audit(auto_receipts=True)
async def evaluate(prompt: str, context: dict):
    # Your agent logic
    return {
        "response": "string",
        "actions": [],
        "receipts": []
    }
```

---

## Configuration File

### fail-audit.config.json

```json
{
  "endpoint": "http://localhost:8000/eval/run",
  "timeout": 30000,
  "cases_dir": "./cases",
  "output_dir": "./audit-results",
  "levels": {
    "smoke_test": true,
    "interrogation": true,
    "red_team": true
  },
  "parallel": 1,
  "retry": {
    "enabled": true,
    "max_attempts": 3,
    "backoff_ms": 1000
  }
}
```

**Fields:**

- `endpoint` (string, required) - Agent evaluation endpoint URL
- `timeout` (number) - Request timeout in milliseconds (default: 30000)
- `cases_dir` (string) - Path to test case directory (default: "./cases")
- `output_dir` (string) - Path for audit results (default: "./audit-results")
- `levels` (object) - Which audit levels to run
- `parallel` (number) - Number of parallel test executions (default: 1)
- `retry` (object) - Retry configuration for failed requests

---

## Exit Codes

The CLI uses the following exit codes:

- `0` - Success (all tests passed or run completed)
- `1` - Failure (tests failed or configuration error)
- `2` - Invalid arguments or usage
- `3` - Network error (cannot reach endpoint)
- `4` - Timeout error

---

## Environment Variables

- `FAIL_AUDIT_ENDPOINT` - Override endpoint URL
- `FAIL_AUDIT_TIMEOUT` - Override timeout (milliseconds)
- `FAIL_AUDIT_VERBOSE` - Enable verbose logging (true/false)
- `NO_COLOR` - Disable colored output

---

## Programmatic Usage

You can use F.A.I.L. Kit programmatically in Node.js:

```javascript
const { runAudit, generateReport } = require('@fail-kit/cli');

async function auditMyAgent() {
  const results = await runAudit({
    endpoint: 'http://localhost:8000/eval/run',
    casesDir: './cases',
    timeout: 30000
  });
  
  const report = await generateReport(results, {
    format: 'html',
    output: './report.html'
  });
  
  console.log(`Pass rate: ${results.passed}/${results.total}`);
  
  return results.failed === 0;
}
```

---

## Receipt Validation

Use the receipt validation SDK:

**TypeScript:**

```typescript
import { validateReceipt, ReceiptSchema } from '@fail-kit/receipt-standard';

const receipt = {
  action_id: 'act_123',
  tool_name: 'email_sender',
  timestamp: new Date().toISOString(),
  status: 'success',
  input_hash: 'sha256:abc...',
  output_hash: 'sha256:def...',
  latency_ms: 245
};

const validation = validateReceipt(receipt);
if (!validation.valid) {
  console.error('Invalid receipt:', validation.errors);
}
```

**Python:**

```python
from fail_kit.receipt import validate_receipt

receipt = {
    "action_id": "act_123",
    "tool_name": "email_sender",
    "timestamp": "2025-01-01T00:00:00Z",
    "status": "success",
    "input_hash": "sha256:abc...",
    "output_hash": "sha256:def...",
    "latency_ms": 245
}

validation = validate_receipt(receipt)
if not validation["valid"]:
    print(f"Invalid receipt: {validation['errors']}")
```

---

## Support

For API questions or issues:

- **Documentation:** [GitHub Wiki](https://github.com/resetroot99/The-FAIL-Kit/wiki)
- **Issues:** [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)
- **Email:** ali@jakvan.io

---

**No trace, no ship.**
