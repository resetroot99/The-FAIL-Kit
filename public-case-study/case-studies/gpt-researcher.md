# Case Study: GPT Researcher

## Repository Overview

- **Repository:** [github.com/assafelovic/gpt-researcher](https://github.com/assafelovic/gpt-researcher)
- **Stars:** ~10,000
- **Purpose:** Autonomous agent for comprehensive online research
- **Framework:** Python with structured research pipeline
- **Tools Used:** Web search, content scraping, report generation
- **Audit Date:** January 2026

## Executive Summary

GPT Researcher is designed specifically for research tasks, with a structured pipeline that produces comprehensive reports. Our audit found it to be the **best performer among production frameworks**, with a 50% pass rate. The structured output and source citation provide partial verification—but cryptographic receipts are still missing.

## What We Audited

GPT Researcher features:
1. Multi-source web research
2. Content extraction and summarization
3. Source citation in output
4. Structured report generation

We tested whether sources are verifiable and research is reproducible.

## Audit Results

### Summary

| Metric | Value |
|--------|-------|
| **Status** | NEEDS_REVIEW |
| **Pass Rate** | 50% (6/12 tests) |
| **Duration** | 0.03s |
| **Ship Decision** | NEEDS_REVIEW |

### Test Breakdown

| Category | Passed | Failed | Total |
|----------|--------|--------|-------|
| Error Handling | 2 | 2 | 4 |
| Receipt Validation | 1 | 3 | 4 |
| Integrity Checks | 2 | 1 | 3 |
| Hallucination Detection | 1 | 0 | 1 |
| **Total** | **6** | **6** | **12** |

## What GPT Researcher Does Well

### 1. Source Citations
```
Report includes:
- Source URLs
- Relevant quotes
- Context for each citation
```

This provides partial verification—you can check sources manually.

### 2. Structured Output
Research follows a defined pipeline with clear stages.

### 3. Content Hashing (Partial)
Some versions hash content for deduplication.

## Failures Found

### 1. Citations Without Cryptographic Proof

**Severity:** MEDIUM

Sources are cited but not cryptographically verified. The report claims "Source: example.com" but doesn't prove that URL was actually accessed or what content was retrieved.

**What's Needed:**
```python
source_receipt = {
    "url": "https://example.com/article",
    "accessed_at": "2026-01-02T12:00:00Z",
    "content_hash": "sha256:abc123...",
    "status_code": 200
}
```

---

### 2. Research Pipeline Without Stage Receipts

**Severity:** MEDIUM

Research proceeds through stages (search → scrape → analyze → synthesize) but stages don't generate receipts. Cannot verify which stage failed if research is incomplete.

---

### 3. Error Handling Gaps

**Severity:** MEDIUM

When sources fail (404, timeout, blocked), the researcher continues without escalating. Final report may be based on incomplete research without indication.

## Recommendations

### Add Source Receipts

```python
class VerifiedResearcher:
    def fetch_source(self, url):
        start = time.time()
        
        try:
            response = requests.get(url, timeout=30)
            content = response.text
            status = "success"
        except Exception as e:
            content = None
            status = "failed"
        
        receipt = {
            "action_id": str(uuid.uuid4()),
            "tool_name": "web_fetch",
            "timestamp": datetime.now().isoformat() + "Z",
            "status": status,
            "input_hash": hash_data({"url": url}),
            "output_hash": hash_data({"content": content}),
            "metadata": {
                "url": url,
                "status_code": response.status_code if status == "success" else None,
                "content_length": len(content) if content else 0
            }
        }
        
        self.source_receipts.append(receipt)
        return content
```

### Add Pipeline Receipts

```python
def research_with_receipts(query):
    pipeline_receipts = []
    
    # Stage 1: Search
    search_results = search(query)
    pipeline_receipts.append(create_receipt("search", query, search_results))
    
    # Stage 2: Scrape
    content = scrape_sources(search_results)
    pipeline_receipts.append(create_receipt("scrape", search_results, content))
    
    # Stage 3: Analyze
    analysis = analyze(content)
    pipeline_receipts.append(create_receipt("analyze", content, analysis))
    
    # Stage 4: Synthesize
    report = synthesize(analysis)
    pipeline_receipts.append(create_receipt("synthesize", analysis, report))
    
    return report, pipeline_receipts
```

## Conclusion

GPT Researcher is the most production-ready of the frameworks we audited. The structured pipeline, source citations, and focused scope put it ahead of general-purpose autonomous agents.

The 50% pass rate reflects partial verification through citations. Adding cryptographic receipts would likely bring it to 80%+ compliance with minimal effort.

**Key Takeaway:** Domain-specific agents (like research) are easier to verify than general-purpose agents. GPT Researcher's focused scope makes it a good candidate for production use with minor enhancements.

## Technical Details

- **Audit Tool:** F.A.I.L. Kit v1.5.2
- **Remediation Effort:** ~3-4 hours (well-structured pipeline)

---

**No trace, no ship.**
