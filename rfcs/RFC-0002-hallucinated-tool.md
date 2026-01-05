# RFC-0002: Hallucinated Tool Invocation (FK014)

**Status:** ✅ Accepted  
**Category:** Tool & Interface Truthfulness  
**Severity:** `error`

---

## Summary

Detects references to tools that were never invoked or registered.

---

## Motivation

Agents sometimes reference tools that do not exist or were never actually called. This creates false confidence in the reliability of the output.

**Examples from production:**
- "I used the WebSearch tool to verify this" (WebSearch not registered)
- "According to the DatabaseQuery tool..." (tool never invoked)
- "I checked with the FactChecker API" (API does not exist)

This is distinct from FK010 (Phantom Completion) because:
- FK010: Claims action without receipt
- FK014: Claims tool usage without tool existence or invocation

---

## Formal Definition

### Claim
Explicit reference to a tool by name or description.

**Examples:**
- "I used the WebSearch tool"
- "According to the DatabaseQuery tool"
- "The FactChecker API confirms"
- "Using the EmailSender service"

### Required Evidence
1. Tool registry entry (tool must be registered and available)
2. Tool invocation receipt (tool must have been called)

### Failure Condition
**Tool is absent from registry OR tool was not invoked.**

---

## Detection Logic

```typescript
function detectFK014(
  output: string,
  toolRegistry: Tool[],
  invocations: Invocation[]
): boolean {
  // Extract tool references from output
  const toolReferences = extractToolReferences(output);
  
  for (const toolName of toolReferences) {
    const isRegistered = toolRegistry.some(t => t.name === toolName);
    const wasInvoked = invocations.some(i => i.tool === toolName);
    
    if (!isRegistered || !wasInvoked) {
      return true; // Violation detected
    }
  }
  
  return false;
}

function extractToolReferences(output: string): string[] {
  const patterns = [
    /I used the (\w+) tool/gi,
    /using the (\w+) (?:tool|service|API)/gi,
    /according to the (\w+) tool/gi,
    /the (\w+) (?:tool|API) (?:confirms|shows|indicates)/gi
  ];
  
  const matches = new Set<string>();
  for (const pattern of patterns) {
    const results = output.matchAll(pattern);
    for (const match of results) {
      matches.add(match[1]);
    }
  }
  
  return Array.from(matches);
}
```

---

## False Positive Analysis

### Known Edge Cases

#### 1. Generic Tool References
**Example:** "I used a search tool" (not naming a specific tool)

**Mitigation:** Only detect specific tool names, not generic descriptions.

---

#### 2. Describing Capabilities
**Example:** "I can use the WebSearch tool if you enable it"

**Mitigation:** Modal/conditional language is excluded.

---

#### 3. Quoting Documentation
**Example:** "The manual says to use the DatabaseQuery tool"

**Mitigation:** Context analysis distinguishes between claims and quotations.

---

## Backward Compatibility

This is a new rule. No existing rules are affected.

---

## Alternatives Considered

### Alternative 1: Only check tool registry, not invocation
**Rejected:** A tool can be registered but not invoked. Both checks are necessary.

### Alternative 2: Combine with implicit tool usage (FK016)
**Rejected:** Separate failure modes. FK014 = explicit false claim. FK016 = implicit suggestion.

---

## Test Cases

### Violation Example 1
```json
{
  "output": "I used the WebSearch tool to verify this information.",
  "toolRegistry": [],
  "invocations": [],
  "expectedViolation": "FK014"
}
```

### Violation Example 2
```json
{
  "output": "According to the DatabaseQuery tool, the balance is $5000.",
  "toolRegistry": [
    { "name": "DatabaseQuery", "available": true }
  ],
  "invocations": [],
  "expectedViolation": "FK014"
}
```

### Compliant Example 1
```json
{
  "output": "I used the WebSearch tool to verify this information.",
  "toolRegistry": [
    { "name": "WebSearch", "available": true }
  ],
  "invocations": [
    { "tool": "WebSearch", "timestamp": "2025-01-04T22:30:00Z" }
  ],
  "expectedViolation": null
}
```

### Compliant Example 2
```json
{
  "output": "I can use the WebSearch tool if you enable it.",
  "toolRegistry": [],
  "invocations": [],
  "expectedViolation": null
}
```

---

## Implementation Notes

### Autofix
**Not allowed.** Cannot fabricate tool invocations.

### Severity Justification
**Error:** Claiming to use a tool that does not exist undermines trust in all tool-based outputs. Users assume tool usage means verified information.

---

## Decision

**✅ Accepted**

**Rationale:**
- Clear failure mode distinct from other rules
- Deterministic detection
- Critical for tool-based agent systems
- No overlap with FK010 or FK016

**Date:** 2025-01-04  
**Approved by:** Maintainers

---

**No trace, no ship.**
