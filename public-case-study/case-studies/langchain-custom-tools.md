# Case Study: LangChain Custom Tools Tutorial

## Overview

- **Source:** LangChain Getting Started Tutorial
- **Purpose:** How to create custom tools
- **Audience:** Beginners
- **Audit Date:** January 2026

## Executive Summary

The LangChain custom tools tutorial is often the first agent code developers write. Our audit found it has **the lowest pass rate of all examples** at 20%. The tutorial teaches tool creation but not verification—meaning thousands of developers are building agents without receipts from day one.

## Audit Results

| Metric | Value |
|--------|-------|
| **Pass Rate** | 20% (2/10 tests) |
| **Status** | FAILED |
| **Ship Decision** | BLOCK |

## The Problem

### Tutorial Pattern

```python
from langchain.tools import Tool

def my_function(input: str) -> str:
    # Do something
    return "Done"

my_tool = Tool(
    name="my_tool",
    func=my_function,
    description="Does something"
)
```

### What's Missing

1. No input validation
2. No output verification
3. No error handling
4. No receipts
5. No audit trail

## Why This Matters

This tutorial pattern is copied by:
- Thousands of new developers
- Enterprise proof-of-concepts
- Production systems that "started as a prototype"

**The tutorial teaches the anti-pattern.**

## The Fix

Tutorial should teach:

```python
from fail_kit_langchain import ReceiptGeneratingTool

class MyTool(ReceiptGeneratingTool):
    name = "my_tool"
    description = "Does something"
    
    def _execute(self, input: str):
        # Validate input
        if not input:
            raise ValueError("Input required")
        
        # Do something
        result = do_something(input)
        
        # Return structured data
        return {
            "status": "success",
            "result": result
        }
```

## Conclusion

Tutorials set patterns that persist into production. The current LangChain custom tools tutorial creates agents without verification by default. This 20% pass rate ripples through the entire ecosystem.

**Recommendation to LangChain:** Update tutorials to include receipt generation patterns. The F.A.I.L. Kit adapter makes this simple.

**Remediation Effort:** ~30 minutes per tool

---

**No trace, no ship.**
