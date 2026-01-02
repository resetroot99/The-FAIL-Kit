# Testing F.A.I.L. Kit v1.4.0

## Installation

```bash
# Remove old version
npm uninstall -g @fail-kit/cli

# Install latest (1.4.0)
npm install -g @fail-kit/cli@latest

# Verify
fail-audit --version
```

## Test the New Dashboard

### Option 1: Quick Test with Existing Results

```bash
# If you have existing audit results
fail-audit report audit-results/audit-*.json --format dashboard

# Open the generated HTML file in your browser
```

### Option 2: Run a Full Audit

```bash
# Make sure your agent is running
# Then run audit with dashboard format
fail-audit run --format dashboard

# The dashboard will be saved to audit-results/audit-[timestamp].html
# Open it in your browser to see the interactive UI
```

### Option 3: Generate Test Data

```bash
# From the F.A.I.L. Kit directory
cd /Users/v3ctor/The-FAIL-Kit

# Run a test audit
fail-audit run --endpoint http://localhost:8000/eval/run --format dashboard

# This will create a dashboard HTML file you can open
```

## What to Test

### 1. Interactive Dashboard Features

- **Status Card**: Check if pass/fail badge shows correctly
- **Timeline**: Hover over events to see tooltips
- **Forensic Log**: 
  - Use the search box to filter tests
  - Click filter buttons (All, Failed, Passed, Critical)
  - Click individual items to select them
- **Metrics Cards**: Verify pass rate, total tests, and critical count
- **Navigation Tabs**: Check the tab styling

### 2. Enhanced HTML Report Features

```bash
# Generate detailed HTML report
fail-audit run --format html

# Check for:
# - Category cards with pass rates and mini bar charts
# - Request/response collapsible sections
# - JSON syntax highlighting
# - Share button functionality
# - Source location display (if your responses include source_location)
```

### 3. Source Location Tracking

If your agent includes source location in responses:

```json
{
  "outputs": { "final_text": "..." },
  "source_location": {
    "file": "src/agents/my_agent.py",
    "function": "process_request",
    "line": 42
  }
}
```

Both HTML and Dashboard will display the file location prominently.

### 4. Error Explanations

Run tests that fail and check if error explanations are specific:

```bash
# Run with a specific failing test
fail-audit run --case AGENT_0008 --format html

# Check if "How to Fix" section shows:
# - Specific expected vs actual comparisons
# - Phantom action detection
# - Policy violation details
```

## Troubleshooting

### If you see old version:

```bash
# Clear npm cache
npm cache clean --force

# Remove global node_modules
rm -rf ~/.npm

# Reinstall
npm install -g @fail-kit/cli@latest
```

### If dashboard doesn't load:

- Check browser console for errors
- Ensure the HTML file is complete (should be ~34KB)
- Try opening in different browser

### If source locations don't appear:

- Make sure your agent responses include `source_location` field
- See `docs/SOURCE_LOCATION.md` for implementation examples

## Expected Behavior

### Dashboard (--format dashboard)
- Dark enterprise UI with cyan accents
- Interactive timeline with hover tooltips
- Search and filter forensic log
- Three metric cards with charts
- Fully self-contained HTML file

### HTML Report (--format html)
- Detailed error explanations
- Collapsible request/response sections
- Source location displays (if available)
- Category summary cards
- Share button

## Performance Notes

- Dashboard loads ~34KB HTML (fast)
- HTML report loads ~40-50KB depending on test count
- Both work offline (no external dependencies)
- Tested with reports up to 100+ test cases

## Quick Visual Check

Dashboard should look like:
```
┌─────────────────────────────────────────┐
│ F.A.I.L. Kit [FORENSIC] • Dashboard     │
├─────────────────────────────────────────┤
│ ✓ VERIFIED  10/15 passed                │
│                                          │
│ Timeline ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ CONTRACT: ✓ ✓ ✗ ✓                       │
│ AGENT:    ✓ ✗ ✓                         │
│                                          │
│ [66.7%] [15] [2]                        │
└─────────────────────────────────────────┘
```

HTML report should have:
- Category cards at top with pass rates
- Detailed error explanations for failures
- Collapsible Request/Response sections
- Blue source location boxes (if data available)

## Need Help?

If something doesn't work:
1. Check the terminal output for errors
2. Verify your agent is running and responding correctly
3. Check that audit results JSON files are valid
4. Try generating from an existing results file first:
   ```bash
   fail-audit report <your-results>.json --format dashboard
   ```
