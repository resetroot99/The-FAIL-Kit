# F.A.I.L.
## Forensic Audit of Intelligent Logic

![The Interrogation](assets/fail_kit_interrogation.png)

**Version 1.0**  
**License: Commercial - Internal Use Only**

---

> **"Because your agent is a fluent liar and it's time for an interrogation."**

Most agents pass the vibe check but fail the forensic audit. This kit is the interrogation your agent can't talk its way out of.

---

## What This Is

Most agent failures in production are not hallucinations. They are claims of action without evidence.

Your agent says it sent the email. Updated the database. Transferred the money. Did it? Or did it just sound confident?

This kit helps you detect, classify, and block execution claims without proof.

---

## What You Get

This kit includes:

1. **50 Curated Test Cases** - Organized into 3 forensic audit levels (not generic model benchmarks)
2. **Audit Runbook** - Step-by-step process for running your first audit in 60 minutes
3. **Report Template** - Executive-friendly format for presenting findings
4. **Receipt Schema** - The standard for proving an action happened
5. **Gate Enforcement Code** - TypeScript and Python implementations for blocking unproven claims
6. **Failure Mode Catalog** - Shared vocabulary for your team

---

## The Three Audit Levels

| Level | Name | Cases | Purpose |
|-------|------|-------|---------|
| 1 | The Smoke Test | 10 | Basic contract and schema checks. If they fail this, the audit stops. |
| 2 | The Interrogation | 30 | Deep execution integrity and tool-use checks. This is the core of the kit. |
| 3 | The Red Team | 10 | Adversarial and RAG-poisoning checks. Advanced section. |

---

## What This Is NOT

This is not a model benchmark. We do not rank GPT vs Claude vs Llama. We test system behavior.

This is not a vibe check. "Helpful and harmless" is not a gate. Evidence is.

This is not compliance theater. If your AI cannot prove what it saw and did, it fails.

This is not a consulting engagement. This is a self-service kit. You run it. You interpret the results. You decide what to fix.

---

## Who Should Use This

**You should use this kit if:**
- You are building or deploying AI agents that use tools (APIs, databases, file systems, external services)
- You need to prove your agent did what it claims (not just that it sounds convincing)
- You have had an incident where an agent claimed success but did not complete the action
- You are responsible for AI safety, reliability, or compliance

**You should NOT use this kit if:**
- You are building a chatbot that only answers questions (no actions)
- You are looking for model benchmarks or generic red-teaming
- You want someone else to do the work (that is the advisory tier)

---

## Quick Start

### Step 1: Integrate (1 hour)

Expose one endpoint: `POST /eval/run`

Your endpoint should accept a test case and return what your agent saw, did, and said.

**Minimum viable response:**
```json
{
  "outputs": {
    "final_text": "I sent the email to your boss.",
    "decision": "PASS"
  },
  "actions": [
    {
      "tool": "email_sender",
      "status": "success",
      "input_hash": "sha256:abc123...",
      "output_hash": "sha256:def456..."
    }
  ]
}
```

See `AUDIT_GUIDE.md` for the full contract.

### Step 2: Run (60 minutes)

Execute the audit using the provided CLI tool:

```bash
fail-kit --adapter http --suite execution-integrity --base-url http://localhost:8000
```

Or integrate with your CI/CD pipeline. See `AUDIT_RUNBOOK.md` for details.

### Step 3: Interpret (30 minutes)

Use the report template (`SAMPLE_REPORT.md`) to understand:
- What failed
- Why it matters
- What to fix first

We include severity ratings and remediation guidance for each failure mode.

### Step 4: Enforce (ongoing)

Implement the gate enforcement code (`TRACE_GATES.ts` or `TRACE_GATES.py`) to block unproven execution claims in production.

**Core rule:** Your agent cannot claim success unless it provides a receipt.

Missing receipt forces: `ABSTAIN`, `NEEDS_REVIEW`, or `ESCALATE`.

---

## What You Will Learn

After running this audit, you will know:

- **Claimed actions without receipts** - Agent says "I did X" but has no trace evidence
- **Partial execution** - Agent invoked a tool but ignored the output
- **Fabricated results** - Agent produced plausible output without calling the tool
- **Non-replayable traces** - Agent cannot reproduce its decision from trace data
- **Refusal calibration** - Agent refuses correctly (without over-refusing benign requests)

You will also know which failures are critical (block deployment) and which are acceptable risks (monitor and improve).

---

## File Guide

| File | Purpose |
|------|---------|
| `README.md` | This file (overview and quick start) |
| `AUDIT_GUIDE.md` | Integration contract and field reference |
| `AUDIT_RUNBOOK.md` | Step-by-step audit process |
| `FAILURE_MODES.md` | Catalog of execution integrity failures |
| `RECEIPT_SCHEMA.json` | The standard for proving actions |
| `enforcement/TRACE_GATES.ts` | TypeScript enforcement layer |
| `enforcement/TRACE_GATES.py` | Python enforcement layer |
| `enforcement/QUICKSTART.md` | Quick start for production gates |
| `templates/SAMPLE_REPORT.md` | Example audit report (template) |
| `cases/INDEX.md` | Test case index organized by audit level |
| `assets/` | Marketing and documentation images |
| `LICENSE.txt` | Commercial use license |

---

## Why Normal Evals Miss This

