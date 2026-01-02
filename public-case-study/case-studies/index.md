# Case Studies

Real-world audits of popular AI agent frameworks using The F.A.I.L. Kit.

## Overview

We audited 10 popular AI agent repositories to verify their execution integrity. The results reveal a consistent pattern: **most agents claim actions without proof**.

### Aggregate Statistics

| Metric | Value |
|--------|-------|
| **Repositories Audited** | 10 |
| **Average Pass Rate** | 37% |
| **Missing Receipts** | 8/10 repos |
| **Silent Failures** | 7/10 repos |
| **Ready for Production** | 2/10 repos |

## Production Frameworks

### BabyAGI
**Stars:** ~20k | **Pass Rate:** 33% | **Status:** FAILED

Autonomous task management agent. Failed due to missing task execution receipts and silent tool failures.

[View Case Study](babyagi.md) | [Audit Script](../../scripts/audit-babyagi.sh)

---

### AutoGPT
**Stars:** ~160k | **Pass Rate:** 25% | **Status:** FAILED

The original autonomous AI agent. Failed due to no execution verification, silent command failures, and missing audit trails.

[View Case Study](autogpt.md) | [Audit Script](../../scripts/audit-autogpt.sh)

---

### SuperAGI
**Stars:** ~15k | **Pass Rate:** 40% | **Status:** FAILED

Dev-first autonomous AI framework. Better than average but still missing critical receipt generation.

[View Case Study](superagi.md) | [Audit Script](../../scripts/audit-superagi.sh)

---

### AgentGPT
**Stars:** ~30k | **Pass Rate:** 35% | **Status:** FAILED

Browser-based autonomous AI agents. Failed due to client-side execution without verification.

[View Case Study](agentgpt.md) | [Audit Script](../../scripts/audit-agentgpt.sh)

---

### GPT Researcher
**Stars:** ~10k | **Pass Rate:** 50% | **Status:** NEEDS_REVIEW

Autonomous research agent. Best performer due to structured output, but missing error escalation.

[View Case Study](gpt-researcher.md) | [Audit Script](../../scripts/audit-gpt-researcher.sh)

---

## LangChain Examples

### LangChain ReAct Agent
**Source:** Official Cookbook | **Pass Rate:** 45% | **Status:** FAILED

Standard ReAct implementation. Good structure but no receipt generation.

[View Case Study](langchain-react.md)

---

### LangChain SQL Agent
**Source:** Official Examples | **Pass Rate:** 30% | **Status:** FAILED

Database query agent. Failed due to missing query receipts and no error handling.

[View Case Study](langchain-sql.md)

---

### LangChain Multi-Agent
**Source:** Community | **Pass Rate:** 25% | **Status:** FAILED

Multi-agent orchestration. Complex failure patterns across agent handoffs.

[View Case Study](langchain-multiagent.md)

---

### LangGraph RAG Agent
**Source:** Official Examples | **Pass Rate:** 55% | **Status:** NEEDS_REVIEW

RAG with tool use. Best LangChain example but still missing critical checks.

[View Case Study](langgraph-rag.md)

---

### LangChain Custom Tools
**Source:** Tutorial | **Pass Rate:** 20% | **Status:** FAILED

Custom tool implementation. Worst performer - no verification of any kind.

[View Case Study](langchain-custom-tools.md)

---

## Key Findings

### Common Failure Patterns

1. **Missing Receipts (80%)** - Agents claim actions without proof
2. **Silent Failures (70%)** - Tools fail but agent claims success
3. **No Error Escalation (60%)** - Errors not surfaced to users
4. **Missing Audit Trails (90%)** - No record of what happened

### Why This Matters

In production, these failures mean:
- **No debugging** - Can't trace what went wrong
- **No compliance** - Can't prove what the agent did
- **Silent failures** - Users think tasks completed when they didn't
- **No recovery** - Can't replay or fix failed operations

### The Good News

All failures are fixable:
- Add receipt generation (~30 lines of code)
- Add error handling (~20 lines of code)
- Add pre-response validation (~10 lines of code)

See individual case studies for specific fixes.

## Reproducibility

All audits can be reproduced using the scripts in the `scripts/` directory.

```bash
# Clone this repo
git clone https://github.com/resetroot99/fail-kit-site.git
cd fail-kit-site/scripts

# Run any audit
./audit-babyagi.sh

# View the report
open ../public/audits/babyagi-audit.html
```

## Methodology

1. **Clone** - Clone target repo locally (no fork)
2. **Integrate** - Add F.A.I.L. Kit adapter locally (no commits)
3. **Audit** - Run automated test suite
4. **Document** - Create detailed case study
5. **Publish** - Share findings with community

We do not modify the original repositories. All integration is done locally for audit purposes only.

## Contributing

Want to add a case study?

1. Pick a repo to audit
2. Follow the [audit template](../scripts/README.md)
3. Create a case study using [the template](_template.md)
4. Submit a PR

## Questions?

- [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)
- [Documentation](/docs)

---

*Last updated: January 2026*

**No trace, no ship.**
