# F.A.I.L. Kit Report Formats

F.A.I.L. Kit provides multiple report formats optimized for different use cases. Choose the format that best fits your workflow.

## Format Comparison

| Feature | Dashboard | HTML | JSON | JUnit | Markdown |
|---------|-----------|------|------|-------|----------|
| **Interactive** | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Timeline View** | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Search/Filter** | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Source Location** | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Error Explanations** | Basic | Detailed | ✗ | ✗ | Basic |
| **CI/CD Integration** | ✗ | ✗ | ✗ | ✓ | ✗ |
| **Self-Contained** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Best For** | Dev/Demo | Debugging | Automation | CI/CD | Docs |

## Dashboard (Recommended for Development)

**Command:** `fail-audit run --format dashboard`

Enterprise-style interactive observability dashboard with:
- **Status overview** with verified/failed badge
- **Interactive timeline** with event lanes per category
- **Forensic log panel** with real-time search and filtering
- **Metrics cards** showing pass rate, total tests, critical count
- **Hover tooltips** for quick details
- **Click to select** items for deep inspection

**When to use:**
- During active development
- Team demos and presentations
- Stakeholder reviews
- Real-time debugging sessions

**Screenshot:**
```
┌─────────────────────────────────────────────────────────────┐
│ F.A.I.L. Kit [FORENSIC]  Dashboard  Timeline  Forensics    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✓ Status: VERIFIED    10/15 passed                         │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  AI Agent Action Timeline                                   │
│  ┌─ CONTRACT ─────────────────────────────────────┐         │
│  │  ✓───✓───✗─────✓────✓                          │         │
│  └──────────────────────────────────────────────────┘        │
│  ┌─ AGENT ────────────────────────────────────────┐         │
│  │  ✓───✗───✓─────✓                               │         │
│  └──────────────────────────────────────────────────┘        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                              │
│  [66.7%]  [15]   [2]                                        │
│  Pass Rate Total  Critical                                  │
└─────────────────────────────────────────────────────────────┘
```

## HTML Report (Best for Debugging)

**Command:** `fail-audit run --format html`

Detailed HTML report with:
- **Enhanced error explanations** with "What Happened", "Why It Failed", "How to Fix"
- **Source location display** showing file, function, line number
- **Request/response payloads** with JSON syntax highlighting
- **Category breakdown** with pass/fail statistics
- **Share button** to download and distribute

**When to use:**
- Detailed failure analysis
- Bug investigation
- Documentation of issues
- Sharing with team members

## JSON (Best for Automation)

**Command:** `fail-audit run --format json`

Raw structured data with:
- All test results
- Request/response data
- Source locations
- Timestamps and durations

**When to use:**
- Custom tooling and scripts
- Data analysis and metrics
- Integration with other systems
- Programmatic processing

## JUnit XML (Best for CI/CD)

**Command:** `fail-audit run --format junit --ci`

Standard JUnit XML format for:
- Test runner integration
- CI/CD pipeline reporting
- Test history tracking
- Build status reporting

**When to use:**
- GitHub Actions, GitLab CI, Jenkins
- Test automation platforms
- Continuous integration workflows
- Automated quality gates

## Markdown (Best for Documentation)

**Command:** `fail-audit run --format markdown`

Human-readable Markdown with:
- Summary statistics
- Failure list with descriptions
- Easy to embed in repos
- Good for PR comments

**When to use:**
- GitHub/GitLab README embedding
- Pull request comments
- Project documentation
- Team wikis

---

## Usage Examples

### Development Workflow

```bash
# Initialize and scan
fail-audit init
fail-audit scan

# Run with dashboard for interactive exploration
fail-audit run --format dashboard

# Generate detailed HTML for specific failures
fail-audit run --case AGENT_0008 --format html
```

### CI/CD Pipeline

```bash
# Run all tests with JUnit output
fail-audit run --ci --format junit --output results.xml

# Generate dashboard for build artifacts
fail-audit report results.json --format dashboard --output dashboard.html
```

### Team Sharing

```bash
# Run audit
fail-audit run

# Generate multiple formats
fail-audit report audit-results/latest.json --format dashboard --output report.html
fail-audit report audit-results/latest.json --format markdown --output report.md

# Share dashboard HTML file or embed markdown in PR
```

---

## Format Selection Guide

**Choose Dashboard if:**
- You're actively developing and debugging
- You need to present results to stakeholders
- You want interactive exploration of failures
- You value visual timeline and metrics

**Choose HTML if:**
- You need detailed error explanations
- You're investigating specific failures
- You want to share comprehensive reports
- You need source location references

**Choose JSON if:**
- You're building custom tooling
- You need programmatic access to data
- You're integrating with other systems
- You want maximum flexibility

**Choose JUnit if:**
- You're running in CI/CD pipelines
- You need standard test runner integration
- You want test history tracking
- Your platform requires XML format

**Choose Markdown if:**
- You're documenting in GitHub/GitLab
- You want to embed in README files
- You're adding reports to PR comments
- You need simple human-readable output

---

## Tips

1. **Use dashboard during development** for the best debugging experience
2. **Generate HTML for bug reports** with full context and source locations
3. **Use JUnit in CI** for standard integration
4. **Convert between formats** using the `report` command:
   ```bash
   fail-audit report results.json --format dashboard
   ```
5. **Combine formats** - generate multiple outputs from one audit run

---

For more information, see:
- [CLI Documentation](../cli/README.md)
- [CI/CD Integration Guide](./CI_CD_GUIDE.md)
- [Source Location Tracking](./SOURCE_LOCATION.md)
