# F.A.I.L. Kit CLI Reference

Complete command reference for the Forensic Audit of Intelligent Logic CLI tool.

## Table of Contents

- [Installation](#installation)
- [Commands](#commands)
  - [init](#init)
  - [scan](#scan)
  - [run](#run)
  - [report](#report)
  - [generate](#generate)
  - [doctor](#doctor)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Output Formats](#output-formats)
- [Exit Codes](#exit-codes)

---

## Installation

```bash
# Install globally via npm
npm install -g @fail-kit/cli

# Verify installation
fail-audit --version
```

---

## Commands

### `init`

Initialize a new audit configuration with an interactive wizard.

#### Usage

```bash
fail-audit init [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip prompts and use defaults (CI mode) |
| `-e, --endpoint <url>` | Set endpoint URL directly |
| `-t, --timeout <ms>` | Set timeout in milliseconds |
| `-f, --framework <framework>` | Specify framework: `nextjs`, `express`, `fastapi`, `other` |
| `--install` | Auto-install middleware for your framework |
| `--test` | Test endpoint connectivity after setup |

#### Examples

```bash
# Interactive setup (recommended for first-time use)
fail-audit init

# Quick setup with defaults
fail-audit init --yes

# Setup for Express with auto-install
fail-audit init --framework express --install

# Setup with custom endpoint
fail-audit init --endpoint http://localhost:3000/api/eval/run

# Setup and test connection
fail-audit init --test
```

#### Output

Creates `fail-audit.config.json` in your project root with your audit configuration.

---

### `scan`

Scan your codebase and auto-generate test cases based on detected patterns.

#### Usage

```bash
fail-audit scan [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `-p, --path <dir>` | Path to scan (default: `.`) |
| `-o, --output <dir>` | Output directory for generated cases |
| `--run` | Run audit immediately after generating cases |
| `--dry-run` | Preview what would be generated without saving |
| `-v, --verbose` | Show detailed scan results |

#### Examples

```bash
# Scan current directory
fail-audit scan

# Scan specific directory
fail-audit scan --path ./src

# Preview without saving
fail-audit scan --dry-run

# Scan and immediately run audit
fail-audit scan --run

# Verbose output with details
fail-audit scan --verbose

# Save to custom directory
fail-audit scan --output ./my-test-cases
```

#### What It Detects

The scanner automatically detects:
- **API endpoints** (Next.js, Express, FastAPI)
- **Agent functions** (query, generate, process, estimate)
- **Tool calls** (database, HTTP, file, email)
- **LLM invocations** (OpenAI, Anthropic, etc.)

---

### `run`

Run the forensic audit against your agent.

#### Usage

```bash
fail-audit run [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `-e, --endpoint <url>` | Override the endpoint URL from config |
| `-l, --level <level>` | Run specific level: `smoke`, `interrogation`, or `red-team` |
| `-c, --case <id>` | Run a specific test case by ID |
| `-f, --format <format>` | Output format: `json`, `html`, `dashboard`, `junit`, `markdown` (default: `json`) |
| `-o, --output <file>` | Output file path (auto-generated if not specified) |
| `--ci` | CI mode: no colors, machine-readable output |
| `--quiet` | Suppress progress output, only show summary |

#### Examples

```bash
# Run all tests with JSON output
fail-audit run

# Run with interactive dashboard (recommended)
fail-audit run --format dashboard

# Run with detailed HTML report
fail-audit run --format html

# Run smoke tests only
fail-audit run --level smoke

# Run interrogation tests
fail-audit run --level interrogation

# Run red team (adversarial) tests
fail-audit run --level red-team

# Run specific test case
fail-audit run --case CONTRACT_0001

# CI/CD mode with JUnit XML
fail-audit run --format junit --ci

# Override endpoint
fail-audit run --endpoint http://staging.example.com/eval/run

# Custom output file
fail-audit run --format html --output ./reports/audit-report.html

# Quiet mode (minimal output)
fail-audit run --quiet
```

#### Audit Levels

| Level | Description | Test Prefixes |
|-------|-------------|---------------|
| `smoke` | Basic contract validation, benign inputs | `CONTRACT_BENIGN_*`, `CONTRACT_0001`, `CONTRACT_0002` |
| `interrogation` | Behavioral testing, edge cases, action verification | `AGENT_*`, `CONTRACT_0003`, `CONTRACT_02*`, `SHIFT_*` |
| `red-team` | Adversarial attacks, injection attempts, policy bypass | `ADV_*`, `RAG_*` |

#### Smart Defaults

If no test cases exist, `run` automatically invokes `scan` first to generate test cases from your codebase.

---

### `report`

Generate reports from previously saved audit results.

#### Usage

```bash
fail-audit report <results-file> [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `-f, --format <format>` | Output format: `html`, `dashboard`, `markdown`, `junit` (default: `html`) |
| `-o, --output <file>` | Output file path (default: same name as results file with new extension) |

#### Examples

```bash
# Generate HTML report from JSON results
fail-audit report audit-results/audit-2025-01-02.json

# Generate interactive dashboard
fail-audit report audit-results/audit-2025-01-02.json --format dashboard

# Generate markdown report
fail-audit report audit-results/audit-2025-01-02.json --format markdown

# Generate JUnit XML for CI
fail-audit report audit-results/audit-2025-01-02.json --format junit

# Custom output path
fail-audit report results.json --format html --output ./reports/full-report.html
```

---

### `generate`

Generate custom test cases from your tool definitions.

#### Usage

```bash
fail-audit generate [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `-t, --tools <file>` | Path to tools.json file (required) |
| `-o, --output <dir>` | Output directory for generated cases (default: `./custom-cases`) |

#### Examples

```bash
# Generate from tools.json
fail-audit generate --tools tools.json

# Generate to custom directory
fail-audit generate --tools tools.json --output ./my-custom-cases
```

#### Tools File Format

```json
{
  "tools": [
    {
      "name": "send_email",
      "description": "Send an email to a recipient",
      "risk": "medium"
    },
    {
      "name": "transfer_money",
      "description": "Transfer money between accounts",
      "risk": "critical"
    }
  ]
}
```

#### Generated Test Cases

For each tool, the generator creates:
1. **Action receipt test** - Verifies the tool generates proper receipts
2. **Failure handling test** - Checks error handling and escalation
3. **High-stakes escalation test** - For sensitive tools (payment, delete, etc.)

---

### `doctor`

Diagnose common setup issues and verify your configuration.

#### Usage

```bash
fail-audit doctor [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `--skip-network` | Skip network connectivity checks |

#### Examples

```bash
# Run all diagnostic checks
fail-audit doctor

# Skip network checks (for offline testing)
fail-audit doctor --skip-network
```

#### Checks Performed

- ✓ Configuration file exists and is valid
- ✓ Test cases directory exists and contains cases
- ✓ Output directory is writable
- ✓ Endpoint connectivity (unless `--skip-network`)
- ✓ Node.js version compatibility
- ✓ Required dependencies installed

---

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

### Configuration Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `endpoint` | string | Agent endpoint URL | `http://localhost:8000/eval/run` |
| `timeout` | number | Request timeout in milliseconds | `30000` |
| `cases_dir` | string | Directory containing test cases | `./cases` |
| `output_dir` | string | Directory for audit results | `./audit-results` |
| `levels.smoke_test` | boolean | Enable smoke tests | `true` |
| `levels.interrogation` | boolean | Enable interrogation tests | `true` |
| `levels.red_team` | boolean | Enable red team tests | `true` |

---

## Environment Variables

Override config values with environment variables:

| Variable | Config Key | Description |
|----------|-----------|-------------|
| `FAIL_AUDIT_ENDPOINT` | `endpoint` | Agent endpoint URL |
| `FAIL_AUDIT_TIMEOUT` | `timeout` | Request timeout (ms) |
| `FAIL_AUDIT_CASES_DIR` | `cases_dir` | Test cases directory |
| `FAIL_AUDIT_OUTPUT_DIR` | `output_dir` | Results output directory |
| `CI` | N/A | Automatically enables CI mode |
| `GITHUB_ACTIONS` | N/A | Automatically enables CI mode |
| `GITLAB_CI` | N/A | Automatically enables CI mode |

### Example

```bash
export FAIL_AUDIT_ENDPOINT=http://production.example.com/eval/run
export FAIL_AUDIT_TIMEOUT=60000
fail-audit run
```

---

## Output Formats

### Dashboard (Recommended)

Interactive HTML dashboard with decision-grade reporting.

```bash
fail-audit run --format dashboard
```

**Features:**
- Ship decision block (BLOCK/NEEDS REVIEW/SHIP)
- Failure buckets for 5-second triage
- Top 3 root causes auto-generated
- Interactive timeline with hover tooltips
- Enhanced forensic details with fix hints
- Keyboard navigation (j/k keys)
- VSCode deep links
- Run provenance (git hash, versions)

**Best for:** Development, fixing failures, stakeholder decisions

### HTML

Detailed HTML report with error explanations and source locations.

```bash
fail-audit run --format html
```

**Best for:** Development, debugging, documentation

### JSON

Raw results data in JSON format.

```bash
fail-audit run --format json
```

**Best for:** Programmatic analysis, custom tooling

### JUnit

JUnit XML format for CI/CD integration.

```bash
fail-audit run --format junit
```

**Best for:** CI/CD integration, test runners

### Markdown

Markdown-formatted report.

```bash
fail-audit run --format markdown
```

**Best for:** GitHub/GitLab comments, documentation

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed |
| `1` | One or more tests failed or error occurred |

### CI/CD Usage

```bash
# Run audit in CI pipeline
fail-audit run --ci --format junit

# Check exit code
if [ $? -eq 0 ]; then
  echo "Audit passed"
else
  echo "Audit failed"
  exit 1
fi
```

---

## Quick Reference

### Common Workflows

**First-time setup:**
```bash
fail-audit init
fail-audit scan
fail-audit run --format dashboard
```

**Daily development:**
```bash
fail-audit scan --run
```

**Pre-deployment check:**
```bash
fail-audit run --level smoke
fail-audit run --level interrogation
```

**CI/CD pipeline:**
```bash
fail-audit init --yes
fail-audit scan
fail-audit run --ci --format junit
```

**Custom test cases:**
```bash
fail-audit generate --tools tools.json
fail-audit run --format dashboard
```

**Troubleshooting:**
```bash
fail-audit doctor
fail-audit run --verbose
```

---

## Getting Help

```bash
# Show version
fail-audit --version

# Show help for all commands
fail-audit --help

# Show help for specific command
fail-audit init --help
fail-audit run --help
fail-audit scan --help
```

---

## Additional Resources

- [Quick Start Guide](../QUICKSTART.md)
- [Integration Guide](../INTEGRATION.md)
- [CI/CD Guide](./CI_CD_GUIDE.md)
- [Easy Integration Guide](./EASY_INTEGRATION.md)
- [Failure Modes Catalog](../FAILURE_MODES.md)
- [Receipt Standard](../receipt-standard/README.md)

---

**No trace, no ship.**
