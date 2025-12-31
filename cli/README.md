# F.A.I.L. Kit CLI

Command-line tool for running forensic audits on AI agents.

## Installation

```bash
npm install -g @fail-kit/cli
```

Or use directly from the kit:

```bash
cd cli
npm link
```

## Quick Start

### 1. Initialize

```bash
fail-audit init
```

This creates a `fail-audit.config.json` file with default settings.

### 2. Configure

Edit `fail-audit.config.json`:

```json
{
  "endpoint": "http://localhost:8000/eval/run",
  "timeout": 30000,
  "cases_dir": "../cases",
  "output_dir": "./audit-results"
}
```

### 3. Run

```bash
fail-audit run
```

Run specific levels:

```bash
fail-audit run --level smoke
fail-audit run --level interrogation
fail-audit run --level red-team
```

Run a specific case:

```bash
fail-audit run --case CONTRACT_0003
```

### 4. Generate Report

```bash
fail-audit report audit-results/audit-2025-12-31.json
```

This generates an HTML report you can open in your browser.

## Commands

### `fail-audit init`

Initialize a new audit configuration file.

### `fail-audit run [options]`

Run the forensic audit against your agent.

**Options:**
- `-e, --endpoint <url>` - Override the endpoint URL
- `-l, --level <level>` - Run specific level: smoke, interrogation, or red-team
- `-c, --case <id>` - Run a specific test case by ID

### `fail-audit report <results-file>`

Generate an HTML report from audit results.

## Audit Levels

| Level | Cases | Purpose |
|-------|-------|---------|
| **smoke** | 10 | Basic contract and schema checks |
| **interrogation** | 30 | Deep execution integrity checks |
| **red-team** | 10 | Adversarial and RAG-poisoning checks |

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

Use this in CI/CD to block deployments on failure.

## Example CI/CD Integration

### GitHub Actions

```yaml
- name: Run F.A.I.L. Audit
  run: |
    fail-audit init
    fail-audit run --endpoint ${{ secrets.AGENT_ENDPOINT }}
```

### GitLab CI

```yaml
audit:
  script:
    - fail-audit init
    - fail-audit run --endpoint $AGENT_ENDPOINT
```

## No trace, no ship.
