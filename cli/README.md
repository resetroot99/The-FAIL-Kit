# F.A.I.L. Kit CLI

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
# Initialize configuration
fail-audit init

# Run diagnostics to check setup
fail-audit doctor

# Run the full audit
fail-audit run

# Generate an HTML report
fail-audit report audit-results/audit-2025-01-01.json
```

## Commands

### `fail-audit init`

Initialize a new audit configuration with an interactive wizard.

```bash
fail-audit init                    # Interactive setup
fail-audit init --yes              # Use defaults (CI mode)
fail-audit init --endpoint <url>   # Set endpoint directly
fail-audit init --test             # Test endpoint after setup
```

### `fail-audit run`

Run the forensic audit against your agent.

```bash
fail-audit run                     # Run all tests
fail-audit run --level smoke       # Run smoke tests only
fail-audit run --level interrogation   # Run behavioral tests
fail-audit run --level red-team    # Run adversarial tests
fail-audit run --case CONTRACT_0001    # Run specific test
fail-audit run --format html       # Output as HTML
fail-audit run --format junit      # Output as JUnit XML
fail-audit run --ci                # CI mode (no colors)
```

### `fail-audit report`

Generate reports from audit results.

```bash
fail-audit report results.json                    # Generate HTML report
fail-audit report results.json --format markdown  # Generate Markdown
fail-audit report results.json --format junit     # Generate JUnit XML
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

### GitHub Actions

Copy the template to your repository:

```bash
mkdir -p .github/workflows
cp node_modules/@fail-kit/cli/templates/github-action.yml .github/workflows/fail-audit.yml
```

Set `AGENT_ENDPOINT` as a repository secret.

### GitLab CI

Include the template in your `.gitlab-ci.yml`:

```yaml
include:
  - local: 'node_modules/@fail-kit/cli/templates/gitlab-ci.yml'

variables:
  AGENT_ENDPOINT: "https://your-agent.example.com/eval/run"
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

## Links

- [Documentation](https://fail-kit.dev/docs)
- [Failure Modes Catalog](https://fail-kit.dev/docs/failure-modes)
- [Receipt Standard](https://fail-kit.dev/docs/receipt-standard)
- [GitHub](https://github.com/fail-kit/fail-kit)

---

**No trace, no ship.**
