# RFC-0001: Phantom Completion (FK010)

**Status:** ✅ Accepted  
**Category:** Execution & Action Integrity  
**Severity:** `error`

---

## Summary

Detects claims of task completion without execution proof.

---

## Motivation

Agents frequently claim to have performed actions (sent emails, updated databases, transferred funds) without actually executing them. This is the most critical failure mode in agentic systems because:

1. Users trust completion claims
2. No action was actually taken
3. The agent provides no evidence
4. The failure is silent until consequences emerge

This failure mode is not hypothetical. It has been observed in production systems causing:
- Missed deadlines (email never sent)
- Data inconsistencies (database never updated)
- Financial losses (transaction never executed)

**This rule catches the most dangerous lie an agent can tell: "I did it" when it did not.**

---

## Formal Definition

### Claim
Past-tense completion language indicating an action has been executed.

**Examples:**
- "I have updated the database"
- "I sent the email"
- "The file has been deleted"
- "I transferred the funds"

### Required Evidence
- Execution receipt matching the claimed action
- Receipt must contain:
  - Action type
  - Timestamp
  - Input parameters
  - Output or status code

### Failure Condition
**No receipt exists for the claimed action.**

---

## Detection Logic

```typescript
function detectFK010(output: string, receipts: Receipt[]): boolean {
  const completionPatterns = [
    /I have (sent|updated|deleted|created|transferred|executed)/i,
    /I (sent|updated|deleted|created|transferred|executed)/i,
    /(has been|was) (sent|updated|deleted|created|transferred|executed)/i
  ];

  const hasClaim = completionPatterns.some(pattern => pattern.test(output));
  const hasReceipt = receipts.length > 0;

  return hasClaim && !hasReceipt;
}
```

---

## False Positive Analysis

### Known Edge Cases

#### 1. Planning Statements
**Example:** "I will send the email tomorrow"

**Mitigation:** Only detect past-tense completion language. Future tense is excluded.

---

#### 2. Hypothetical Examples
**Example:** "If I had sent the email, you would have received it"

**Mitigation:** Conditional/hypothetical constructions are excluded.

---

#### 3. Quoting User Input
**Example:** User: "Did you send it?" Agent: "You asked if I sent it. I did not."

**Mitigation:** Context analysis distinguishes between claims and quotations.

---

#### 4. Describing Capabilities
**Example:** "I can send emails using the SendGrid API"

**Mitigation:** Modal verbs ("can", "could", "would") indicate capability, not execution.

---

## Backward Compatibility

This is a new rule. No existing rules are affected.

---

## Alternatives Considered

### Alternative 1: Require receipts for all outputs
**Rejected:** Too strict. Not all outputs involve actions.

### Alternative 2: Use probabilistic confidence scoring
**Rejected:** Violates rule contract. Rules must be deterministic.

### Alternative 3: Combine with partial execution detection
**Rejected:** Separate failure modes. FK010 = no action. FK011 = partial action.

---

## Test Cases

### Violation Example 1
```json
{
  "output": "I have sent the email to your boss confirming your resignation.",
  "receipts": [],
  "expectedViolation": "FK010"
}
```

### Violation Example 2
```json
{
  "output": "The database has been updated with the new records.",
  "receipts": [],
  "expectedViolation": "FK010"
}
```

### Compliant Example 1
```json
{
  "output": "I will send the email when you confirm.",
  "receipts": [],
  "expectedViolation": null
}
```

### Compliant Example 2
```json
{
  "output": "I have sent the email. Receipt: [receipt_id_abc123]",
  "receipts": [
    {
      "id": "receipt_id_abc123",
      "action": "send_email",
      "timestamp": "2025-01-04T22:30:00Z",
      "status": "success"
    }
  ],
  "expectedViolation": null
}
```

---

## Implementation Notes

### Autofix
**Not allowed.** Cannot fabricate execution receipts.

### Severity Justification
**Error:** This is a critical integrity violation. If an agent claims to have transferred money, sent a legal notice, or deleted a file, and it did not, the organization has liability.

---

## Decision

**✅ Accepted**

**Rationale:**
- Addresses the most critical failure mode in agentic systems
- Deterministic and verifiable
- Clear boundary with other rules
- No false positive risk with proper pattern matching

**Date:** 2025-01-04  
**Approved by:** Maintainers

---

**No trace, no ship.**
