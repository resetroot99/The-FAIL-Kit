# Installation Guide

## Prerequisites

- **Node.js 18+** (for CLI tool and Express middleware)
  - Windows: Download from [nodejs.org](https://nodejs.org/) and run installer
  - macOS: `brew install node` or download from nodejs.org
  - Linux: `sudo apt install nodejs npm` or use nvm
- **Python 3.9+** (for Python enforcement gates and FastAPI middleware)
  - Windows: Download from [python.org](https://python.org/) and check "Add to PATH"
  - macOS: `brew install python3` or use pyenv
  - Linux: `sudo apt install python3 python3-pip`
- **curl** or **wget** (for testing)
  - Windows: Available in PowerShell 7+ or install Git Bash
  - macOS/Linux: Pre-installed

## Platform-Specific Notes

### Windows Users

- Use PowerShell or Git Bash (not cmd.exe)
- Replace `/` with `\` in file paths when needed
- Use `$env:VARIABLE="value"` instead of `export VARIABLE="value"`
- Replace `open` with `start` for opening files

Example:
```powershell
# Windows PowerShell
$env:BASE_URL="http://localhost:8000"
start audit-results/report.html
```

## Install the CLI Tool

The CLI is the fastest way to run audits. Three installation options:

### Option 1: Run from Source (Recommended)

```bash
cd cli/
npm install
node src/index.js --help
```

### Option 2: Global Install via npm link

```bash
cd cli/
npm install
npm link
fail-audit --help
```

### Option 3: Add to PATH

```bash
# Add this to your ~/.bashrc or ~/.zshrc
export PATH="$PATH:/path/to/The-FAIL-Kit/cli/src"

# Then run directly
fail-audit --help
```

## Verify Installation

```bash
fail-audit --version
# Should output: 1.0.0

fail-audit --help
# Should show available commands
```

## Install Middleware (Optional)

Only install if you want to enforce gates in your production agent.

### Express (Node.js)

```bash
cd middleware/express
npm install
```

Then import in your Express app:

```javascript
const failGates = require('./middleware/express');
app.use('/agent', failGates());
```

### FastAPI (Python)

```bash
cd middleware/fastapi
pip install fastapi pydantic
```

Then import in your FastAPI app:

```python
from fail_gates import FailGatesMiddleware
app.add_middleware(FailGatesMiddleware)
```

### Next.js (TypeScript)

Copy `middleware/nextjs/index.ts` to your Next.js project and import:

```typescript
import { failGatesMiddleware } from './lib/fail-gates';
export const middleware = failGatesMiddleware;
```

## Install Enforcement Code (Optional)

The enforcement code is standalone TypeScript and Python modules. No installation required. Just copy the files to your project:

```bash
cp enforcement/TRACE_GATES.ts /path/to/your/project/
cp enforcement/TRACE_GATES.py /path/to/your/project/
```

## Test the Installation

### 1. Start the Reference Agent

```bash
cd examples/reference-agent
npm install
npm start
```

The agent runs on `http://localhost:8000`.

### 2. Run Your First Audit

In another terminal:

```bash
cd /path/to/The-FAIL-Kit
fail-audit init
fail-audit run
```

You should see output like:

```
F.A.I.L. Kit - Running Forensic Audit

Loading test cases...
✓ Found 50 cases

Running audit against http://localhost:8000/eval/run

[1/50] CONTRACT_0001_output_schema... PASS
[2/50] CONTRACT_0002_no_secret_leak... PASS
...
```

### 3. Generate the Report

```bash
fail-audit report audit-results/results.json
```

This creates `audit-results/report.html`. Open it in a browser:

- **macOS:** `open audit-results/report.html`
- **Linux:** `xdg-open audit-results/report.html`
- **Windows:** `start audit-results/report.html`

## Troubleshooting

### "command not found: fail-audit"

The CLI is not in your PATH. Use Option 1 (run from source) or Option 2 (npm link).

### "Cannot find module 'chalk'"

Run `npm install` in the `cli/` directory.

### "ECONNREFUSED" when running audit

The agent is not running. Start the reference agent first:

```bash
cd examples/reference-agent
npm start
```

### "No test cases found"

The `cases_dir` in your config is wrong. Edit `fail-audit.config.json` and set:

```json
{
  "cases_dir": "/absolute/path/to/The-FAIL-Kit/cases"
}
```

## Next Steps

Read the [QUICKSTART.md](QUICKSTART.md) for a 5-minute tutorial on running your first audit.
