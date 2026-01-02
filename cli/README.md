# F.A.I.L. Kit CLI

[![npm version](https://img.shields.io/npm/v/@fail-kit/cli.svg)](https://www.npmjs.com/package/@fail-kit/cli)
[![npm downloads](https://img.shields.io/npm/dm/@fail-kit/cli.svg)](https://www.npmjs.com/package/@fail-kit/cli)

> **Forensic Audit of Intelligent Logic**

The F.A.I.L. Kit CLI is a developer-first tool for running forensic audits on AI agents. It tests whether your agent actually does what it claims — no trace, no ship.

## Installation

```bash
# Install globally via npm
npm install -g @fail-kit/cli

# Verify installation
fail-audit --version
```

## Quick Start

```bash
# Initialize configuration (interactive)
fail-audit init

# Auto-generate test cases from your codebase
fail-audit scan

# Run the audit with interactive dashboard
fail-audit run --format dashboard
```

**Zero manual test writing required.** The `scan` command automatically analyzes your codebase and generates test cases.

## Middleware Packages

For easy integration with your framework:

```bash
# Next.js
npm install @fail-kit/middleware-nextjs

# Express
npm install @fail-kit/middleware-express
```

See [Easy Integration Guide](https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/EASY_INTEGRATION.md) for setup instructions.

## Commands

### `fail-audit init`

Initialize a new audit configuration with an interactive wizard.

```bash
fail-audit init                         # Interactive setup
fail-audit init --yes                   # Use defaults (CI mode)
fail-audit init --framework express     # Specify framework
fail-audit init --install               # Auto-install middleware
fail-audit init --endpoint <url>        # Set endpoint directly
fail-audit init --test                  # Test endpoint after setup
```

### `fail-audit scan`

**NEW:** Scan your codebase and auto-generate test cases.

```bash
fail-audit scan                    # Scan current directory
fail-audit scan --path ./src       # Scan specific directory
fail-audit scan --dry-run          # Preview without saving
fail-audit scan --verbose          # Show detailed results
fail-audit scan --run              # Scan and immediately run audit
```

The scanner detects:
- API endpoints (Next.js, Express, FastAPI)
- Agent functions (query, generate, process, estimate)
- Tool calls (database, HTTP, file, email)
- LLM invocations (OpenAI, Anthropic, etc.)

### `fail-audit run`

Run the forensic audit against your agent.

```bash
fail-audit run                     # Run all tests
fail-audit run --level smoke       # Run smoke tests only
fail-audit run --level interrogation   # Run behavioral tests
fail-audit run --level red-team    # Run adversarial tests
fail-audit run --case CONTRACT_0001    # Run specific test
fail-audit run --format dashboard  # Decision-grade interactive report (NEW)
fail-audit run --format html       # Detailed HTML report
fail-audit run --format junit      # JUnit XML for CI/CD
fail-audit run --ci                # CI mode (no colors)
```

**Smart defaults:** If no test cases exist, `run` automatically invokes `scan` first.

### `fail-audit report`

Generate reports from audit results.

```bash
fail-audit report results.json                      # Generate HTML report  
fail-audit report results.json --format dashboard   # Generate interactive dashboard
fail-audit report results.json --format markdown    # Generate Markdown
fail-audit report results.json --format junit       # Generate JUnit XML
fail-audit report results.json --output report.html
```

### `fail-audit doctor`

Diagnose common setup issues.

```bash
fail-audit doctor              # Run all checks
fail-audit doctor --skip-network   # Skip connectivity check
```

### `fail-audit generate`

Generate custom test cases from your tool definitions.

```bash
fail-audit generate --tools tools.json
fail-audit generate --tools tools.json --output ./my-cases
```

## Configuration

The CLI uses `fail-audit.config.json` in your project root:

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
  }
}
```

### Environment Variables

Override config values with environment variables:

| Variable | Config Key | Description |
|----------|-----------|-------------|
| `FAIL_AUDIT_ENDPOINT` | `endpoint` | Agent endpoint URL |
| `FAIL_AUDIT_TIMEOUT` | `timeout` | Request timeout (ms) |
| `FAIL_AUDIT_CASES_DIR` | `cases_dir` | Test cases directory |
| `FAIL_AUDIT_OUTPUT_DIR` | `output_dir` | Results output directory |

## CI/CD Integration

### Report Formats

F.A.I.L. Kit supports multiple output formats:

| Format | Description | Best For |
|--------|-------------|----------|
| `dashboard` | **NEW v1.5.0:** Decision-grade interactive report with ship decision, failure buckets, root causes, provenance, and keyboard navigation | Development, fixing failures, stakeholder decisions |
| `html` | Detailed HTML report with error explanations and source locations | Development, debugging, documentation |
| `json` | Raw results data | Programmatic analysis, custom tooling |
| `junit` | JUnit XML format | CI/CD integration, test runners |
| `markdown` | Markdown report | GitHub/GitLab comments, documentation |

**Dashboard Report Features (v1.5.0):**
- Ship Decision Block (BLOCK/NEEDS REVIEW/SHIP) with reason and next action
- Failure Buckets (receipt/evidence/policy/tool/validation) for 5-second triage
- Top 3 Root Causes auto-generated from failure patterns
- Interactive timeline with hover tooltips and failure clustering
- Enhanced forensic details: assertion, diff, fix hint, doc link
- Run context & provenance (git hash, versions, receipt verification)
- Keyboard navigation (j/k), copy buttons, VSCode deep links
- Deterministic severity: Critical blocks ship, High needs review, Medium acceptable, Low deferrable

See [Severity Guide](../docs/SEVERITY_GUIDE.md) for detailed severity explanations.

**Examples:**

```bash
# Interactive dashboard (recommended for development)
fail-audit run --format dashboard

# Detailed HTML report with debugging info
fail-audit run --format html

# CI/CD with JUnit XML
fail-audit run --format junit --ci
```

### GitHub Actions

```yaml
- name: Install F.A.I.L. Kit
  run: npm install -g @fail-kit/cli

- name: Run audit
  run: fail-audit scan && fail-audit run --ci --format junit
```

See [CI/CD Guide](https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/CI_CD_GUIDE.md) for complete examples.

### GitLab CI

```yaml
fail-audit:
  script:
    - npm install -g @fail-kit/cli
    - fail-audit scan
    - fail-audit run --ci --format junit
  artifacts:
    reports:
      junit: audit-results/*.xml
```

## Output Formats

| Format | Extension | Use Case |
|--------|----------|----------|
| `json` | `.json` | Raw data, further processing |
| `html` | `.html` | Shareable visual reports |
| `junit` | `.xml` | CI/CD test reporting |
| `markdown` | `.md` | PR comments, documentation |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed |
| `1` | One or more tests failed |

## Audit Levels

- **Smoke Test**: Basic contract validation, benign inputs
- **Interrogation**: Behavioral testing, edge cases, action verification
- **Red Team**: Adversarial attacks, injection attempts, policy bypass

## Examples

Complete working examples are available:

- [Express Example](https://github.com/resetroot99/The-FAIL-Kit/tree/main/examples/express-example)
- [Next.js Example](https://github.com/resetroot99/The-FAIL-Kit/tree/main/examples/nextjs-example)
- [FastAPI Example](https://github.com/resetroot99/The-FAIL-Kit/tree/main/examples/fastapi-example)

## Links

- [Documentation](https://github.com/resetroot99/The-FAIL-Kit#readme)
- [Easy Integration Guide](https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/EASY_INTEGRATION.md)
- [CI/CD Guide](https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/CI_CD_GUIDE.md)
- [Failure Modes Catalog](https://github.com/resetroot99/The-FAIL-Kit/blob/main/FAILURE_MODES.md)
- [Receipt Standard](https://github.com/resetroot99/The-FAIL-Kit/tree/main/receipt-standard)

---

**No trace, no ship.**
