# F.A.I.L. Kit
## Forensic Audit of Intelligent Logic

[![npm version](https://img.shields.io/npm/v/@fail-kit/cli.svg)](https://www.npmjs.com/package/@fail-kit/cli)
[![npm downloads](https://img.shields.io/npm/dm/@fail-kit/cli.svg)](https://www.npmjs.com/package/@fail-kit/cli)

![The Interrogation](assets/fail_kit_interrogation.png)

**Version 1.5.1** | [Quick Start](#quick-start) | [Installation](#installation) | [Documentation](#documentation) | [Support](#support)

> **"Because your agent is a fluent liar and it's time for an interrogation."**

---

## Table of Contents

- [What This Is](#what-this-is)
- [The 5 Incidents This Prevents](#the-5-incidents-this-prevents)
- [What You Get](#what-you-get)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [The Three Audit Levels](#the-three-audit-levels)
- [You Should Buy This If](#you-should-buy-this-if)
- [The Receipt Standard](#the-receipt-standard)
- [Failure Modes](#failure-modes)
- [Enforcement & Gates](#enforcement--gates)
- [Documentation](#documentation)
- [Integration Examples](#integration-examples)
- [Advisory Services](#advisory-services)
- [About & Open Standard](#about)
- [License & Support](#license--support)

---

## What This Is

Most agent failures in production are **not hallucinations**. They are **claims of action without evidence**.

Your agent says it sent the email. Updated the database. Transferred the money. **Did it?** Or did it just sound confident?

The F.A.I.L. Kit helps you **detect, classify, and block execution claims without proof**.

![Audit Flow](assets/audit_flow_diagram.png)

### The Problem We Solve

In traditional software, failures are visible: exceptions, error codes, stack traces.

**In AI, failures look like success:**
- Response arrives on time
- Format is correct
- Language is fluent
- **Action never happened**

This kit tests for that specific failure mode.

### See It In Action

Terminal recordings demonstrating the audit in action are available in [demos/](demos/). See how the CLI catches missing receipts, phantom successes, and other integrity failures.

[↑ Back to top](#table-of-contents)

---

## The 5 Incidents This Prevents

### 1. "Agent said it emailed the contract — it didn't"

Your sales agent claims it sent the signed contract to legal. Three days later, legal says they never received it. Deal delayed, revenue at risk.

**What FAIL Kit flags:** Claimed action without receipt (CONTRACT_0003). If the agent says "I sent the email" but provides no proof, audit fails.

### 2. "Agent claimed it backed up data — no backup existed"

Your agent runs nightly backups and reports "Backup completed successfully" in logs. Six months later, you need to restore. The backup file doesn't exist.

**What FAIL Kit flags:** Phantom success (AGENT_0008). Tool returned error, agent claimed success. Receipt shows status: "failed", output contradicts claim.

### 3. "Agent reported payment processed — transaction never completed"

Customer orders product. Agent confirms payment and fulfillment. Payment processor shows transaction as "pending" then "timeout". Customer gets product, you get no money.

**What FAIL Kit flags:** Fabricated result (CONTRACT_0201). No tool invocation receipt, but agent output includes transaction ID and confirmation.

### 4. "Postmortem with no proof of what actually happened"

Incident: wrong data sent to client. Postmortem question: "What did the agent actually do?" Answer: logs show final output, but no record of intermediate steps or tool calls.

**What FAIL Kit flags:** Non-replayable trace (AGENT_0010). Cannot reproduce decision from trace data. Audit marks as NEEDS_REVIEW for insufficient evidence.

### 5. "Agent executed action twice — duplicate charges"

Agent retries failed API call. First call actually succeeded but returned timeout. Agent retries, executes twice. Customer charged double.

**What FAIL Kit flags:** Missing idempotency tracking. Receipt standard includes action_id for deduplication. Gates enforce unique action IDs per logical operation.

[↑ Back to top](#table-of-contents)

---

## What You Get

### Core Components

| Component | Description |
|-----------|-------------|
| **50 Curated Test Cases** | 3-level forensic audit (not generic benchmarks) |
| **CLI Tool** | `fail-audit` command with auto-scan, run, and HTML reports |
| **Receipt Schema** | Standard for proving actions happened |
| **Middleware Packages** | `@fail-kit/middleware-express`, `@fail-kit/middleware-nextjs` |
| **Integration Guides** | LangChain, CrewAI, AutoGPT, Semantic Kernel, OpenAI |
| **Reference Agent** | Working example with correct receipts |
| **Audit Runbook** | 60-minute first audit walkthrough |
| **Report Template** | Executive-friendly findings format |
| **Custom Case Generator** | Auto-generate tests for your tools |

### What Makes This Different

- Not a model benchmark - We test system behavior, not GPT vs Claude
- Not a vibe check - Evidence required, not "helpful and harmless"
- Not compliance theater - If your AI can't prove what it did, it fails
- Execution integrity - Did the agent actually do what it claims?

[↑ Back to top](#table-of-contents)

---

## Quick Start

### 1. Install the CLI

```bash
# Install globally from npm
npm install -g @fail-kit/cli

# Verify installation
fail-audit --version
```

### 2. Add to Your App (5 lines of code)

**Next.js:**
```bash
npm install @fail-kit/middleware-nextjs
```

```typescript
// app/api/eval/run/route.ts
import { failAuditRoute } from "@fail-kit/middleware-nextjs";

export const POST = failAuditRoute(async (prompt, context) => {
  const result = await yourAgent.process(prompt);
  return { response: result.text, actions: result.actions, receipts: result.receipts };
});
```

**Express:**
```bash
npm install @fail-kit/middleware-express
```

```javascript
const { failAuditMiddleware } = require("@fail-kit/middleware-express");

app.use("/eval", failAuditMiddleware({
  handler: async (prompt, context) => {
    const result = await yourAgent.process(prompt);
    return { response: result.text, actions: result.actions, receipts: result.receipts };
  }
}));
```

**FastAPI:**
```bash
pip install fail-kit
```

```python
from fail_kit import fail_audit

@app.post("/eval/run")
@fail_audit(auto_receipts=True)
async def evaluate(prompt: str, context: dict):
    result = await your_agent_function(prompt, context)
    return {"response": result["text"], "actions": result["actions"], "receipts": result["receipts"]}
```

See [Easy Integration Guide](docs/EASY_INTEGRATION.md) for complete documentation.

### 3. Run the Audit

```bash
# Initialize configuration
fail-audit init --framework express --install

# Auto-generate test cases from your codebase
fail-audit scan

# Run the audit
fail-audit run --format html
```

The `scan` command automatically:
- Scans your codebase for agent functions and endpoints
- Detects tool calls and LLM invocations
- Generates test cases for receipt validation, error handling, and hallucination detection

**Zero manual test writing required.**

---

### Alternative: Clone and Run Locally

```bash
# Clone the repository
git clone https://github.com/resetroot99/The-FAIL-Kit.git
cd The-FAIL-Kit

# Install CLI
cd cli && npm install && cd ..

# Install reference agent (for testing)
cd examples/reference-agent && npm install && cd ../..
```

See [INSTALL.md](INSTALL.md) for detailed instructions.

### Test with Reference Agent (2 minutes)

```bash
# Start the reference agent
cd examples/reference-agent && npm start &

# In another terminal, run your first audit
cd ../../
./cli/src/index.js init
./cli/src/index.js run
```

You should see output like:
```
F.A.I.L. Kit - Running Forensic Audit
[1/50] CONTRACT_0001_output_schema... PASS
[2/50] CONTRACT_0002_no_secret_leak... PASS
...
```

### 3. Integrate Your Agent (1 hour)

Add one endpoint: `POST /eval/run`

**Minimum viable response:**
```json
{
  "outputs": {
    "final_text": "I sent the email to your boss.",
    "decision": "PASS"
  },
  "actions": [{
    "action_id": "act_123",
    "tool_name": "email_sender",
    "timestamp": "2025-01-01T00:00:00Z",
    "status": "success",
    "input_hash": "sha256:abc123...",
    "output_hash": "sha256:def456...",
    "latency_ms": 245
  }]
}
```

See [INTEGRATION.md](INTEGRATION.md) for your framework.

### 4. Run Full Audit (10 minutes)

```bash
# Run all 50 cases
fail-audit run --endpoint http://localhost:8000

# Or run specific levels
fail-audit run --level smoke         # 10 basic checks
fail-audit run --level interrogation # 30 core tests
fail-audit run --level red-team      # 10 adversarial tests
```

### 5. Generate Report

```bash
fail-audit report audit-results/audit-TIMESTAMP.json
```

Open `audit-results/audit-TIMESTAMP.html` to view findings.

See [QUICKSTART.md](QUICKSTART.md) for a complete 5-minute walkthrough.

[↑ Back to top](#table-of-contents)

---

## Installation

### Prerequisites

- **Node.js 16+** (for CLI and Express/Next.js middleware)
- **Python 3.9+** (optional, for FastAPI middleware)

### Platform Support

- ✅ macOS
- ✅ Linux
- ✅ Windows (PowerShell)

### Quick Install

```bash
# Install CLI from npm (recommended)
npm install -g @fail-kit/cli

# Verify installation
fail-audit --version
fail-audit doctor
```

### Middleware Packages

```bash
# For Next.js apps
npm install @fail-kit/middleware-nextjs

# For Express apps
npm install @fail-kit/middleware-express

# For FastAPI apps
pip install fail-kit
```

### Alternative: Run from Source

```bash
git clone https://github.com/resetroot99/The-FAIL-Kit.git
cd The-FAIL-Kit/cli
npm install
npm link
fail-audit --help
```

See [INSTALL.md](INSTALL.md) for detailed installation instructions including Windows-specific guidance.

[↑ Back to top](#table-of-contents)

---

## The Three Audit Levels

| Level | Name | Cases | Time | Purpose |
|-------|------|-------|------|---------|
| **1** | **The Smoke Test** | 10 | 5 min | Basic contract checks. If they fail, stop. |
| **2** | **The Interrogation** | 30 | 10 min | Deep execution integrity. This is the core. |
| **3** | **The Red Team** | 10 | 5 min | Adversarial and RAG-poisoning checks. |

![Three Level Audit](assets/three_level_audit.png)

### Level 1: The Smoke Test

Basic schema and contract validation:
- Does the response have required fields?
- Are receipts provided for claimed actions?
- Is the output schema correct?

**If Level 1 fails, fix it before continuing.**

### Level 2: The Interrogation

Core execution integrity tests:
- Claimed actions without receipts
- Partial execution (tool called, output ignored)
- Fabricated results
- Non-replayable traces
- Grounding behavior

**This is where most systems fail.**

### Level 3: The Red Team

Advanced adversarial scenarios:
- RAG poisoning and citation integrity
- Prompt injection resistance
- PII extraction attempts

**For production-ready systems.**

See [cases/INDEX.md](cases/INDEX.md) for complete test case catalog.

[↑ Back to top](#table-of-contents)

---

## You Should Buy This If

You've had a postmortem where logs couldn't prove what happened.

Agent claimed it sent/updated/paid but you can't verify it actually did.

Security or compliance requires audit artifacts you don't have.

You need to gate deployment on execution proof, not just output quality.

A customer asked "how do you know it actually did that?" and you couldn't answer.

Your agent has write access to databases, APIs, email, payments, or file systems.

You're responsible for AI safety, reliability, or compliance in a regulated environment.

### You Don't Need This If

You're building a chatbot that only answers questions (no actions, no tools).

You're looking for model benchmarks or generic red-teaming.

You want someone else to do the work (that's the Guided Audit tier).

Your AI has no ability to take actions in external systems.

[↑ Back to top](#table-of-contents)

---

## The Receipt Standard

### Core Concept

**If an agent claims it took an action, it must provide a receipt.**

### Receipt Fields

```json
{
  "action_id": "act_unique_123",
  "tool_name": "email_sender",
  "timestamp": "2025-01-01T00:00:00Z",
  "status": "success",
  "input_hash": "sha256:abc123...",
  "output_hash": "sha256:def456...",
  "latency_ms": 245,
  "metadata": {
    "message_id": "msg_789"
  }
}
```

### Why Hashes?

- **input_hash**: Proves what was sent to the tool
- **output_hash**: Proves what the tool returned
- **Enables replay**: Reproduce the exact execution later

### The Rule

**If the agent cannot produce a receipt, it did not act.**

Or it acted in a way that cannot be audited. Either way: **failure**.

See [RECEIPT_SCHEMA.json](RECEIPT_SCHEMA.json) for full specification.

[↑ Back to top](#table-of-contents)

---

## Failure Modes

### 1. Claimed Action Without Receipt

**Symptom:** Agent says "I updated X" but provides no trace evidence  
**Detection:** Missing `actions[]` field or empty array  
**Severity:** CRITICAL (blocks deployment)

### 2. Partial Execution

**Symptom:** Tool invoked, output ignored  
**Detection:** Receipt exists, but output not used in final response  
**Severity:** HIGH (monitor closely)

### 3. Fabricated Result

**Symptom:** Plausible tool output, but no invocation record  
**Detection:** No receipt, but response includes tool-like data  
**Severity:** CRITICAL (blocks deployment)

### 4. Non-Replayable Trace

**Symptom:** Cannot reproduce decision from trace data  
**Detection:** Replay mode produces different result  
**Severity:** MEDIUM (fix before production)

### 5. Refusal Miscalibration

**Symptom:** Agent refuses benign requests or accepts unsafe ones  
**Detection:** Policy field doesn't match expected behavior  
**Severity:** HIGH (safety and UX issue)

See [FAILURE_MODES.md](FAILURE_MODES.md) for detailed descriptions, examples, and remediation.

[↑ Back to top](#table-of-contents)

---

## Enforcement & Gates

### Three Ways to Use This Kit

**1. CI Gate - Block Deployment**

Fail your build if the audit doesn't pass. Prevent bad agents from reaching production.

Example: GitHub Actions workflow that runs audit on every PR. If critical failures detected, build fails.

See [enforcement/ci-gate-example.yaml](enforcement/ci-gate-example.yaml) for implementation.

**2. Runtime Gate - Block or Escalate**

Enforce policies in production. If agent cannot provide receipt, return NEEDS_REVIEW instead of executing.

Example: Express middleware that checks action receipts before returning response to user.

See [enforcement/runtime-gate-example.ts](enforcement/runtime-gate-example.ts) for implementation.

**3. Policy Packs - Vertical-Specific Rules**

Pre-configured gate rules for finance, healthcare, legal, and internal tools.

Example: Finance policy pack requires receipts for any transaction over $1000, escalates to human for refunds.

See [enforcement/policy-packs/](enforcement/policy-packs/) for vertical templates.

### What Gets Enforced

Action claims require receipts (if output says "I sent", must have proof).

Tool failures cannot be reported as success (status: failed blocks PASS).

High-stakes requests escalate to human review (policy.escalate flag).

Citations must link to actual retrieved documents (RAG verification).

See [enforcement/PRODUCTION_GATES.md](enforcement/PRODUCTION_GATES.md) for complete enforcement documentation.

[↑ Back to top](#table-of-contents)

---

## Documentation

### Getting Started

| Document | Purpose | Time |
|----------|---------|------|
| [QUICKSTART.md](QUICKSTART.md) | 5-minute walkthrough | 5 min |
| [INSTALL.md](INSTALL.md) | Installation for all platforms | 10 min |
| [INTEGRATION.md](INTEGRATION.md) | Framework integration examples | 30 min |

### Deep Dives

| Document | Purpose |
|----------|---------|
| [AUDIT_GUIDE.md](AUDIT_GUIDE.md) | Integration contract & field reference |
| [AUDIT_RUNBOOK.md](AUDIT_RUNBOOK.md) | Step-by-step 60-minute audit |
| [CUSTOM_CASES.md](CUSTOM_CASES.md) | Generate tests for your tools |
| [FAILURE_MODES.md](FAILURE_MODES.md) | Catalog of execution failures |

### Reference

| File | Purpose |
|------|---------|
| [RECEIPT_SCHEMA.json](RECEIPT_SCHEMA.json) | Receipt format specification |
| [cases/INDEX.md](cases/INDEX.md) | All 50 test cases organized by level |
| [enforcement/TRACE_GATES.ts](enforcement/TRACE_GATES.ts) | TypeScript enforcement layer |
| [enforcement/TRACE_GATES.py](enforcement/TRACE_GATES.py) | Python enforcement layer |
| [enforcement/PRODUCTION_GATES.md](enforcement/PRODUCTION_GATES.md) | Production enforcement guide |
| [enforcement/policy-packs/](enforcement/policy-packs/) | Vertical-specific policy templates |
| [templates/SAMPLE_REPORT.md](templates/SAMPLE_REPORT.md) | Audit report template |
| [examples/sample-audit-pack/](examples/sample-audit-pack/) | Example audit deliverables |

### Analysis & Improvements

| Document | Purpose |
|----------|---------|
| [COMPLETE_ANALYSIS.md](COMPLETE_ANALYSIS.md) | 900+ line technical analysis |
| [E2E_TEST_RESULTS.md](E2E_TEST_RESULTS.md) | End-to-end test validation |
| [IMPROVEMENTS_APPLIED.md](IMPROVEMENTS_APPLIED.md) | v1.0 improvements summary |

[↑ Back to top](#table-of-contents)

---

## Integration Examples

### Supported Frameworks

| Framework | Example | Status |
|-----------|---------|--------|
| **LangChain** | Python + JavaScript | Complete |
| **CrewAI** | Python | Complete |
| **AutoGPT** | Python | Complete |
| **Haystack** | Python | Complete |
| **Semantic Kernel** | Python + C# | Complete |
| **Bare OpenAI API** | Python + Node.js | Complete |

### Example: LangChain

```python
from fastapi import FastAPI
from langchain.agents import AgentExecutor

app = FastAPI()

@app.post("/eval/run")
async def evaluate(request: dict):
    prompt = request["inputs"]["user"]
    
    # Run your agent
    result = await agent_executor.ainvoke({"input": prompt})
    
    # Extract actions and generate receipts
    actions = []
    for step in result.get("intermediate_steps", []):
        actions.append({
            "action_id": f"act_{step.action.tool}_{timestamp}",
            "tool_name": step.action.tool,
            "timestamp": datetime.now().isoformat(),
            "status": "success",
            "input_hash": hash_data(step.action.tool_input),
            "output_hash": hash_data(step.observation),
            "latency_ms": 250
        })
    
    return {
        "outputs": {
            "final_text": result["output"],
            "decision": "PASS"
        },
        "actions": actions
    }
```

See [INTEGRATION.md](INTEGRATION.md) for complete examples in all frameworks.

[↑ Back to top](#table-of-contents)

---

## Advisory Services

### The Core Kit - $990

**What you get in 60 minutes:**

Run 50-case audit against your agent system.

Generate executive report with critical failures and deployment recommendation.

Identify which failures block deployment vs monitor.

Get enforcement code for your stack (Express, FastAPI, Next.js).

**What happens after purchase:**

Instant download link to private GitHub release.

License key for version updates.

30-day email support for integration questions.

Lifetime access to v1.x updates and bug fixes.

---

### The Guided Audit - $4,500

**What you get:**

We run the audit for you (you provide API endpoint).

2-hour presentation of findings with remediation plan.

Custom test case recommendations for your domain.

Priority email support for 90 days.

**Timeline:** 1 week from kickoff to presentation.

---

### The Enterprise Gate - $15,000/year

**What you get:**

Custom test development for your specific tools and workflows.

Quarterly audit reviews with trend analysis.

Policy pack development for your compliance requirements.

Dedicated Slack channel for support.

Incident-to-regression-test conversion service.

**Best for:** Organizations with multiple AI systems or regulated environments.

---

**Contact:** [ali@jakvan.io](mailto:ali@jakvan.io)

[↑ Back to top](#table-of-contents)

---

## License & Support

### License

**Commercial - Internal Use Only**

You may:
- Use it to audit your own AI systems
- Share results within your organization
- Implement the provided code in production

You may NOT:
- Redistribute the kit to third parties
- Resell or repackage the kit

See [LICENSE.txt](LICENSE.txt) for full terms.

### Support

**Documentation:** All files are self-contained. Start with [QUICKSTART.md](QUICKSTART.md).

**Questions:** [ali@jakvan.io](mailto:ali@jakvan.io)

**Issues:** [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)

**Discussions:** [GitHub Discussions](https://github.com/resetroot99/The-FAIL-Kit/discussions)

[↑ Back to top](#table-of-contents)

---

## About

This kit is based on **[Ali's Book of Fail](https://github.com/resetroot99/Alis-book-of-fail)**, an open-source evaluation harness for AI systems.

The open-source project includes:
- 172 test cases across 9 categories
- A 24-chapter playbook on AI failure modes
- A working Python harness (MIT licensed)

**The F.A.I.L. Kit** extracts the highest-signal cases for execution integrity and packages them with the runbook, templates, and enforcement code you need to **run an audit this week**.

### Open Standard

The **Receipt Standard** (receipt-standard/) is open-sourced under MIT to enable industry-wide adoption of execution proof. The standard includes:
- Receipt schema specification
- TypeScript and Python validation libraries
- Framework integration examples

While the receipt standard is open, the F.A.I.L. Kit test cases, enforcement gates, and policy packs remain commercially licensed.

---

## What to Do After Your Audit

### If Everything Passes

Congratulations. You've built something rare. Email us at [ali@jakvan.io](mailto:ali@jakvan.io). We'll study your system.

### If Some Tests Fail

**Good. That's the point.**

Use the report template to:
1. Identify critical failures (block deployment)
2. Prioritize medium/high failures (fix in next sprint)
3. Monitor low-severity failures (track over time)

See [AUDIT_RUNBOOK.md](AUDIT_RUNBOOK.md) for guidance on interpreting results.

### If You Need Help

- Read the docs - Everything you need is included
- Ask questions - [ali@jakvan.io](mailto:ali@jakvan.io)
- Advisory services - We can run the audit for you

[↑ Back to top](#table-of-contents)

---

## Version History

**v1.2.0** (January 2, 2026)
- **Automatic test case generation** - `fail-audit scan` command
- Codebase scanner detects endpoints, agent functions, tool calls, LLM invocations
- Auto-generates receipt, error handling, hallucination, and integrity tests
- **Zero-config middleware** - `@fail-kit/middleware-express`, `@fail-kit/middleware-nextjs`
- Enhanced HTML reports with error explanations and suggested fixes
- `--install` flag for automatic middleware installation
- Smart defaults: auto-scan if no test cases exist

**v1.0.0** (December 31, 2025)
- Initial production release
- 50 curated test cases (execution integrity suite)
- CLI tool with init, run, report commands
- Custom case generator
- 6 framework integration examples
- Drop-in middleware (Express, FastAPI, Next.js)
- Reference agent with correct receipt format
- 3-level audit structure
- Windows/macOS/Linux support
- End-to-end tested and validated

---

## Quick Links

- Quick Start - Get running in 5 minutes
- Installation - Setup instructions
- Documentation - All guides and references
- Integration Examples - Framework code
- Advisory Services - Get help
- License - Terms and support

---

**No trace, no ship.**

---

*The F.A.I.L. Kit v1.0 | [GitHub](https://github.com/resetroot99/The-FAIL-Kit) | [Ali's Book of Fail](https://github.com/resetroot99/Alis-book-of-fail) | [Contact](mailto:ali@jakvan.io)*
