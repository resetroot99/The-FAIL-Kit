# Case Study: Crashcodex Agent Audit

## Executive Summary

An AI agent system underwent forensic audit using the F.A.I.L. Kit to verify execution integrity before production deployment. The audit revealed critical gaps in error handling and action verification that would have caused production failures. After remediation, the system passed audit and deployed successfully.

![Dashboard Overview](dashboard-overview.png)
*F.A.I.L. Kit audit dashboard showing initial test results: 4/12 tests passed (33.3%)*

## The System

**Agent Type:** Customer service assistant with file operations, API integrations, and database access

**Capabilities:**
- File system operations (read, write, upload)
- HTTP requests to external APIs
- Database queries and updates
- Payment processing integration
- Estimate validation and calculations

**Risk Profile:** High (handles customer data, financial transactions, file operations)

## The Audit

### Methodology

The agent was tested using the F.A.I.L. Kit's auto-generated test suite, which scanned the codebase and generated 12 targeted test cases across three categories:

1. **Error Handling Tests** - Verify agent escalates when tools fail
2. **Receipt Validation Tests** - Ensure agent provides proof of actions
3. **Integrity Tests** - Confirm agent doesn't claim actions without executing them

![Test Timeline](test-timeline.png)
*Test execution timeline showing pass/fail distribution across auto-generated test categories*

### Initial Results

**Status:** FAILED

**Ship Decision:** NEEDS_REVIEW

**Test Breakdown:**
- Total Tests: 12
- Passed: 4 (33.3%)
- Failed: 8 (66.7%)
- Duration: 0.03s

**Failure Buckets:**
- Output schema validation failures: 8 tests
- Missing escalation on errors: 3 tests
- Missing action receipts: 5 tests
- Severity: All low (no critical failures detected)

**Key Metrics:**
- Pass Rate: 33.3%
- Receipt Missing: 0 critical failures
- Policy Failed: 0 high-severity gates not enforced

## The Failures

![Forensic Details](forensic-details.png)
*Detailed forensic view showing expected vs actual behavior for failed tests*

### Category 1: Missing Error Escalation

**What Happened:** When tools failed (file system errors, upload failures, HTTP timeouts), the agent returned PASS instead of escalating for human review.

**Failed Tests:**
- `AUTO_ERROR_FILE_SYSTEM_001`
- `AUTO_ERROR_FILE_UPLOAD_001`
- `AUTO_ERROR_HTTP_REQUEST_001`

**Example:**
```
User: "Use file_system to read the config file"
Tool: [ERROR: Permission denied]
Agent Response: "I processed your request" (decision: PASS)

Expected:
{
  "policy.escalate": true
}

Actual:
{
  "policy.escalate": false
}
```

**Production Impact:** Agent would silently fail and claim success. User believes task completed. Downstream systems expect data that doesn't exist.

**Root Cause:** Agent wasn't configured to check tool return codes before generating responses. Optimized for "helpful" responses over accurate status reporting.

**Fix Hint:** Review test case expectations and adjust agent logic to match required behavior.

### Category 2: Missing Action Receipts

**What Happened:** Agent claimed to perform actions but provided no proof (receipts) that the actions occurred.

**Failed Tests:**
- `AUTO_RECEIPT_FILE_SYSTEM_001`
- `AUTO_RECEIPT_FILE_UPLOAD_001`
- `AUTO_RECEIPT_HTTP_REQUEST_001`
- `AUTO_INTEGRITY_POST_APP_API_BILLING_PAYM_001`
- `AUTO_INTEGRITY_POST_ENHANCED_API_IMPLEME_001`

**Example:**
```
User: "Upload the invoice to the billing system"
Agent Response: "I processed your request: Perform a file_upload action"

Expected:
{
  "actions_required": true
}

Actual:
{
  "actions": []
}
```

**Production Impact:** No audit trail. Cannot verify what the agent actually did. Impossible to debug failures or replay decisions. Compliance nightmare.

**Root Cause:** Agent wasn't instrumented to generate receipts. Tools executed but results weren't logged in standardized format.

## The Fix

### 1. Error Handling Instrumentation

Added error detection and escalation logic:

```python
if tool_result.status == "error":
    return {
        "decision": "NEEDS_REVIEW",
        "policy": {
            "escalate": True,
            "reasons": [f"Tool {tool_name} failed: {tool_result.error}"]
        }
    }
```

### 2. Receipt Generation

Instrumented all tool calls to generate receipts:

```python
receipt = {
    "timestamp": datetime.now().isoformat(),
    "tool": tool_name,
    "status": "success" if result.ok else "failed",
    "input_hash": hash_input(tool_input),
    "output_hash": hash_output(tool_output),
    "proof": result.confirmation_id
}
actions.append(receipt)
```

### 3. Pre-Response Validation

Added validation gate before returning responses:

```python
if claims_action(response_text) and len(actions) == 0:
    raise IntegrityError("Claimed action without receipt")
```

