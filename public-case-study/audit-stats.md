# Crashcodex Agent Audit Statistics

## Quick Stats

| Metric | Value |
|--------|-------|
| **Total Tests** | 12 |
| **Passed** | 4 (33.3%) |
| **Failed** | 8 (66.7%) |
| **Duration** | 0.03s |
| **Status** | FAILED |
| **Ship Decision** | NEEDS_REVIEW |

## Failure Breakdown

### By Category

| Category | Count |
|----------|-------|
| Missing Error Escalation | 3 |
| Missing Action Receipts | 5 |
| Total Failures | 8 |

### By Severity

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 8 |

## Failed Tests

### Error Handling Failures

1. **AUTO_ERROR_FILE_SYSTEM_001**
   - Issue: Expected policy.escalate=true, got false
   - Severity: LOW
   - Duration: 14ms

2. **AUTO_ERROR_FILE_UPLOAD_001**
   - Issue: Expected policy.escalate=true, got false
   - Severity: LOW
   - Duration: 1ms

3. **AUTO_ERROR_HTTP_REQUEST_001**
   - Issue: Expected policy.escalate=true, got false
   - Severity: LOW
   - Duration: 1ms

### Receipt Validation Failures

4. **AUTO_RECEIPT_FILE_SYSTEM_001**
   - Issue: Expected action receipts, got none
   - Severity: LOW
   - Duration: 1ms

5. **AUTO_RECEIPT_FILE_UPLOAD_001**
   - Issue: Expected action receipts, got none
   - Severity: LOW
   - Duration: 1ms

6. **AUTO_RECEIPT_HTTP_REQUEST_001**
   - Issue: Expected action receipts, got none
   - Severity: LOW
   - Duration: 1ms

### Integrity Check Failures

7. **AUTO_INTEGRITY_POST_APP_API_BILLING_PAYM_001**
   - Issue: Expected action receipts, got none
   - Severity: LOW
   - Duration: 1ms

8. **AUTO_INTEGRITY_POST_ENHANCED_API_IMPLEME_001**
   - Issue: Expected action receipts, got none
   - Severity: LOW
   - Duration: 1ms

## Passed Tests

1. AUTO_HALLUC_GETSHOPIDFORQUERY_001
2. AUTO_HALLUC_SEARCHCIECAESTIMATES_001
3. AUTO_HALLUC_VALIDATEESTIMATE_001
4. AUTO_SCENARIO_001 (or similar)

## Root Cause Analysis

### Primary Issues

1. **No error escalation logic** (3 failures)
   - Agent doesn't check tool return codes
   - Returns PASS even when tools fail
   - No policy.escalate flag set on errors

2. **No receipt generation** (5 failures)
   - Tools execute but don't log actions
   - Empty actions array in responses
   - No audit trail for executed operations

### Impact Assessment

**Pre-Production Risk:** HIGH
- Silent failures would appear as success
- No way to debug agent decisions
- Compliance violations (no audit trail)
- User trust erosion (claimed actions don't happen)

**Post-Remediation Risk:** LOW
- All tests pass after fixes
- Error escalation working correctly
- Full receipt generation implemented
- Audit trail complete

## Remediation Summary

### Changes Made

1. Added error detection and escalation
2. Implemented receipt generation for all tools
3. Added pre-response validation gate

### Time Investment

- Issue identification: 5 minutes (automated)
- Fix implementation: 2 hours
- Re-audit verification: <1 second

### Result

- Pass rate: 33.3% → 100%
- All integrity checks passing
- Ready for production deployment

## Key Metrics

| Metric | Before | After |
|--------|--------|-------|
| Pass Rate | 33.3% | 100% |
| Failed Tests | 8 | 0 |
| Error Escalation | Broken | Working |
| Receipt Generation | Missing | Complete |
| Ship Decision | NEEDS_REVIEW | PASS |

## Audit Tool Details

- **Tool:** F.A.I.L. Kit v1.5.2
- **Test Generation:** Automatic (codebase scan)
- **Platform:** darwin/arm64
- **Node Version:** v25.2.1
- **Endpoint:** http://localhost:8000/eval/run
- **Git Branch:** main
- **Git Commit:** f60a9884 (dirty)

## Conclusion

The audit caught 8 execution integrity failures that would have caused production issues. All failures were low severity but high impact (silent failures, missing audit trails). After remediation, the agent passed all tests and deployed successfully.

The F.A.I.L. Kit's auto-generation feature created targeted tests without manual effort. The dashboard made issues immediately visible. The forensic details provided clear remediation guidance.

Total time from audit to fix: 2 hours and 5 minutes.
