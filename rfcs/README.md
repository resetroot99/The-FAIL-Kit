# FAIL Kit RFC Process

**Request for Comments (RFC) — Rule Proposal System**

---

## Philosophy

**Rules are law. Law must be slow, adversarial, and boring.**

FAIL Kit rules define what it means for an AI system to be honest. They are not linter suggestions or style preferences. They are enforceable contracts that detect falsity.

Because rules have legal and compliance implications, they require:
- Rigorous review
- Formal documentation
- Adversarial testing
- Community consensus

---

## RFC Lifecycle

```
Proposed → Under Review → Accepted/Rejected/Deferred → Implemented
```

---

## 1. Proposal Phase

### Who Can Propose
Anyone can propose a new rule.

### How to Propose
1. Create a new file: `/rfcs/RFC-XXXX-rule-name.md`
2. Use the next available RFC number
3. Follow the RFC template (see below)
4. Submit a pull request

### RFC Template

```markdown
# RFC-XXXX: [Rule Name] (FKXXX)

**Status:** Proposed  
**Category:** [Category from taxonomy]  
**Severity:** error | warning | info

---

## Summary
One paragraph description of the failure mode.

---

## Motivation
What failure mode does this catch that is not already covered?
Why is this important?
What are the consequences of not detecting this?

---

## Formal Definition

### Claim
What the agent asserts or behavior it exhibits.

### Required Evidence
What must exist to support the claim.

### Failure Condition
Exact absence or contradiction that constitutes a violation.

---

## Detection Logic
Pseudocode or TypeScript showing how to detect this rule.

---

## False Positive Analysis
Known edge cases and how to mitigate them.

---

## Backward Compatibility
Does this affect existing rules? How?

---

## Alternatives Considered
Why other approaches were rejected.

---

## Test Cases
At least 2 violation examples and 1 compliant example.

---

## Implementation Notes

### Autofix
Allowed or not? If allowed, describe strategy.

### Severity Justification
Why this severity level?

---

## Decision
Proposed / Accepted / Rejected / Deferred
```

---

## 2. Review Phase

### Review Rules

An RFC **must be rejected** if:
- It overlaps an existing rule
- It cannot be proven with receipts or traces
- It enforces opinion instead of truth
- It introduces unverifiable intent inference
- It uses probabilistic "vibes" scoring
- It judges style, tone, or intelligence

### Review Criteria

An RFC **may be accepted** if:
- At least 2 concrete violation examples
- At least 1 non-violation counterexample
- Zero reliance on hidden system state
- Clear boundary with existing rules
- Deterministic detection logic
- Conforms to rule design contract

### Who Reviews
- Maintainers
- Community contributors
- Domain experts (security, compliance, etc.)

### Review Timeline
- Minimum 7 days for community feedback
- No fast-track approvals

---

## 3. Decision Phase

### Acceptance Criteria
A rule is **accepted** only if:
1. Passes all review criteria
2. Has maintainer approval
3. Has test cases implemented
4. Documentation is complete

### Rejection Criteria
A rule is **rejected** if:
1. Violates any absolute prohibition
2. Overlaps existing rule
3. Cannot be deterministically detected
4. Lacks sufficient justification

### Deferral
A rule may be **deferred** if:
1. Needs more research
2. Depends on future infrastructure
3. Requires broader consensus

---

## 4. Implementation Phase

Once accepted:
1. Assign rule ID (FK###)
2. Add to rule taxonomy
3. Implement detection logic
4. Add test fixtures
5. Update documentation
6. Merge to main branch

---

## Versioning

### Rule Immutability
- Rules are **immutable** once merged
- Rule IDs are **never reused**
- Rule behavior may be refined, but core definition cannot change

### What Can Change
- Severity level (with justification)
- Detection heuristics (to reduce false positives)
- Documentation clarity
- Test cases (additions only)

### What Cannot Change
- Rule ID
- Core failure condition
- Category assignment (without RFC)

---

## Deprecation

### When to Deprecate
- Rule is superseded by more precise rule
- Rule has unacceptable false positive rate
- Rule is no longer relevant

### How to Deprecate
1. Submit deprecation RFC
2. Mark rule as deprecated in taxonomy
3. Keep rule ID reserved (never reuse)
4. Document reason for deprecation

**Deprecated rules are never deleted.**

---

## Precedent Rule

**Once a failure mode is named, it must never be unnamed.**

This ensures:
- Historical consistency
- Audit trail integrity
- Legal defensibility
- Community trust

---

## Governance

### Maintainer Authority
- Maintainers have final approval authority
- Decisions are documented in RFCs
- Decisions can be appealed with new evidence

### Community Input
- Community feedback is encouraged
- Community members can propose rules
- Community members can review RFCs
- Final decision rests with maintainers

### Conflict Resolution
- Disputes are resolved through RFC discussion
- Maintainers may request external review
- Decisions are documented and justified

---

## Current RFCs

### Accepted
- [RFC-0001: Phantom Completion (FK010)](./RFC-0001-phantom-completion.md)
- [RFC-0002: Hallucinated Tool Invocation (FK014)](./RFC-0002-hallucinated-tool.md)
- [RFC-0003: Confidence Without Evidence (FK025)](./RFC-0003-confidence-without-evidence.md)
- [RFC-0004: Retrieval-to-Answer Gap (FK019)](./RFC-0004-retrieval-gap.md)
- [RFC-0005: Silent Failure Cascade (FK039)](./RFC-0005-silent-failure-cascade.md)

### Under Review
None

### Deferred
None

### Rejected
None

---

## FAQ

### Q: Can I propose a rule for code style?
**A:** No. FAIL Kit detects falsity, not quality. Code style is not a failure mode.

### Q: Can I propose a rule that infers agent intent?
**A:** No. Intent is not observable. Only claims and evidence are.

### Q: Can I propose a rule with probabilistic scoring?
**A:** No. Rules must be deterministic. No "maybe violations."

### Q: Can I propose a rule that overlaps an existing rule?
**A:** No. Each rule must detect a unique failure mode. If overlap exists, refine the existing rule instead.

### Q: How long does the RFC process take?
**A:** Minimum 7 days for review. Complex rules may take longer.

### Q: Can I appeal a rejection?
**A:** Yes. Provide new evidence or revised proposal addressing rejection reasons.

---

## Contributing

To contribute to FAIL Kit rule development:
1. Read the [Rule Design Contract](../docs/rules/rule-contract.md)
2. Review [existing RFCs](./README.md#current-rfcs)
3. Propose new RFC following this process
4. Participate in community review

---

**No trace, no ship.**
