# Release v1.5.0 - Decision-Grade Audit Reports

**Release Date:** January 1, 2026

## Overview

Version 1.5.0 transforms F.A.I.L. Kit from a testing tool into a **decision-grade audit platform** with 10 high-leverage enhancements focused on helping developers quickly understand failures and take action.

## What's New

### 1. Ship Decision Block

Every audit report now tells you exactly what to do:

- **BLOCK**: Critical failures prevent deployment (missing receipts, unproven side effects)
- **NEEDS REVIEW**: High-severity issues require team review before ship
- **SHIP**: Clear to deploy with monitoring recommendations

Each decision includes:
- **Reason**: Specific failure breakdown (e.g., "8 failures: 3 missing receipts, 5 policy gates")
- **Next Action**: Actionable guidance (e.g., "Fix missing receipts in agent action handlers")

### 2. Failure Buckets

5-second triage with clickable failure categories:

1. **Receipt Missing** (Critical) - No proof of action performed
2. **Evidence Missing** - Citations, sources, or grounding missing
3. **Policy Failed** - Refusal logic bypassed or gates not enforced
4. **Tool Error** - File/network/database operation failures
5. **Validation Failed** - Schema or output format issues

Click any bucket to filter forensic details instantly.

### 3. Top 3 Root Causes

Auto-generated summary of most frequent failure patterns:

```
1. Missing action receipts for external API calls (3 tests: CONTRACT_0003, AGENT_0008, AUTO_receipt_email)
2. Policy gates not enforced - refusal logic bypassed (2 tests: ADV_REFUSE_101, CONTRACT_0004)
3. Missing or invalid citations in responses (2 tests: RAG_0002, GROUND_0001)
```

### 4. Interactive Timeline

Visual test execution flow with:
- **Hover tooltips**: Test ID, category, duration, severity, failure reason
- **Click-to-select**: Jump to forensic details
- **Failure clustering**: Detects 3+ adjacent failures with bracket grouping
- **Mini legend**: Pass (green), Fail (red), Critical (red with glow)

### 5. Enhanced Forensic Details

For each test failure:

1. **Assertion** (one line): `Expected decision 'REFUSE', got 'PASS'`
2. **Expected vs Actual** (collapsible JSON diff): Compare full payloads
3. **Fix Hint** (1-2 lines): `Add policy gate check in handle_request(). Ensure refusal triggers when policy_id matches.`
4. **Doc Link**: Direct link to relevant documentation
5. **Source Location**: File, function, line, column (with VSCode deep link)

### 6. Deterministic Severity

Clear, consistent severity rules:

- **Critical blocks ship**: Unproven side effects, missing receipts, data mutation without audit
- **High needs review**: Missing evidence on required decisions, policy bypass
- **Medium**: Degraded behavior, incomplete outputs (acceptable with notes)
- **Low**: Formatting, minor validation (can be deferred)

Each severity level includes a tooltip explaining what it means and why.

### 7. Run Context & Provenance

Full audit trail automatically captured:

- **Git Commit**: Auto-detected hash (e.g., `abc123de`) + dirty state
- **Git Branch**: Current branch name
- **CLI Version**: F.A.I.L. Kit version used
- **Node Version**: Runtime version
- **Platform**: OS and architecture
- **Receipt Chain**: PASS/FAIL verification of all action receipts
- **Timestamp**: Exact audit run time
- **Endpoint**: Agent URL tested

### 8. PDF Export

Enhanced print layout with:
- **Executive Summary**: Status, ship decision, top root causes
- **Failure Buckets Table**: Complete breakdown
- **Appendix**: All failing test IDs with reasons
- Clean, stakeholder-ready formatting

### 9. UX Polish

Developer-focused improvements:

- **Keyboard Navigation**: `j`/`k` to move between forensic items
- **Copy Buttons**: Click to copy test IDs to clipboard
- **Sticky Filter Bar**: Stays visible when scrolling forensic panel
- **Real-time Search**: Filter tests as you type
- **VSCode Deep Links**: Click to open source file at exact line
- **Responsive Design**: Works on all screen sizes

### 10. Severity Guide

New comprehensive documentation explaining:
- What each severity level means
- Why it matters for ship decisions
- Code examples showing fixes
- Ship decision matrix

## Breaking Changes

None. All changes are additive and backward-compatible.

## New Files

- `cli/src/reporters/dashboard.js` (significantly enhanced)
- `docs/SEVERITY_GUIDE.md` (new)

## Updated Files

- `cli/package.json` - Version bump to 1.5.0
- `cli/README.md` - Enhanced documentation for dashboard features
- `cli/src/reporters/index.js` - Exports new dashboard functions

## Migration Guide

No migration required. Existing audits will automatically use the new dashboard format when you run:

```bash
fail-audit run --format dashboard
```

To update:

```bash
npm install -g @fail-kit/cli@1.5.0
```

## Examples

### Before (v1.4.2)
```bash
fail-audit run --format html
# Opens HTML report with test results
```

### After (v1.5.0)
```bash
fail-audit run --format dashboard
# Opens decision-grade report with:
# - Ship decision (BLOCK/REVIEW/SHIP)
# - Failure buckets (5-second triage)
# - Top 3 root causes
# - Interactive timeline
# - Provenance tracking
# - Keyboard navigation (j/k)
```

## Performance

- Provenance gathering: <50ms (cached per audit run)
- Root cause extraction: O(n) single pass
- Timeline clustering: O(n) sliding window
- No impact on test execution time

## Use Cases

### For Developers
- **Triage failures in 5 seconds** using failure buckets
- **Fix issues faster** with specific assertions and fix hints
- **Navigate efficiently** with keyboard shortcuts (j/k)
- **Deep link to code** with VSCode integration

### For Team Leads
- **Make ship decisions** based on clear severity rules
- **Review root causes** to identify systemic issues
- **Track provenance** for audit compliance

### For Stakeholders
- **Export clean PDFs** with executive summary
- **Understand risk** with deterministic severity levels
- **Verify receipts** with chain validation

## What's Next

### Planned for v1.6.0
- SARIF export for GitHub Code Scanning integration
- Trend analysis across multiple audit runs
- Custom severity rules configuration
- Advanced failure pattern detection

## Documentation

- [Severity Guide](../docs/SEVERITY_GUIDE.md)
- [CLI README](./README.md)
- [Easy Integration Guide](../docs/EASY_INTEGRATION.md)

## Feedback

Report issues or request features at: https://github.com/resetroot99/The-FAIL-Kit/issues

---

**Contributors:**
- Core Team: Dashboard implementation, provenance tracking, UX polish
- Community: Testing, feedback, documentation improvements

**Special Thanks:**
To all developers who provided feedback on the audit reports and helped shape the decision-grade features.
