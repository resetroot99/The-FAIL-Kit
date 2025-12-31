# Quickstart Guide

Run your first forensic audit in 5 minutes.

## Step 1: Install the CLI

```bash
cd cli/
npm install
```

## Step 2: Start the Reference Agent

```bash
cd examples/reference-agent
npm install
npm start
```

Leave this running. The agent listens on `http://localhost:8000`.

## Step 3: Initialize the Audit

Open a new terminal:

```bash
cd /path/to/The-FAIL-Kit
./cli/src/index.js init
```

This creates `fail-audit.config.json`. The default config already points to the reference agent, so no edits needed.

## Step 4: Run the Audit

```bash
./cli/src/index.js run
```

You will see output like:

```
F.A.I.L. Kit - Running Forensic Audit

Loading test cases...
✓ Found 50 cases

Running audit against http://localhost:8000/eval/run

Smoke Test (Level 1):
[1/10] CONTRACT_0001_output_schema... PASS (342ms)
[2/10] CONTRACT_0002_no_secret_leak... PASS (298ms)
...

Interrogation (Level 2):
[11/40] AGENT_0004_action_without_confirm... PASS (412ms)
...

Red Team (Level 3):
[41/50] ADV_0001_injection_user... PASS (523ms)
...

Audit complete!
✓ 48 passed
✗ 2 failed

Results saved to: audit-results/results.json
```

## Step 5: Generate the Report

```bash
./cli/src/index.js report audit-results/results.json
```

This creates `audit-results/report.html`. Open it in a browser:

```bash
# macOS
open audit-results/report.html

# Linux
xdg-open audit-results/report.html

# Windows PowerShell
start audit-results/report.html
```

You will see:

- **Executive Summary** - Pass/fail counts, severity breakdown
- **Failure Details** - What failed and why
- **Recommendations** - How to fix the issues
- **Full Test Results** - Every case with timing and evidence

## What Just Happened

You ran 50 curated test cases against the reference agent. The audit checked:

1. **Contract compliance** - Does the agent follow the output schema?
2. **Execution integrity** - Does it prove actions with receipts?
3. **Adversarial resistance** - Can it be tricked into leaking secrets or bypassing policies?

The reference agent is designed to pass most tests. To see failures, modify the agent to skip receipts or fake actions.

## Next Steps

### Audit Your Own Agent

Edit `fail-audit.config.json` and change the endpoint:

```json
{
  "endpoint": "https://your-agent.com/eval/run",
  "timeout": 30000,
  "cases_dir": "./cases"
}
```

Then run `fail-audit run` again.

### Enforce Gates in Production

Copy the middleware to your agent:

**Express:**
```javascript
const failGates = require('./middleware/express');
app.use('/agent', failGates());
```

**FastAPI:**
```python
from fail_gates import FailGatesMiddleware
app.add_middleware(FailGatesMiddleware)
```

**Next.js:**
```typescript
import { failGatesMiddleware } from './lib/fail-gates';
export const middleware = failGatesMiddleware;
```

### Customize the Audit

Edit `fail-audit.config.json` to run only specific levels:

```json
{
  "levels": {
    "smoke_test": true,
    "interrogation": true,
    "red_team": false
  }
}
```

Or run specific cases:

```bash
./cli/src/index.js run --cases CONTRACT_0003,AGENT_0004
```

## Common Issues

**"ECONNREFUSED"** - The agent is not running. Start it with `npm start`.

**"No test cases found"** - The `cases_dir` path is wrong. Use an absolute path.

**"All tests failed"** - Your agent is not returning the expected format. Check the [AUDIT_GUIDE.md](AUDIT_GUIDE.md) for the required response schema.

## What to Do with the Results

1. **Share the report** with your VP of Engineering or CTO
2. **Fix the failures** by adding receipts and proof to your agent
3. **Run the audit weekly** to catch regressions
4. **Add gates to production** to block unproven claims

No trace, no ship.
