# Crashcodex Agent Audit - Public Case Study

This directory contains a real-world case study of an AI agent that underwent forensic audit using the F.A.I.L. Kit before production deployment.

## Contents

- **crashcodex-case-study.md** - Full case study with context, findings, remediation, and outcomes
- **audit-stats.md** - Quick reference statistics and failure breakdown
- **dashboard-overview.png** - Screenshot of the F.A.I.L. Kit audit dashboard
- **test-timeline.png** - Screenshot of the test execution timeline
- **forensic-details.png** - Screenshot of the forensic details panel

## Quick Summary

An AI customer service agent with file operations, API integrations, and payment processing capabilities was audited before deployment. The audit revealed:

- **8 failures** out of 12 tests (33.3% pass rate)
- **3 missing error escalation** failures
- **5 missing action receipt** failures
- **All low severity** but high production impact

After 2 hours of remediation, the agent passed all tests and deployed successfully.

## Key Findings

### What Failed

1. **Error Handling:** Agent returned PASS when tools failed instead of escalating
2. **Receipt Generation:** Agent claimed actions without providing proof
3. **Audit Trail:** No evidence of what the agent actually did

### What Traditional Testing Missed

The agent had:
- 100% unit test coverage
- Integration tests for all endpoints
- End-to-end user flow tests

But none caught these issues because they don't test whether the agent's claims match reality.

### What F.A.I.L. Kit Caught

- Claimed actions without proof (execution integrity)
- Silent failures masked as success (error handling)
- Missing audit trails (compliance risk)

## The Dashboard

The F.A.I.L. Kit provides enterprise-grade forensic analysis:

### Overview Panel (dashboard-overview.png)
- Status indicator (FAILED/PASSED)
- Ship decision (NEEDS_REVIEW, PASS, BLOCK)
- Pass rate and test statistics
- Failure categorization
- Export options (PDF, HTML)

### Test Timeline (test-timeline.png)
- Visual execution sequence
- Pass/fail indicators
- Category grouping
- Run context and provenance

### Forensic Details (forensic-details.png)
- Searchable test list
- Expected vs actual comparisons
- Fix hints for each failure
- Severity tags
- Copy buttons for test IDs

## Production Outcome

After remediation and re-audit, the agent deployed successfully. First month results:

- Zero incidents of claimed actions without proof
- 2.3% error escalation rate (expected for edge cases)
- All escalations were legitimate
- Audit trail enabled debugging of 3 customer issues

## Why This Matters

Agents don't fail like code fails. They claim success when they fail. The only way to catch that is to demand proof.

Traditional testing checks if functions work. Forensic auditing checks if the agent tells the truth about what it did.

## Usage

This case study is public and can be:
- Shared with stakeholders to demonstrate audit value
- Used in blog posts or documentation
- Referenced in presentations about AI agent testing
- Included in product marketing materials

All dates have been removed to present the case as a resolved example rather than a specific incident.

## Technical Details

- **Agent Type:** Customer service assistant
- **Capabilities:** File ops, API calls, database access, payment processing
- **Audit Tool:** F.A.I.L. Kit v1.5.2
- **Test Generation:** Automatic codebase scan
- **Total Tests:** 12 (auto-generated)
- **Audit Duration:** 0.03s
- **Remediation Time:** 2 hours

## Key Insight

> "Agents lie differently than code. Traditional exceptions become confident assertions. 'Permission denied' becomes 'I processed your request.' The only way to catch that is to demand proof."

No trace, no ship.
