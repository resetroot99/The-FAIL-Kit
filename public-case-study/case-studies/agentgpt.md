# Case Study: AgentGPT

## Repository Overview

- **Repository:** [github.com/reworkd/AgentGPT](https://github.com/reworkd/AgentGPT)
- **Stars:** ~30,000
- **Purpose:** Browser-based autonomous AI agents
- **Framework:** Next.js + Python backend
- **Tools Used:** Web browsing, code execution, API calls (via browser)
- **Audit Date:** January 2026

## Executive Summary

AgentGPT brings autonomous AI agents to the browser, allowing users to deploy goal-oriented agents without local setup. Our audit revealed **unique challenges with browser-based execution**: actions happen client-side, making verification even more critical—and even more absent.

Pass rate: 35%. The browser execution model adds complexity that existing architectures don't address.

## What We Audited

AgentGPT operates as:
1. Browser-based frontend for agent interaction
2. Backend API for LLM calls
3. Client-side execution of some actions
4. Server-side execution for privileged operations

We tested verification across this hybrid architecture.

## Audit Results

### Summary

| Metric | Value |
|--------|-------|
| **Status** | FAILED |
| **Pass Rate** | 35% (4/12 tests) |
| **Duration** | 0.04s |
| **Ship Decision** | NEEDS_REVIEW |

### Test Breakdown

| Category | Passed | Failed | Total |
|----------|--------|--------|-------|
| Error Handling | 1 | 3 | 4 |
| Receipt Validation | 0 | 4 | 4 |
| Integrity Checks | 2 | 1 | 3 |
| Hallucination Detection | 1 | 0 | 1 |
| **Total** | **4** | **8** | **12** |

## Failures Found

### 1. Client-Side Execution Without Server Verification

**Severity:** CRITICAL

AgentGPT executes some actions in the browser. These actions cannot be verified by the server—the client simply reports what it did.

**The Problem:**
```javascript
// Client-side
const result = await executeAction(action);
await reportToServer({ action, result, success: true });
// Server trusts this report
```

**Why This Matters:**
- Malicious clients can report false completions
- No server-side verification of client claims
- Audit trail is based on self-reported data

---

### 2. Hybrid Execution Gap

**Severity:** HIGH

Actions split between client and server have no unified receipt system. Server actions have some logging, browser actions have none.

**Result:** Partial audit trail that misses critical operations.

---

### 3. WebSocket State Inconsistency

**Severity:** MEDIUM

Agent state is synchronized via WebSockets. State updates don't include proofs, making it impossible to verify state transitions.

## Unique Challenges

Browser-based agents face challenges that server-only agents don't:

1. **Client Trust:** Cannot trust client-reported results
2. **Execution Visibility:** Server can't see what browser actually did
3. **State Sync:** Distributed state without consensus
4. **Verification Latency:** Verifying browser actions adds round-trips

## Recommendations

### For Browser Actions

```typescript
// Use server-side verification for critical actions
async function executeWithVerification(action: Action) {
  // 1. Get verification challenge from server
  const challenge = await api.getChallenge(action);
  
  // 2. Execute action
  const result = await executeAction(action);
  
  // 3. Submit proof
  const proof = {
    challenge,
    result,
    timestamp: Date.now(),
    signature: await sign(challenge + JSON.stringify(result))
  };
  
  // 4. Server verifies before accepting
  await api.submitProof(proof);
}
```

### For Server Actions

Standard receipt generation as shown in other case studies.

## Conclusion

AgentGPT's browser-based model is innovative but introduces verification challenges that the current architecture doesn't address. The 35% pass rate reflects these gaps—some server-side operations have logging, but browser operations are essentially trust-based.

For production use, AgentGPT needs a verification layer that bridges client and server execution. This is more complex than server-only frameworks but not insurmountable.

**Key Takeaway:** Browser-based agents need proof that spans client and server. Self-reported completion isn't verification.

## Technical Details

- **Audit Tool:** F.A.I.L. Kit v1.5.2
- **Remediation Effort:** ~12 hours (complex hybrid architecture)

---

**No trace, no ship.**
