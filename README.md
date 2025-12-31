# F.A.I.L. Kit
## Forensic Audit of Intelligent Logic

![The Interrogation](assets/fail_kit_interrogation.png)

**Version 1.0** | [Quick Start](#quick-start) | [Installation](#installation) | [Documentation](#documentation) | [Support](#support)

> **"Because your agent is a fluent liar and it's time for an interrogation."**

---

## Table of Contents

- [What This Is](#what-this-is)
- [What You Get](#what-you-get)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [The Three Audit Levels](#the-three-audit-levels)
- [Who Should Use This](#who-should-use-this)
- [The Receipt Standard](#the-receipt-standard)
- [Failure Modes](#failure-modes)
- [Documentation](#documentation)
- [Integration Examples](#integration-examples)
- [Advisory Services](#advisory-services)
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
- ✅ Response arrives on time
- ✅ Format is correct
- ✅ Language is fluent
- ❌ **Action never happened**

This kit tests for that specific failure mode.

[↑ Back to top](#table-of-contents)

---

## What You Get

### Core Components

| Component | Description |
|-----------|-------------|
| **50 Curated Test Cases** | 3-level forensic audit (not generic benchmarks) |
| **CLI Tool** | `fail-audit` command for running audits & reports |
| **Receipt Schema** | Standard for proving actions happened |
| **Gate Middleware** | Express, FastAPI, Next.js enforcement |
| **Integration Guides** | LangChain, CrewAI, AutoGPT, Semantic Kernel, OpenAI |
| **Reference Agent** | Working example with correct receipts |
| **Audit Runbook** | 60-minute first audit walkthrough |
| **Report Template** | Executive-friendly findings format |
| **Custom Case Generator** | Auto-generate tests for your tools |

### What Makes This Different

- ❌ **Not a model benchmark** - We test system behavior, not GPT vs Claude
- ❌ **Not a vibe check** - Evidence required, not "helpful and harmless"
- ❌ **Not compliance theater** - If your AI can't prove what it did, it fails
- ✅ **Execution integrity** - Did the agent actually do what it claims?

[↑ Back to top](#table-of-contents)

---

## Quick Start

### 1. Install (5 minutes)

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

### 2. Test with Reference Agent (2 minutes)

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

- **Node.js 18+** (for CLI and Express middleware)
- **Python 3.9+** (optional, for Python enforcement gates)

### Platform Support

- ✅ macOS
- ✅ Linux
- ✅ Windows (PowerShell)

### Quick Install

```bash
# Option 1: Run from source
cd cli/
npm install
./src/index.js --help

# Option 2: Global install
cd cli/
npm install
npm link
fail-audit --help

# Option 3: Manual setup
# See INSTALL.md for step-by-step instructions
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

## Who Should Use This

### ✅ Use This Kit If:

- You're building AI agents that **use tools** (APIs, databases, file systems)
- You need to **prove** your agent did what it claims (not just that it sounds convincing)
- You've had incidents where agents **claimed success but didn't complete the action**
- You're responsible for AI **safety, reliability, or compliance**

### ❌ Don't Use This Kit If:

- You're building a **chatbot that only answers questions** (no actions)
- You're looking for **model benchmarks** or generic red-teaming
- You want **someone else to do the work** (that's the advisory tier)

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
**Severity:** 🔴 **Critical** (blocks deployment)

### 2. Partial Execution

**Symptom:** Tool invoked, output ignored  
**Detection:** Receipt exists, but output not used in final response  
**Severity:** 🟠 **High** (monitor closely)

### 3. Fabricated Result

**Symptom:** Plausible tool output, but no invocation record  
**Detection:** No receipt, but response includes tool-like data  
**Severity:** 🔴 **Critical** (blocks deployment)

### 4. Non-Replayable Trace

**Symptom:** Cannot reproduce decision from trace data  
**Detection:** Replay mode produces different result  
**Severity:** 🟡 **Medium** (fix before production)

### 5. Refusal Miscalibration

**Symptom:** Agent refuses benign requests or accepts unsafe ones  
**Detection:** Policy field doesn't match expected behavior  
**Severity:** 🟠 **High** (safety and UX issue)

See [FAILURE_MODES.md](FAILURE_MODES.md) for detailed descriptions, examples, and remediation.

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
| [templates/SAMPLE_REPORT.md](templates/SAMPLE_REPORT.md) | Audit report template |

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
| **LangChain** | Python + JavaScript | ✅ Complete |
| **CrewAI** | Python | ✅ Complete |
| **AutoGPT** | Python | ✅ Complete |
| **Haystack** | Python | ✅ Complete |
| **Semantic Kernel** | Python + C# | ✅ Complete |
| **Bare OpenAI API** | Python + Node.js | ✅ Complete |

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

Need help running your first audit or building custom test cases?

| Tier | Price | What You Get |
|------|-------|--------------|
| **The Core Kit** | $990 | Self-service. 50 cases, CLI, docs, middleware. |
| **The Guided Audit** | $4,500 | We run the audit and present findings (2-hour call). |
| **The Enterprise Gate** | $15,000/year | Custom test development + quarterly check-ins. |

**Contact:** [ali@jakvan.io](mailto:ali@jakvan.io)

<!--
## Purchase

**Price: $990** (one-time payment, lifetime access)

[![Buy Now](https://www.paypalobjects.com/en_US/i/btn/btn_buynowCC_LG.gif)](https://www.paypal.com/ncp/payment/XXXXXXXXXX)

After purchase, you receive:
- Instant download link
- Lifetime access to updates
- Email support for integration questions
-->

[↑ Back to top](#table-of-contents)

---

## License & Support

### License

**Commercial - Internal Use Only**

You may:
- ✅ Use it to audit your own AI systems
- ✅ Share results within your organization
- ✅ Implement the provided code in production

You may NOT:
- ❌ Redistribute the kit to third parties
- ❌ Resell or repackage the kit

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

---

## What to Do After Your Audit

### If Everything Passes

Congratulations. You've built something rare. Email us at [ali@jakvan.io](mailto:ali@jakvan.io). We'll study your system.

### If Some Tests Fail

**Good. That's the point.**

Use the report template to:
1. ✅ Identify **critical failures** (block deployment)
2. ⚠️ Prioritize **medium/high failures** (fix in next sprint)
3. 📊 Monitor **low-severity failures** (track over time)

See [AUDIT_RUNBOOK.md](AUDIT_RUNBOOK.md) for guidance on interpreting results.

### If You Need Help

- 📖 **Read the docs** - Everything you need is included
- 💬 **Ask questions** - [ali@jakvan.io](mailto:ali@jakvan.io)
- 🚀 **Advisory services** - We can run the audit for you

[↑ Back to top](#table-of-contents)

---

## Version History

**v1.0.0** (December 31, 2025)
- ✅ Initial production release
- ✅ 50 curated test cases (execution integrity suite)
- ✅ CLI tool with init, run, report commands
- ✅ Custom case generator
- ✅ 6 framework integration examples
- ✅ Drop-in middleware (Express, FastAPI, Next.js)
- ✅ Reference agent with correct receipt format
- ✅ 3-level audit structure
- ✅ Windows/macOS/Linux support
- ✅ End-to-end tested and validated

---

## Quick Links

- 🚀 [Quick Start](#quick-start) - Get running in 5 minutes
- 📦 [Installation](#installation) - Setup instructions
- 📚 [Documentation](#documentation) - All guides and references
- 🔧 [Integration Examples](#integration-examples) - Framework code
- 💼 [Advisory Services](#advisory-services) - Get help
- 📄 [License](#license--support) - Terms and support

---

**No trace, no ship.**

---

*The F.A.I.L. Kit v1.0 | [GitHub](https://github.com/resetroot99/The-FAIL-Kit) | [Ali's Book of Fail](https://github.com/resetroot99/Alis-book-of-fail) | [Contact](mailto:ali@jakvan.io)*
