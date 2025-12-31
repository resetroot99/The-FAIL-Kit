# Audit Runbook

**The F.A.I.L. Kit v1.0**  
**Forensic Audit of Intelligent Logic**

---

## Overview

This runbook walks you through running your first forensic audit in 60 minutes.

**NOTE:** This guide uses the F.A.I.L. Kit CLI tool. For the alternative approach using the open-source Ali's Book of Fail harness, see the end of this document.

---

## Prerequisites

Before you start:
- [ ] Your AI system is deployed (locally or remotely)
- [ ] You have exposed the `/eval/run` endpoint (see AUDIT_GUIDE.md)
- [ ] You have tested the endpoint with one manual request
- [ ] You have Node.js 18+ installed
- [ ] You have the F.A.I.L. Kit installed

---

## Quick Start with F.A.I.L. Kit CLI

### Step 1: Initialize (2 minutes)

```bash
cd /path/to/The-FAIL-Kit
fail-audit init
```

This creates `fail-audit.config.json`:
```json
{
  "endpoint": "http://localhost:8000/eval/run",
  "timeout": 30000,
  "cases_dir": "./cases",
  "output_dir": "./audit-results"
}
```

Edit the endpoint to point to your agent.

### Step 2: Run the Audit (5-10 minutes)

Run all levels:
```bash
fail-audit run
```

Or run specific levels:
```bash
fail-audit run --level smoke          # Level 1 only
fail-audit run --level interrogation  # Level 2 only
fail-audit run --level red-team       # Level 3 only
```

Or run specific cases:
```bash
fail-audit run --case CONTRACT_0003
```

### Step 3: Generate Report (1 minute)

```bash
fail-audit report audit-results/audit-TIMESTAMP.json
```

Open `audit-results/audit-TIMESTAMP.html` in a browser.

### Critical Failures (Block Deployment)
- `CONTRACT_0003_no_claimed_actions` - Agent claims actions without receipts
- `CONTRACT_0201_no_fake_file_write` - Agent claims file writes without proof
- `CONTRACT_0202_no_fake_money_transfer` - Agent claims money transfers without proof
- `AGENT_0008_phantom_success` - Agent claims success when tool failed
- `ADV_PII_*` - Agent leaks PII

**If any of these fail, do not deploy.**

### High-Severity Failures (Fix Before Production)
- `CONTRACT_0004_refusal_correctness` - Agent accepts unsafe requests
- `CONTRACT_0005_over_refusal` - Agent refuses benign requests
- `AGENT_0007_state_amnesia` - Agent loses state across steps
- `SHIFT_0001_missing_attachment` - Agent proceeds without evidence
- `RAG_0002_citation_hallucination` - Agent fabricates citations

**Fix these in the next sprint.**

### Medium-Severity Failures (Monitor and Improve)
- `AGENT_0011_wrong_tool_selection` - Agent picks suboptimal tool
- `SHIFT_EDGE_*` - Edge case handling issues
- `RAG_0007_semantic_drift` - Agent does not filter results well

**Track these over time. Fix when you can.**

---

## Step 7: Generate the Executive Report (10 minutes)

Use the provided report template to create an executive-friendly summary.

Copy the template:

```bash
cp /path/to/fail-kit/templates/SAMPLE_REPORT.md \
   audit-report-$(date +%Y%m%d).md
```

Fill in:
1. **Agent Overview** - What your system does
2. **Detected Failure Modes** - Which cases failed
3. **Severity** - Critical/High/Medium breakdown
4. **Risk Assessment** - What could go wrong in production
5. **Recommended Gates** - What to block, what to monitor

See `templates/SAMPLE_REPORT.md` for the full template.

---

## Step 8: Decide What to Fix (Ongoing)

Not all failures are equal. Prioritize like this:

### Fix Immediately (Before Next Deploy)
- Any critical failure (CONTRACT_0003, AGENT_0008, ADV_PII_*)
- Any failure that could cause legal/financial/safety harm

### Fix in Next Sprint
- High-severity failures (refusal calibration, state management)
- Failures that degrade user experience

### Monitor and Improve
- Medium-severity failures (suboptimal tool selection, edge cases)
- Failures that are low-probability

### Do NOT Fix
- False positives (if you are certain the test is wrong, not your system)
- Test cases that do not apply to your use case

**Important:** Most teams over-fix. Do not try to get 100% pass rate. Focus on the failures that matter.

---

## Common Issues and Fixes

### Issue: All tests fail with "Connection refused"
**Fix:** Check that your system is running and the BASE_URL is correct.

### Issue: Tests fail with "Invalid response format"
**Fix:** Your system is not returning the expected JSON structure. See AUDIT_GUIDE.md for the contract.

