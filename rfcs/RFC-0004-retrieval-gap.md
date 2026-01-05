# RFC-0004: Retrieval-to-Answer Gap (FK019)

**Status:** ✅ Accepted  
**Category:** Knowledge & Provenance  
**Severity:** `warning`

---

## Summary

Detects retrieval that does not inform the answer.

---

## Motivation

Agents often retrieve documents or data but then provide answers that do not reference or use the retrieved information. This indicates:

1. Retrieval was performative (for show, not for use)
2. Agent ignored retrieved evidence
3. Answer is based on prior knowledge, not retrieved facts
4. Waste of computational resources

**Examples from production:**
- Agent retrieves 3 documents about Python syntax
- Agent answers question about JavaScript instead
- Retrieved documents are never mentioned or cited

This undermines trust in RAG (Retrieval-Augmented Generation) systems because users assume retrieval means the answer is grounded in those sources.

---

## Formal Definition

### Claim
Answer implies reliance on retrieved facts or documents.

### Required Evidence
Explicit citation or usage of retrieved content in the answer.

**Acceptable forms:**
- Direct quotation with source reference
- Paraphrasing with citation
- "According to [source]..."
- "Based on the retrieved documents..."

### Failure Condition
**Retrieved data exists AND answer does not reference or use it.**

---

## Detection Logic

```typescript
function detectFK019(
  answer: string,
  retrievals: Retrieval[]
): boolean {
  if (retrievals.length === 0) {
    return false; // No retrieval, no violation
  }

  // Check for explicit citations
  const hasCitation = /according to|based on|retrieved|source|document/i.test(answer);
  
  if (hasCitation) {
    return false; // Citation present, no violation
  }

  // Check for content overlap
  const hasContentOverlap = retrievals.some(retrieval => {
    const retrievalText = retrieval.content.toLowerCase();
    const answerText = answer.toLowerCase();
    
    // Extract key phrases from retrieval (simplified)
    const keyPhrases = extractKeyPhrases(retrievalText);
    
    // Check if any key phrases appear in answer
    return keyPhrases.some(phrase => answerText.includes(phrase));
  });

  return !hasContentOverlap; // Violation if no overlap
}

function extractKeyPhrases(text: string): string[] {
  // Simplified: extract noun phrases, technical terms, etc.
  // Real implementation would use NLP
  const words = text.split(/\s+/);
  return words.filter(w => w.length > 5); // Placeholder
}
```

---

## False Positive Analysis

### Known Edge Cases

#### 1. Retrieval for Context, Not Content
**Example:** Agent retrieves user profile to personalize tone, not to cite facts.

**Mitigation:** Only flag when retrieval appears to be for factual grounding.

---

#### 2. Negative Results
**Example:** "I retrieved documents but found no relevant information."

**Mitigation:** Explicit acknowledgment of retrieval is compliant.

---

#### 3. Implicit Usage
**Example:** Answer uses facts from retrieval without explicit citation.

**Mitigation:** Content overlap detection catches this. If overlap exists, no violation.

---

## Backward Compatibility

This is a new rule. No existing rules are affected.

---

## Alternatives Considered

### Alternative 1: Require explicit citations always
**Rejected:** Too strict. Content overlap is sufficient proof of usage.

### Alternative 2: Combine with unsupported knowledge assertion (FK018)
**Rejected:** Separate failure modes. FK018 = no retrieval. FK019 = retrieval unused.

---

## Test Cases

### Violation Example 1
```json
{
  "retrievals": [
    { "id": "doc1", "content": "Python uses indentation for code blocks." },
    { "id": "doc2", "content": "Python supports object-oriented programming." }
  ],
  "answer": "JavaScript is a dynamically typed language.",
  "expectedViolation": "FK019"
}
```

### Violation Example 2
```json
{
  "retrievals": [
    { "id": "doc1", "content": "The capital of France is Paris." }
  ],
  "answer": "The capital of Germany is Berlin.",
  "expectedViolation": "FK019"
}
```

### Compliant Example 1
```json
{
  "retrievals": [
    { "id": "doc1", "content": "Python uses indentation for code blocks." }
  ],
  "answer": "According to the retrieved documentation, Python uses indentation for code blocks.",
  "expectedViolation": null
}
```

### Compliant Example 2
```json
{
  "retrievals": [
    { "id": "doc1", "content": "The capital of France is Paris." }
  ],
  "answer": "Paris is the capital of France.",
  "expectedViolation": null
}
```

### Compliant Example 3
```json
{
  "retrievals": [],
  "answer": "I don't have enough information to answer this.",
  "expectedViolation": null
}
```

---

## Implementation Notes

### Autofix
**Not allowed.** Cannot fabricate citations or content usage.

### Severity Justification
**Warning:** Retrieval waste is problematic but not as critical as phantom completion. It indicates inefficiency and potential unreliability, but the answer may still be correct.

---

## Decision

**✅ Accepted**

**Rationale:**
- Common failure mode in RAG systems
- Deterministic detection with content overlap analysis
- Clear boundary with FK018 (no retrieval vs. unused retrieval)
- Helps improve retrieval system efficiency

**Date:** 2025-01-04  
**Approved by:** Maintainers

---

**No trace, no ship.**
