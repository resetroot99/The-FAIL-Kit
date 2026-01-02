# Aggregate Findings: 10 AI Agent Audits

## Executive Summary

We audited 10 popular AI agent frameworks and examples using The F.A.I.L. Kit. The results reveal a consistent pattern: **most AI agents cannot prove what they did**.

### Key Statistics

| Metric | Value |
|--------|-------|
| Repositories Audited | 10 |
| Average Pass Rate | 37% |
| Production Ready | 0/10 |
| Needs Review | 3/10 |
| Failed | 7/10 |
| Missing Receipts | 10/10 |
| Silent Failures | 7/10 |

### The Bottom Line

**Zero agents were production-ready out of the box.** Every framework we tested lacks the execution verification needed for production deployment.

---

## Audit Results Summary

### Production Frameworks

| Framework | Stars | Pass Rate | Status | Key Issue |
|-----------|-------|-----------|--------|-----------|
| BabyAGI | 20k | 33% | FAILED | No task execution receipts |
| AutoGPT | 160k | 25% | FAILED | Unverified command execution |
| SuperAGI | 15k | 40% | FAILED | Partial logging, no crypto proof |
| AgentGPT | 30k | 35% | FAILED | Client-side execution unverified |
| GPT Researcher | 10k | 50% | NEEDS_REVIEW | Missing source verification |

### LangChain Examples

| Example | Pass Rate | Status | Key Issue |
|---------|-----------|--------|-----------|
| ReAct Agent | 45% | FAILED | No tool execution receipts |
| SQL Agent | 30% | FAILED | Unverified database queries |
| Multi-Agent | 25% | FAILED | Unverified agent handoffs |
| LangGraph RAG | 55% | NEEDS_REVIEW | Missing retrieval receipts |
| Custom Tools | 20% | FAILED | No verification of any kind |

---

## Common Failure Patterns

### Pattern 1: Missing Action Receipts (100% of repos)

**Every framework tested** claims to perform actions without cryptographic proof.

```
Agent claims: "I sent the email"
Evidence provided: None
```

**Impact:**
- Cannot verify actions occurred
- No audit trail for compliance
- Cannot debug failures
- Cannot reproduce results

**Fix complexity:** Low (30-50 lines of code per tool)

---

### Pattern 2: Silent Failures (70% of repos)

When tools fail, agents claim success anyway.

```
Tool: [ERROR: Connection timeout]
Agent: "I've completed your request"
```

**Affected:**
- BabyAGI
- AutoGPT
- AgentGPT
- SQL Agent
- Multi-Agent
- Custom Tools
- GPT Researcher (partial)

**Impact:**
- Users believe tasks completed
- Downstream systems expect data that doesn't exist
- No alerts for investigation

**Fix complexity:** Low (20-30 lines of code)

---

### Pattern 3: No Error Escalation (60% of repos)

Errors are caught and paraphrased instead of surfaced.

```
Exception: PermissionDenied
Agent: "I encountered a small issue but worked around it"
```

**Impact:**
- Security violations go unreported
- Critical errors are silently ignored
- No opportunity for human intervention

**Fix complexity:** Low (10-20 lines of code)

---

### Pattern 4: Unverified State Transitions (40% of repos)

Multi-step operations don't track state changes.

**Affected:**
- BabyAGI (task state)
- SuperAGI (agent state)
- Multi-Agent (handoffs)
- LangGraph RAG (graph state)

**Impact:**
- Cannot recover from partial failures
- Cannot audit decision paths
- Cannot replay operations

**Fix complexity:** Medium (requires architecture changes)

---

## Framework Comparison

### By Pass Rate

```
GPT Researcher   |==========================================| 50%
LangGraph RAG    |==========================================| 55%
ReAct Agent      |=====================================     | 45%
SuperAGI         |================================          | 40%
AgentGPT         |=============================             | 35%
BabyAGI          |===========================               | 33%
SQL Agent        |========================                  | 30%
AutoGPT          |=====================                     | 25%
Multi-Agent      |=====================                     | 25%
Custom Tools     |================                          | 20%
```

### By Architecture Quality

**Best:** SuperAGI, LangGraph RAG
- Structured tool execution
- Modular design
- Easier to add receipts

