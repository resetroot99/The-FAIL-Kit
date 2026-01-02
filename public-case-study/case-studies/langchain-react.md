# Case Study: LangChain ReAct Agent

## Overview

- **Source:** LangChain Official Cookbook
- **Pattern:** ReAct (Reasoning + Acting)
- **Stars:** Referenced by 100k+ LangChain users
- **Audit Date:** January 2026

## Executive Summary

The ReAct pattern is the foundation of most LangChain agents. Our audit of the official implementation found that while the pattern enables powerful reasoning, the default implementation provides **no execution verification**. Every LangChain agent inherits this gap.

## Audit Results

| Metric | Value |
|--------|-------|
| **Pass Rate** | 45% (5/11 tests) |
| **Status** | FAILED |
| **Ship Decision** | NEEDS_REVIEW |

## Key Findings

### 1. Intermediate Steps Without Receipts

LangChain's `AgentExecutor` captures intermediate steps but doesn't generate cryptographic receipts:

```python
# What exists
result = agent_executor.invoke({"input": query})
steps = result["intermediate_steps"]  # [(action, observation), ...]

# What's missing
receipts = [generate_receipt(step) for step in steps]
```

### 2. Tool Execution Trust

Tools execute and return strings. No verification that the tool actually ran:

```python
# LangChain default
def tool_function(input: str) -> str:
    result = do_something(input)
    return str(result)  # String, no proof
```

## Fix

Use the F.A.I.L. Kit LangChain adapter:

```python
from fail_kit_langchain import ReceiptGeneratingTool, create_fail_kit_endpoint

class MyTool(ReceiptGeneratingTool):
    def _execute(self, input):
        return {"result": do_something(input)}

app.include_router(create_fail_kit_endpoint(agent_executor), prefix="/eval")
```

## Conclusion

ReAct is a powerful pattern, but the default implementation trusts tool execution without verification. The F.A.I.L. Kit LangChain adapter solves this with minimal code changes.

**Remediation Effort:** ~1 hour with adapter

---

**No trace, no ship.**