Most evaluation frameworks test whether your agent sounds smart. They check:
- Did it return valid JSON?
- Did the sentiment match?
- Did the user complain?

They do not check:
- Did it actually send the email?
- Did it actually update the database?
- Can it prove what it did?

This is the gap. Your agent can sound confident, format its response correctly, and still fail to take the action it claims.

In traditional software, failures are visible. Exceptions. Error codes. Stack traces.

In AI, failures look like success. The response arrives on time. The format is correct. The language is fluent. The only problem is that the action never happened.

This kit tests for that specific failure mode.

---

## The Receipt Standard

The core concept is simple: If an agent claims it took an action, it must provide a receipt.

A receipt includes:
- **action_id** - Unique identifier for this action
- **tool_name** - Which tool was invoked
- **inputs_hash** - Hash of the inputs (proves what was sent)
- **output_hash** - Hash of the output (proves what was received)
- **timestamp** - When the action occurred
- **trace_id** - Link to the full trace

If the agent cannot produce this, it did not act. Or it acted in a way that cannot be audited. Either way, that is a failure.

See `RECEIPT_SCHEMA.json` for the full specification.

---

## Failure Modes

This kit tests for five primary failure modes:

### 1. Claimed Action Without Receipt
**Symptom:** Agent says "I updated X" but provides no trace evidence  
**Detection:** Missing `actions[]` field or empty array  
**Severity:** Critical (blocks deployment)

### 2. Partial Execution
**Symptom:** Tool invoked, output ignored  
**Detection:** Action receipt exists, but output is not used in final response  
**Severity:** High (monitor closely)

### 3. Fabricated Result
**Symptom:** Plausible tool output, but no invocation record  
**Detection:** No action receipt, but response includes tool-like data  
**Severity:** Critical (blocks deployment)

### 4. Non-Replayable Trace
**Symptom:** Cannot reproduce decision from trace data  
**Detection:** Replay mode produces different result  
**Severity:** Medium (fix before production)

### 5. Refusal Miscalibration
**Symptom:** Agent refuses benign requests or accepts unsafe ones  
**Detection:** Policy field does not match expected behavior  
**Severity:** High (safety and UX issue)

See `FAILURE_MODES.md` for detailed descriptions, examples, and remediation guidance.

---

## Integration Checklist

Before running your first audit, verify:

- [ ] Endpoint deployed: `POST /eval/run`
- [ ] Returns `outputs.final_text`
- [ ] Returns `outputs.decision`
- [ ] Returns `actions[]` with receipts (if agent uses tools)
- [ ] Tested with one sample case manually
- [ ] Ready to run full audit

See `AUDIT_GUIDE.md` for the complete integration contract.

---

## What to Do After the Audit

**If everything passes:**  
Congratulations. You have built something rare. Email us. We will study your system and possibly refund you because you have solved a problem most teams have not.

**If some tests fail:**  
Good. That is the point. Use the report template to:
1. Identify critical failures (block deployment)
2. Prioritize medium/high failures (fix in next sprint)
3. Monitor low-severity failures (track over time)

See `AUDIT_RUNBOOK.md` for detailed guidance on interpreting results and prioritizing fixes.

**If you need help:**  
The kit is self-service by design. All documentation is included. If you find bugs or have questions about integration, contact details are in the purchase confirmation email.

---

## License

This kit is licensed for internal use only. You may:
- Use it to audit your own AI systems
- Share results within your organization
- Implement the provided code in your production systems

You may NOT:
- Redistribute the kit to third parties
- Use it to audit client systems without permission
- Resell or repackage the kit

See `LICENSE.txt` for full terms.

---

## Support

**Documentation:** All files in this kit are self-contained. Start with `AUDIT_RUNBOOK.md` for step-by-step guidance.

**Questions:** Email support address (provided in purchase confirmation).

**Bugs or Issues:** If you find an error in the test cases or documentation, email us. We will fix it and send you an updated version.

**Feature Requests:** This is a curated kit, not a platform. We update it based on user feedback, but it is not customizable per-customer.

---

## About

This kit is based on **Ali's Book of Fail**, an open-source evaluation harness and doctrine for AI systems.

The open-source project includes:
- 172 test cases across 9 categories
- A 24-chapter playbook on AI failure modes
- A working Python harness (MIT licensed)

The F.A.I.L. Kit extracts the highest-signal cases for execution integrity and packages them with the runbook, templates, and enforcement code you need to run an audit this week.

**Open-source repo:** github.com/resetroot99/Alis-book-of-fail  
**Documentation:** See repo for full doctrine and case library

---

## Version History

**v1.0 (Current)**
- Initial release
- 50 curated test cases (execution integrity suite)
- 3-level audit structure (Smoke Test, Interrogation, Red Team)
- Audit runbook and report template
- Receipt schema and gate enforcement code
- Failure mode catalog

---

## Next Steps

1. Read `AUDIT_GUIDE.md` to understand the integration contract
2. Expose the `/eval/run` endpoint (takes 1 hour)
3. Run your first audit using `AUDIT_RUNBOOK.md`
4. Interpret results using `SAMPLE_REPORT.md`
5. Implement gates using `TRACE_GATES.ts` or `TRACE_GATES.py`

**Do not overthink this.** The first audit will reveal what matters. Fix the critical failures. Monitor the rest. Iterate.

---

**No trace, no ship.**
