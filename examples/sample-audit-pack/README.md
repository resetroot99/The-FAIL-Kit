# Sample Audit Pack

This directory contains example outputs from a F.A.I.L. Kit audit. These files demonstrate what you receive after running an audit.

## Contents

### 1. executive-summary.md
One-page summary for stakeholders. Includes:
- Overall pass/fail status
- Critical findings
- Deployment recommendation
- Risk assessment

### 2. raw-results.json
Complete audit output in machine-readable format. Includes:
- Individual test results
- Receipts and traces
- Timing data
- Detailed failure information

### 3. gates-config.yaml
Production-ready gate configuration based on audit findings. Includes:
- Receipt enforcement rules
- Tool failure handling
- Escalation policies
- Compliance requirements

### 4. sample-report-full.md
Professional markdown report ready for PDF export. Includes:
- Executive summary
- Detailed test results
- Failure mode analysis
- Remediation recommendations
- Risk matrix
- Deployment decision tree

**Note:** PDF generation requires additional tooling (pandoc, wkhtmltopdf, or similar). The markdown file is provided as the source. To generate PDF:

```bash
# Using pandoc
pandoc sample-report-full.md -o sample-report.pdf

# Or using any markdown-to-PDF tool
```

## How to Use These Files

### For Technical Teams

Review `raw-results.json` for:
- Which test cases failed
- What receipts were missing
- Where tool failures occurred
- Trace data for debugging

Use `gates-config.yaml` to:
- Configure runtime gates
- Set up CI enforcement
- Define escalation rules

### For Executives

Review `executive-summary.md` or generate PDF from `sample-report-full.md` for:
- High-level status
- Deployment recommendation
- Business risk assessment
- Resource requirements for fixes

### For Compliance

Review full report (generate PDF from `sample-report-full.md`) for:
- Audit trail completeness
- Evidence of controls
- Gap analysis
- Remediation timeline

## Generating Your Own Pack

After running an audit:

```bash
# Run audit
fail-audit run --endpoint http://localhost:8000 --output results.json

# Generate report
fail-audit report results.json --format html

# Export summary
fail-audit summary results.json --output summary.md

# Generate gate config
fail-audit gates results.json --output gates-config.yaml
```

## Real-World Example

This sample pack represents an audit of a customer service agent with the following characteristics:

- **System:** Email automation agent
- **Tools:** email_sender, ticket_updater, knowledge_search
- **Risk Level:** Medium (customer-facing, no financial operations)
- **Results:** 42/50 passed (84% pass rate)
- **Critical Failures:** 2 (CONTRACT_0003, AGENT_0008)
- **Recommendation:** Do not deploy until critical failures fixed

See individual files for complete details.

---

**Questions?** See [AUDIT_RUNBOOK.md](../../AUDIT_RUNBOOK.md) for interpretation guidance.