### Issue: Tests pass locally but fail in CI
**Fix:** Enable deterministic mode (`options.deterministic = true`) and set `temperature = 0`.

### Issue: Tests are flaky (pass sometimes, fail sometimes)
**Fix:** Your system is non-deterministic. Use replay mode or fix the randomness.

### Issue: Test says "claimed action without receipt" but I did provide actions
**Fix:** Check that your `actions[]` field includes `input_hash` and `output_hash`. Without hashes, the action cannot be verified.

---

## Running in CI/CD

To integrate this audit into your CI/CD pipeline:

### GitHub Actions Example

```yaml
name: F.A.I.L. Kit Audit

on:
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install harness
        run: |
          git clone https://github.com/resetroot99/Alis-book-of-fail.git
          cd Alis-book-of-fail
          pip install -e .
      
      - name: Start system
        run: |
          # Start your AI system here
          docker-compose up -d
          sleep 10
      
      - name: Run Level 1 - Smoke Test
        run: |
          cp fail-kit/cases/level-1-smoke-test/*.yaml Alis-book-of-fail/eval/cases/custom/
          book-of-fail --adapter http --suite custom --base-url http://localhost:8000
      
      - name: Run Level 2 - Interrogation
        run: |
          cp fail-kit/cases/level-2-interrogation/*.yaml Alis-book-of-fail/eval/cases/custom/
          book-of-fail --adapter http --suite custom --base-url http://localhost:8000
      
      - name: Check for critical failures
        run: |
          python scripts/check_critical_failures.py
```

---

## Replay Mode (For Deterministic CI)

If you do not want to run your system in CI (no network, no secrets, no flakes), use replay mode.

### Step 1: Capture Traces Locally

Run the audit locally with trace capture:

```bash
book-of-fail --adapter http --suite custom --base-url $BASE_URL --capture-traces
```

This saves the responses in `eval/fixtures/baseline_traces/`.

### Step 2: Run Replay Mode in CI

In CI, run without your system:

```bash
book-of-fail --adapter replay --suite custom
```

This replays the captured traces. Same tests, no network calls, no flakes.

**When to use replay mode:**
- You want deterministic tests in CI
- You do not want to deploy your system in CI
- You want to test trace validation logic without running the model

**When NOT to use replay mode:**
- You changed your system and need fresh responses
- You are testing a new feature
- You want to catch regressions in real behavior

---

## Frequency Recommendations

**How often should you run this audit?**

### First Audit (Now)
Run all 50 cases across 3 levels. Get a baseline. Fix critical failures.

### Pre-Deploy (Every Release)
Run all 50 cases. Block deploy if critical failures exist.

### Nightly (Staging)
Run all 50 cases. Track trends. Fix high-severity failures.

### Weekly (Production)
Run Level 1 (10 smoke test cases) against production. Verify gates are working.

### Post-Incident (Always)
Convert the incident into a regression test. Add to your suite. Run it.

---

## What NOT to Do

**Do not try to get 100% pass rate.**  
Some failures are acceptable. Focus on the ones that matter.

**Do not fix the tests.**  
If a test fails, fix your system, not the test. The test is the spec.

**Do not skip critical failures.**  
"We will fix it later" means "we will ship a liability."

**Do not run audits without acting on results.**  
Audits without follow-up are theater. Fix what matters. Ignore the rest.

---

## Next Steps

After your first audit:

1. **Fix critical failures** - Block deployment until these pass
2. **Implement gates** - Use the enforcement code (see `enforcement/`)
3. **Add to CI** - Run the audit on every PR
4. **Convert incidents to tests** - Every production failure becomes a regression test
5. **Run quarterly reviews** - Audit your audit. Are you testing the right things?

---

## Getting Help

**If you are stuck on integration:**  
Email us. We offer The Guided Audit ($4,500) where we integrate and run the audit for you.

**If you found a bug in a test case:**  
Email us. We will fix it and send you an updated version.

**If you need custom test cases:**  
Email us. We offer The Enterprise Gate ($15,000/year) for custom test development.

---

## Appendix: Using the Open-Source Harness

The F.A.I.L. Kit CLI is the recommended approach. However, you can also use the open-source Ali's Book of Fail harness directly.

### Why use the open-source harness?

- You want to customize the evaluation logic
- You need the full 170+ test case library (not just the curated 50)
- You want to contribute test cases back to the community
- You need Python-specific features

### Setup

```bash
git clone https://github.com/resetroot99/Alis-book-of-fail.git
cd Alis-book-of-fail
pip install -e .
```

### Running tests

```bash
book-of-fail --adapter http --suite contract --base-url http://localhost:8000
```

See the Ali's Book of Fail documentation for full details.

---

**No trace, no ship.**
