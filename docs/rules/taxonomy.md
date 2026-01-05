# FAIL KIT RULE CLASSES

**FAIL Kit rules detect falsity, not quality.**

---

## Rule Categories

| Category | Domain |
|----------|--------|
| **A** | Execution & Action Integrity |
| **B** | Tool & Interface Truthfulness |
| **C** | Knowledge & Provenance |
| **D** | Temporal & State Consistency |
| **E** | Epistemic Honesty |
| **F** | Logical Consistency |
| **G** | Security & Safety Claims |
| **H** | Agentic Scope & Autonomy |
| **I** | Meta / Evaluation Integrity |

---

## Principle

**A rule must belong to exactly one category.**

This ensures:
- No overlapping failure surfaces
- Clear ownership and maintenance
- Unambiguous classification of violations
- Predictable behavior in enforcement

---

## Category Definitions

### Category A — Execution & Action Integrity

Rules that detect claims of completed actions without proof of execution.

**Examples:** FK010 (Phantom Completion), FK011 (Partial Execution), FK012 (Silent Tool Failure)

---

### Category B — Tool & Interface Truthfulness

Rules that detect misrepresentation of tool capabilities, availability, or invocation.

**Examples:** FK014 (Hallucinated Tool), FK015 (Tool Capability Overstatement), FK016 (Implicit Tool Usage)

---

### Category C — Knowledge & Provenance

Rules that detect assertions without proper sourcing or citation.

**Examples:** FK018 (Unsupported Knowledge Assertion), FK019 (Retrieval-to-Answer Gap), FK021 (Fabricated Source Citation)

---

### Category D — Temporal & State Consistency

Rules that detect temporal impossibilities or state inconsistencies.

**Examples:** FK022 (Future-State Reference), FK023 (State Regression Blindness), FK024 (Ordering Violation)

---

### Category E — Epistemic Honesty

Rules that detect unjustified confidence or suppressed uncertainty.

**Examples:** FK025 (Confidence Without Evidence), FK026 (Uncertainty Suppression), FK027 (Ambiguous Commitment Language)

---

### Category F — Logical Consistency

Rules that detect internal contradictions or reasoning failures.

**Examples:** FK029 (Internal Contradiction), FK030 (Tool–Reasoning Mismatch), FK031 (Output Not Entailed by Inputs)

---

### Category G — Security & Safety Claims

Rules that detect unverified security or safety guarantees.

**Examples:** FK032 (Unverified Security Guarantee), FK033 (Missing Audit Trail for Sensitive Action)

---

### Category H — Agentic Scope & Autonomy

Rules that detect unauthorized scope expansion or premature irreversible actions.

**Examples:** FK034 (Goal Drift), FK035 (Autonomous Scope Expansion), FK036 (Irreversible Action Without Confirmation)

---

### Category I — Meta / Evaluation Integrity

Rules that detect self-reporting without evidence or evaluation gaming.

**Examples:** FK037 (Self-Reported Compliance), FK038 (Evaluation Gaming), FK039 (Silent Failure Cascade), FK040 (Receipt Tampering)

---

## Rule Naming Convention

All rules follow the format: `FK###`

- `FK` = FAIL Kit
- `###` = Zero-padded sequential number (010, 011, 012, etc.)

**Rule IDs are immutable and never reused.**

---

## Adding New Categories

New categories may only be added if:
1. No existing category covers the failure domain
2. At least 3 distinct rules justify the category
3. The category boundary is provably non-overlapping
4. An RFC is submitted and approved by maintainers

---

**No trace, no ship.**
