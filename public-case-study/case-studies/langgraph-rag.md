# Case Study: LangGraph RAG Agent

## Overview

- **Source:** LangChain Official Examples
- **Pattern:** RAG with tool use
- **Framework:** LangGraph
- **Audit Date:** January 2026

## Executive Summary

LangGraph's RAG agent combines retrieval with tool execution in a graph-based workflow. Our audit found it to be the **best-performing LangChain example** at 55% pass rate, thanks to structured state management. However, retrieval operations still lack receipts.

## Audit Results

| Metric | Value |
|--------|-------|
| **Pass Rate** | 55% (6/11 tests) |
| **Status** | NEEDS_REVIEW |
| **Ship Decision** | NEEDS_REVIEW |

## What LangGraph Does Well

### 1. Explicit State Management
```python
class AgentState(TypedDict):
    messages: list
    documents: list
    # State is tracked explicitly
```

### 2. Graph-Based Flow
Operations are nodes in a graph, making the flow auditable.

### 3. Checkpointing
LangGraph can checkpoint state, enabling recovery.

## Gaps Found

### 1. Retrieval Without Receipts

Documents are retrieved but not verified:

```python
# Current
docs = retriever.invoke(query)

# Needed
receipt = {
    "action": "retrieve",
    "query_hash": hash(query),
    "docs_count": len(docs),
    "docs_hash": hash(docs)
}
```

### 2. Tool Calls Still Unverified

Even with graph structure, tool nodes don't generate receipts.

## Recommendations

LangGraph's structure makes adding receipts straightforward:

```python
def retrieve_node(state):
    query = state["messages"][-1].content
    docs = retriever.invoke(query)
    
    receipt = create_receipt("retrieve", query, docs)
    
    return {
        "documents": docs,
        "receipts": state.get("receipts", []) + [receipt]
    }
```

## Conclusion

LangGraph's explicit state and graph structure put it ahead of other LangChain patterns. The 55% pass rate is the highest among examples we tested. Adding receipts to nodes would likely achieve 90%+ compliance.

**Remediation Effort:** ~2-3 hours

---

**No trace, no ship.**
