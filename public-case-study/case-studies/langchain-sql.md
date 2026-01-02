# Case Study: LangChain SQL Agent

## Overview

- **Source:** LangChain Official Examples
- **Purpose:** Natural language to SQL queries
- **Risk Profile:** HIGH (database access)
- **Audit Date:** January 2026

## Executive Summary

The SQL agent converts natural language to database queries. Our audit found **critical gaps in query verification**—the agent claims to run queries but provides no proof of what was executed or what data was returned.

## Audit Results

| Metric | Value |
|--------|-------|
| **Pass Rate** | 30% (3/10 tests) |
| **Status** | FAILED |
| **Ship Decision** | BLOCK |

## Critical Findings

### 1. SQL Execution Without Receipts

```python
# Current implementation
result = db.run(sql_query)
return f"Query returned {len(result)} rows"

# No proof of:
# - What query actually ran
# - What data was returned
# - Whether query succeeded or failed
```

**Risk:** Agent could claim "I deleted the duplicate records" without proof.

### 2. Silent Query Failures

Database errors are caught and paraphrased:

```python
except Exception as e:
    return f"I encountered an issue with the database"
    # User thinks query ran; it didn't
```

### 3. No Query Audit Trail

For compliance (SOX, HIPAA), you must prove what queries ran. The SQL agent provides no trail.

## Recommendations

```python
class ReceiptSQLTool(ReceiptGeneratingTool):
    name = "sql_executor"
    
    def _execute(self, query: str):
        start = time.time()
        
        try:
            result = self.db.execute(query)
            rows = result.fetchall()
            status = "success"
        except Exception as e:
            rows = None
            status = "failed"
        
        # Receipt includes query hash, row count, duration
        return {
            "rows_affected": len(rows) if rows else 0,
            "execution_time_ms": int((time.time() - start) * 1000),
            "metadata": {
                "query_hash": hash_data(query),
                "result_hash": hash_data(rows)
            }
        }
```

## Conclusion

Database access is high-risk. An agent that runs SQL without receipts is a compliance violation waiting to happen.

**Remediation Effort:** ~2 hours

---

**No trace, no ship.**