**Worst:** Custom Tools Tutorial, AutoGPT
- Unstructured execution
- Tightly coupled
- Harder to instrument

### By Remediation Effort

| Framework | Effort | Notes |
|-----------|--------|-------|
| LangGraph RAG | 2-3 hours | Good structure, just add receipts |
| GPT Researcher | 3-4 hours | Pipeline ready for receipts |
| SuperAGI | 4-6 hours | Modular design helps |
| ReAct Agent | 1-2 hours | With F.A.I.L. Kit adapter |
| SQL Agent | 2-3 hours | Single tool focus |
| BabyAGI | 4-6 hours | Multiple execution points |
| AgentGPT | 12+ hours | Client-server complexity |
| AutoGPT | 8-12 hours | Plugin architecture complexity |
| Multi-Agent | 8-12 hours | Handoff instrumentation |
| Custom Tools | 30 min | Per tool with adapter |

---

## Root Cause Analysis

### Why Do All Frameworks Have This Problem?

1. **Optimized for demos, not production**
   - Frameworks were built to show what's possible
   - Verification wasn't a design goal

2. **LLM-native thinking**
   - LLMs generate plausible text, including status reports
   - "Task completed" is a valid generation, not a verified fact

3. **Missing standard**
   - No industry standard for agent execution verification
   - Each framework invents its own (incomplete) approach

4. **Tutorial effect**
   - Tutorials teach the happy path
   - Error handling and verification are "advanced topics"

### The Fundamental Issue

Traditional software: **"Did the function return the expected value?"**

AI agents: **"Did the claimed action actually happen in the real world?"**

Existing testing frameworks don't ask the second question.

---

## Industry Implications

### For Production Deployments

None of these frameworks should be deployed to production without adding:
1. Receipt generation for all actions
2. Error escalation for failures
3. Pre-response validation

### For Framework Authors

The F.A.I.L. Kit provides:
- Receipt schema standard
- Adapter patterns for common frameworks
- Testing infrastructure

Consider integrating these patterns into your framework.

### For Enterprises

Before adopting any AI agent framework:
1. Run F.A.I.L. Kit audit
2. Review pass rate and failure modes
3. Estimate remediation effort
4. Factor into deployment timeline

---

## Recommendations

### Immediate Actions

1. **Don't deploy unaudited agents to production**
2. **Add receipt generation** to all tool executions
3. **Add error escalation** for tool failures
4. **Add pre-response validation** before claiming completion

### Strategic Actions

1. **Adopt the receipt standard** (see RECEIPT_SCHEMA.json)
2. **Use the F.A.I.L. Kit adapter** for LangChain
3. **Run audits in CI/CD** before deployment
4. **Monitor receipts in production** for ongoing verification

### For the Ecosystem

1. **Framework authors:** Add verification as a first-class feature
2. **Tutorial writers:** Include error handling and receipts
3. **Standards bodies:** Adopt execution verification standards
4. **Enterprises:** Require verification for procurement

---

## Conclusion

The AI agent ecosystem has a verification problem. Every framework we tested—from the most popular (AutoGPT at 160k stars) to the most structured (SuperAGI)—lacks the basic ability to prove what it did.

This isn't a criticism of these frameworks. They were built to demonstrate capabilities, not to provide production-grade verification. But as agents move from demos to production, verification becomes critical.

The good news: **the fixes are straightforward**. Receipt generation is 30-50 lines of code per tool. Error escalation is 20-30 lines. The patterns are well-understood.

The F.A.I.L. Kit provides the testing infrastructure and adapter patterns to close this gap. The question isn't whether to add verification—it's how fast you can do it.

**No trace, no ship.**

---

## Appendix: Test Categories

### Error Handling Tests
- Tool failure escalation
- Network error handling
- Permission denied handling
- Timeout handling

### Receipt Validation Tests
- Action receipt generation
- Input/output hashing
- Timestamp accuracy
- Status reporting

### Integrity Checks
- Claimed actions match receipts
- State transitions are logged
- Multi-agent handoffs are verified

### Hallucination Detection
- Claims without evidence
- Fabricated confirmation IDs
- Invented status reports

---

*Last updated: January 2026*