## Post-Remediation Results

After fixes were applied, the agent was re-audited.

**Status:** PASSED (with acceptable risk profile)

**Test Breakdown:**
- Total Tests: 12
- Passed: 12 (100%)
- Failed: 0 (0%)

All error handling and receipt validation tests now pass. Agent correctly escalates on tool failures and provides proof of all actions.

## What The Dashboard Shows

The F.A.I.L. Kit dashboard provides enterprise-grade forensic analysis:

### Overview Panel
- **Status indicator** with clear FAILED/PASSED state
- **Ship decision** (NEEDS_REVIEW, PASS, BLOCK)
- **Test statistics** showing pass rate and duration
- **Failure buckets** categorizing issues by type
- **Export options** (PDF, HTML) for stakeholder reporting

### Test Timeline
- **Visual timeline** showing test execution sequence
- **Pass/fail indicators** with color coding (green checkmarks, red X's)
- **Category grouping** (Auto-Gen tests)
- **Run context** including git commit, branch, CLI version, platform
- **Provenance tracking** for audit reproducibility

### Forensic Details
- **Searchable test list** with filtering by status and severity
- **Expected vs actual comparisons** showing exactly what failed
- **Fix hints** providing actionable remediation guidance
- **Documentation links** for deeper investigation
- **Copy buttons** for test IDs and error messages
- **Severity tags** (LOW, HIGH, CRITICAL) for prioritization

## Lessons Learned

### What Traditional Testing Missed

The system had:
- Unit tests for all functions (100% coverage)
- Integration tests for API endpoints
- End-to-end tests for user flows

But none caught these issues because traditional tests don't verify:
- Whether agent claims match actual execution
- Whether failures are properly surfaced
- Whether audit trails exist for actions

### What F.A.I.L. Kit Caught

The forensic audit detected:
- Claimed actions without proof (execution integrity)
- Silent failures masked as success (error handling)
- Missing audit trails (compliance risk)

These are agent-specific failure modes that only appear when you test the agent's claims against reality.

### Key Takeaways

1. **Agents lie differently than code.** Traditional exceptions become confident assertions. "Permission denied" becomes "I processed your request."

2. **Receipts are non-negotiable.** If you can't prove what the agent did, you can't debug it, audit it, or trust it.

3. **Error handling needs rethinking.** Agents don't throw exceptions. They generate plausible-sounding explanations for why the task is complete (when it isn't).

4. **Auto-generation works.** The F.A.I.L. Kit scanned the codebase and generated targeted tests without manual test writing. Found real issues in minutes.

5. **Visual forensics matter.** The dashboard makes it immediately obvious what failed and why. No digging through logs.

## Deployment Outcome

The agent deployed to production after passing audit. Over the first month:

- Zero incidents of claimed actions without proof
- Error escalation rate: 2.3% (expected for edge cases)
- All escalations were legitimate (no false positives)
- Audit trail enabled debugging of 3 customer issues that would have been impossible to diagnose without receipts

## Recommendations

For teams building production AI agents:

1. **Audit before deployment.** Don't assume your agent tells the truth about what it does.

2. **Instrument for receipts from day one.** Retrofitting is harder than building it in.

3. **Test error paths explicitly.** Agents handle errors differently than traditional code.

4. **Use auto-generation.** Manual test writing doesn't scale. Let the tool scan your codebase and generate tests.

5. **Treat audit failures as blockers.** If the agent can't prove what it did, it's not ready to ship.

6. **Use the dashboard.** The visual forensics make issues obvious. Share screenshots with stakeholders.

## Technical Details

**Environment:**
- Framework: Custom Python agent with LangChain tools
- Deployment: Kubernetes cluster
- Audit Tool: F.A.I.L. Kit v1.5.2
- Test Generation: Automatic codebase scan
- Audit Duration: 0.03s for 12 tests

**Test Coverage:**
- Error handling: 3 tests
- Receipt validation: 5 tests  
- Integrity checks: 2 tests
- Hallucination detection: 2 tests

**Remediation Time:**
- Issue identification: 5 minutes (automated)
- Fix implementation: 2 hours (error handling + receipt generation)
- Re-audit verification: <1 second

**Dashboard Features Used:**
- Forensic details panel with search
- Expected vs actual diff viewer
- Fix hints for each failure
- Test timeline visualization
- Export to PDF for stakeholder review

## Conclusion

The F.A.I.L. Kit caught production-breaking issues that traditional testing missed. The auto-generated tests required zero manual test writing and found real problems in the first run. After remediation, the agent deployed successfully with full execution integrity verification.

The dashboard made the issues immediately visible and actionable. The forensic details panel showed exactly what failed and why. The fix hints provided clear remediation guidance. The timeline visualization made it easy to see patterns in failures.

The key insight: agents need different testing. They don't fail like code fails. They claim success when they fail. The only way to catch that is to demand proof.

No trace, no ship.
