# Audit Runbook

**Agent Integrity Audit Kit v1.0**

---

## Overview

This runbook walks you through running your first audit in 60 minutes. No prior experience required. Just follow the steps.

---

## Prerequisites

Before you start:
- [ ] Your AI system is deployed (locally or remotely)
- [ ] You have exposed the `/eval/run` endpoint (see AUDIT_GUIDE.md)
- [ ] You have tested the endpoint with one manual request
- [ ] You have Python 3.10+ installed
- [ ] You have cloned the open-source harness repo

---

## Step 1: Install the Harness (5 minutes)

Clone and install the open-source evaluation harness:

```bash
git clone https://github.com/resetroot99/Alis-book-of-fail.git
cd Alis-book-of-fail
pip install -e .
```

Verify installation:

```bash
book-of-fail --help
```

You should see the CLI help output.

---

## Step 2: Configure Your System (10 minutes)

The harness needs to know where your system is.

**Option A: Local system**
```bash
export BASE_URL="http://localhost:8000"
```

**Option B: Remote system**
```bash
export BASE_URL="https://your-system.example.com"
```

**Option C: With authentication**
```bash
export BASE_URL="https://your-system.example.com"
export AUTH_TOKEN="your-api-key"
```

Test connectivity:

```bash
curl -X POST $BASE_URL/eval/run \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "test",
    "inputs": {"user": "Hello"},
    "context": {},
    "fixtures": {},
    "options": {}
  }'
```

You should get a valid JSON response with `outputs.final_text` and `outputs.decision`.

---

## Step 3: Run Your First Case (5 minutes)

Copy one test case from the kit to the harness:

```bash
cp /path/to/agent-integrity-audit-kit/cases/CONTRACT_0003_no_claimed_actions.yaml \
   Alis-book-of-fail/eval/cases/contract/
```

Run it:

```bash
book-of-fail --adapter http --suite contract --base-url $BASE_URL --case CONTRACT_0003
```

**What to expect:**
- The harness sends the test case to your system
- Your system processes it and returns a response
- The harness validates the response against the expected behavior
- You see: PASS or FAIL

**If it passes:** Your system correctly handled this case.  
**If it fails:** See the error message for what went wrong.

---

## Step 4: Run the Full Execution Integrity Suite (20 minutes)

Copy all 50 cases from the kit to the harness:

```bash
cp /path/to/agent-integrity-audit-kit/cases/*.yaml \
   Alis-book-of-fail/eval/cases/custom/
```

Run the full suite:

```bash
book-of-fail --adapter http --suite custom --base-url $BASE_URL
```

This will run all 50 cases. Depending on your system latency, this takes 10-30 minutes.

**What to watch for:**
- Pass rate (how many cases passed)
- Critical failures (CONTRACT_*, AGENT_0008, ADV_PII_*)
- High-severity failures (SHIFT_*, RAG_*)

The harness outputs a summary at the end:

```
=== Summary ===
Total: 50
Passed: 42
Failed: 8
Pass Rate: 84%
```

---

## Step 5: Interpret the Results (10 minutes)

The harness creates a report in `eval/reports/`.

Open the latest report:

```bash
cat eval/reports/latest.json
```

Look for:

### Critical Failures (Block Deployment)
- `CONTRACT_0003_no_claimed_actions` - Agent claims actions without receipts
- `CONTRACT_0201_no_fake_file_write` - Agent claims file writes without proof
- `CONTRACT_0202_no_fake_money_transfer` - Agent claims money transfers without proof
- `AGENT_0008_phantom_success` - Agent claims success when tool failed
- `ADV_PII_0001_extraction_attempt` - Agent leaks PII

**If any of these fail, do not deploy.**

### High-Severity Failures (Fix Before Production)
- `CONTRACT_0004_refusal_correctness` - Agent accepts unsafe requests
- `CONTRACT_0005_over_refusal` - Agent refuses benign requests
- `AGENT_0007_state_amnesia` - Agent loses state across steps
- `SHIFT_0001_missing_primary` - Agent proceeds without evidence
- `RAG_0002_citation_hallucination` - Agent fabricates citations

**Fix these in the next sprint.**

### Medium-Severity Failures (Monitor and Improve)
- `AGENT_0011_wrong_tool_selection` - Agent picks suboptimal tool
- `SHIFT_0007_schema_drift` - Agent struggles with schema changes
- `RAG_0007_irrelevant_retrieval` - Agent does not filter results well

**Track these over time. Fix when you can.**

---

## Step 6: Generate the Executive Report (10 minutes)

Use the provided report template to create an executive-friendly summary.

Copy the template:

```bash
cp /path/to/agent-integrity-audit-kit/templates/SAMPLE_REPORT.md \
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

## Step 7: Decide What to Fix (Ongoing)

Not all failures are equal. Prioritize like this:

### Fix Immediately (Before Next Deploy)
- Any critical failure (CONTRACT_0003, AGENT_0008, ADV_PII_*)
- Any failure that could cause legal/financial/safety harm

### Fix in Next Sprint
- High-severity failures (refusal calibration, state management)
- Failures that degrade user experience

### Monitor and Improve
- Medium-severity failures (suboptimal tool selection, schema handling)
- Failures that are edge cases or low-probability

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
name: Agent Integrity Audit

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
      
      - name: Run audit
        run: |
          cp agent-integrity-audit-kit/cases/*.yaml Alis-book-of-fail/eval/cases/custom/
          book-of-fail --adapter http --suite custom --base-url http://localhost:8000
      
      - name: Check for critical failures
        run: |
          # Parse report and fail if critical cases failed
          python scripts/check_critical_failures.py
```

### GitLab CI Example

```yaml
audit:
  stage: test
  script:
    - git clone https://github.com/resetroot99/Alis-book-of-fail.git
    - cd Alis-book-of-fail && pip install -e .
    - docker-compose up -d && sleep 10
    - cp ../agent-integrity-audit-kit/cases/*.yaml eval/cases/custom/
    - book-of-fail --adapter http --suite custom --base-url http://localhost:8000
  artifacts:
    paths:
      - Alis-book-of-fail/eval/reports/
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
Run all 50 cases. Get a baseline. Fix critical failures.

### Pre-Deploy (Every Release)
Run all 50 cases. Block deploy if critical failures exist.

### Nightly (Staging)
Run all 50 cases. Track trends. Fix high-severity failures.

### Weekly (Production)
Run a subset (10-15 critical cases) against production. Verify gates are working.

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
Email us. We offer live audit services where we integrate and run the audit for you.

**If you found a bug in a test case:**  
Email us. We will fix it and send you an updated version.

**If you need custom test cases:**  
Email us. We offer advisory services for custom test development.

---

**No trace, no ship.**
