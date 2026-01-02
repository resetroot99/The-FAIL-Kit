# F.A.I.L. Kit CLI Cheatsheet

Quick reference for the most common F.A.I.L. Kit CLI commands.

## Installation

```bash
npm install -g @fail-kit/cli
fail-audit --version
```

---

## Essential Commands

### Initialize Configuration
```bash
fail-audit init                    # Interactive setup
fail-audit init --yes              # Use defaults (CI mode)
fail-audit init --framework express --install
```

### Scan Codebase
```bash
fail-audit scan                    # Scan and generate test cases
fail-audit scan --verbose          # Show detailed results
fail-audit scan --run              # Scan then immediately audit
fail-audit scan --dry-run          # Preview only
```

### Run Audit
```bash
fail-audit run                     # Run all tests (JSON output)
fail-audit run --format dashboard  # Interactive dashboard ⭐
fail-audit run --format html       # HTML report
fail-audit run --format junit --ci # CI/CD mode
```

### Generate Reports
```bash
fail-audit report results.json                    # HTML report
fail-audit report results.json --format dashboard # Interactive
fail-audit report results.json --format markdown  # Markdown
```

### Troubleshoot
```bash
fail-audit doctor                  # Diagnose issues
fail-audit run --verbose           # Detailed output
```

---

## Test Levels

```bash
fail-audit run --level smoke          # Basic validation
fail-audit run --level interrogation  # Behavioral tests
fail-audit run --level red-team       # Adversarial tests
```

---

## Common Options

| Option | Short | Description |
|--------|-------|-------------|
| `--format <type>` | `-f` | Output format: `dashboard`, `html`, `json`, `junit`, `markdown` |
| `--output <file>` | `-o` | Output file path |
| `--endpoint <url>` | `-e` | Override endpoint URL |
| `--level <level>` | `-l` | Test level: `smoke`, `interrogation`, `red-team` |
| `--case <id>` | `-c` | Run specific test case |
| `--verbose` | `-v` | Detailed output |
| `--ci` | | CI mode (no colors) |
| `--quiet` | | Minimal output |
| `--yes` | `-y` | Skip prompts, use defaults |

---

## Quick Workflows

### First-Time Setup
```bash
fail-audit init
fail-audit scan
fail-audit run --format dashboard
```

### Daily Development
```bash
fail-audit scan --run
# or
fail-audit run --format dashboard
```

### CI/CD Pipeline
```bash
fail-audit init --yes
fail-audit scan
fail-audit run --ci --format junit
```

### Custom Test Cases
```bash
fail-audit generate --tools tools.json
fail-audit run
```

---

## Output Formats

| Format | Extension | Use Case |
|--------|-----------|----------|
| `dashboard` | `.html` | Interactive decision-grade report ⭐ |
| `html` | `.html` | Detailed debugging report |
| `json` | `.json` | Raw data / programmatic |
| `junit` | `.xml` | CI/CD integration |
| `markdown` | `.md` | PR comments / docs |

---

## Configuration File

`fail-audit.config.json`:
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

---

## Environment Variables

```bash
export FAIL_AUDIT_ENDPOINT=http://localhost:3000/api/eval/run
export FAIL_AUDIT_TIMEOUT=60000
export FAIL_AUDIT_CASES_DIR=./test-cases
export FAIL_AUDIT_OUTPUT_DIR=./results
```

---

## Exit Codes

- `0` = All tests passed ✓
- `1` = Tests failed or error ✗

---

## Tips & Tricks

### Run Specific Test
```bash
fail-audit run --case CONTRACT_0001
```

### Save to Custom Location
```bash
fail-audit run --output ./reports/my-audit.html
```

### Override Endpoint
```bash
fail-audit run --endpoint http://staging.api.com/eval/run
```

### Scan Specific Directory
```bash
fail-audit scan --path ./src/agents
```

### Generate Custom Cases
```bash
# 1. Create tools.json
cat > tools.json << 'EOF'
{
  "tools": [
    {"name": "send_email", "description": "Send email", "risk": "medium"},
    {"name": "delete_user", "description": "Delete user", "risk": "critical"}
  ]
}
EOF

# 2. Generate test cases
fail-audit generate --tools tools.json

# 3. Run tests
fail-audit run
```

---

## Keyboard Shortcuts (Dashboard)

| Key | Action |
|-----|--------|
| `j` | Next failure |
| `k` | Previous failure |
| `c` | Copy details |
| `?` | Show help |

---

## Getting Help

```bash
fail-audit --help              # All commands
fail-audit <command> --help    # Specific command
fail-audit doctor              # Diagnose issues
```

---

## Links

- [Full CLI Reference](./CLI_REFERENCE.md)
- [Quick Start Guide](../QUICKSTART.md)
- [Integration Guide](../INTEGRATION.md)
- [CI/CD Guide](./CI_CD_GUIDE.md)

---

**No trace, no ship.**
