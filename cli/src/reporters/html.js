/**
 * F.A.I.L. Kit - HTML Report Generator
 * Creates beautiful, shareable HTML reports with charts and detailed failure analysis.
 */

const { generateErrorExplanation } = require('../error-explainer');

/**
 * Category metadata for display
 */
const CATEGORY_META = {
  CONTRACT: { icon: 'C', name: 'Contract', color: '#6366f1' },
  AGENT: { icon: 'A', name: 'Agent', color: '#f97316' },
  ADV: { icon: 'X', name: 'Adversarial', color: '#ef4444' },
  RAG: { icon: 'R', name: 'RAG', color: '#8b5cf6' },
  SHIFT: { icon: 'S', name: 'Distribution Shift', color: '#14b8a6' },
  GROUND: { icon: 'G', name: 'Grounding', color: '#3b82f6' },
  AUTO: { icon: 'Z', name: 'Auto-Generated', color: '#10b981' },
  CUSTOM: { icon: 'U', name: 'Custom', color: '#f59e0b' }
};

/**
 * Severity classification for test cases
 */
const SEVERITY_MAP = {
  'CONTRACT_0003': 'critical',
  'CONTRACT_02': 'critical',
  'AGENT_0008': 'critical',
  'ADV_': 'high',
  'AGENT_': 'high',
  'RAG_': 'medium',
  'SHIFT_': 'medium',
  'CONTRACT_': 'low',
  'GROUND_': 'low'
};

/**
 * Get severity level for a case ID
 */
function getSeverity(caseId) {
  for (const [pattern, severity] of Object.entries(SEVERITY_MAP)) {
    if (caseId.includes(pattern)) return severity;
  }
  return 'low';
}

/**
 * Get documentation link for a case type
 */
function getDocLink(caseId) {
  const prefix = caseId.split('_')[0];
  const links = {
    'CONTRACT': 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/FAILURE_MODES.md#contract-violations',
    'AGENT': 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/FAILURE_MODES.md#agentic-failures',
    'ADV': 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/FAILURE_MODES.md#adversarial-attacks',
    'RAG': 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/FAILURE_MODES.md#rag-failures',
    'SHIFT': 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/FAILURE_MODES.md#distribution-shift',
    'GROUND': 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/FAILURE_MODES.md#grounding-failures',
    'AUTO': 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/README.md'
  };
  return links[prefix] || 'https://github.com/resetroot99/The-FAIL-Kit#readme';
}

/**
 * Get remediation suggestion based on failure type
 */
function getRemediation(caseId, reason) {
  const prefix = caseId.split('_')[0];
  
  const remediations = {
    'CONTRACT': 'Ensure your agent returns properly structured responses with all required fields.',
    'AGENT': 'Implement action receipts for all tool invocations. Never claim actions without proof.',
    'ADV': 'Add input validation and sanitization. Consider adversarial training for your model.',
    'RAG': 'Review your retrieval pipeline and implement citation verification.',
    'SHIFT': 'Add edge case handling and input validation for unexpected formats.',
    'GROUND': 'Implement knowledge boundary detection. Abstain when information is uncertain.'
  };
  
  return remediations[prefix] || 'Review the test case expectations and agent implementation.';
}

/**
 * Generate SVG donut chart for pass/fail ratio
 */
function generateDonutChart(passed, failed) {
  const total = passed + failed;
  if (total === 0) return '';
  
  const passPercent = (passed / total) * 100;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const passLength = (passPercent / 100) * circumference;
  const failLength = circumference - passLength;
  
  return `
    <svg viewBox="0 0 100 100" class="donut-chart">
      <circle cx="50" cy="50" r="${radius}" fill="none" stroke="#1a1a1a" stroke-width="12"/>
      <circle cx="50" cy="50" r="${radius}" fill="none" stroke="#ff4444" stroke-width="12"
        stroke-dasharray="${circumference}" stroke-dashoffset="0"
        transform="rotate(-90 50 50)"/>
      <circle cx="50" cy="50" r="${radius}" fill="none" stroke="#00ff88" stroke-width="12"
        stroke-dasharray="${passLength} ${failLength}" stroke-dashoffset="0"
        transform="rotate(-90 50 50)"/>
      <text x="50" y="50" text-anchor="middle" dy="0.35em" class="donut-text">
        ${passPercent.toFixed(0)}%
      </text>
    </svg>
  `;
}

/**
 * Generate severity bar chart
 */
function generateSeverityBars(severityCounts) {
  const maxCount = Math.max(...Object.values(severityCounts), 1);
  const colors = {
    critical: '#ff4444',
    high: '#ff8800',
    medium: '#ffcc00',
    low: '#666666'
  };
  
  return Object.entries(severityCounts).map(([severity, count]) => {
    const width = (count / maxCount) * 100;
    return `
      <div class="severity-bar-row">
        <span class="severity-label">${severity.charAt(0).toUpperCase() + severity.slice(1)}</span>
        <div class="severity-bar-container">
          <div class="severity-bar" style="width: ${width}%; background: ${colors[severity]}"></div>
        </div>
        <span class="severity-count">${count}</span>
      </div>
    `;
  }).join('');
}

/**
 * Generate mini bar chart for category card
 */
function generateMiniBar(passed, failed) {
  const total = passed + failed;
  if (total === 0) return '';
  
  const passPercent = (passed / total) * 100;
  const failPercent = (failed / total) * 100;
  
  return `
    <div class="category-bar">
      <div class="category-bar-pass" style="width: ${passPercent}%"></div>
      <div class="category-bar-fail" style="width: ${failPercent}%"></div>
    </div>
  `;
}

/**
 * Syntax highlight JSON for display
 */
function syntaxHighlightJson(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  // Escape HTML first
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Apply syntax highlighting
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
          match = match.replace(/:$/, '');
          return `<span class="${cls}">${match}</span>:`;
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

/**
 * Generate the full HTML report
 */
function generateHtmlReport(results) {
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  const failures = results.results.filter(r => !r.pass);
  const passes = results.results.filter(r => r.pass);
  
  // Calculate severity counts for failures
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  failures.forEach(f => {
    const severity = getSeverity(f.case);
    severityCounts[severity]++;
  });
  
  // Group results by category
  const categories = {};
  results.results.forEach(r => {
    const prefix = r.case.split('_')[0];
    if (!categories[prefix]) {
      categories[prefix] = { passed: 0, failed: 0, cases: [] };
    }
    categories[prefix].cases.push(r);
    if (r.pass) {
      categories[prefix].passed++;
    } else {
      categories[prefix].failed++;
    }
  });
  
  const timestamp = new Date(results.timestamp).toLocaleString();
  const duration = results.duration_ms ? `${(results.duration_ms / 1000).toFixed(1)}s` : 'N/A';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>F.A.I.L. Kit Audit Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Outfit:wght@400;500;600;700&display=swap');
    
    :root {
      --bg-primary: #0a0a0a;
      --bg-secondary: #111111;
      --bg-tertiary: #1a1a1a;
      --border: #2a2a2a;
      --text-primary: #e0e0e0;
      --text-secondary: #888888;
      --text-muted: #555555;
      --accent: #00ff88;
      --accent-dim: #00cc6a;
      --danger: #ff4444;
      --warning: #ff8800;
      --caution: #ffcc00;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    
    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 48px;
      padding-bottom: 32px;
      border-bottom: 1px solid var(--border);
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--accent), var(--accent-dim));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 20px;
      color: var(--bg-primary);
    }
    
    h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .tagline {
      font-size: 14px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    
    .meta {
      text-align: right;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .meta-value {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-primary);
    }
    
    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }
    
    .card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
    }
    
    .card-header {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }
    
    .stats-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .stat {
      text-align: center;
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .stat-label {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    
    .stat-pass { color: var(--accent); }
    .stat-fail { color: var(--danger); }
    
    /* Donut Chart */
    .donut-chart {
      width: 120px;
      height: 120px;
    }
    
    .donut-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 600;
      fill: var(--text-primary);
    }
    
    /* Severity Bars */
    .severity-bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .severity-label {
      width: 70px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .severity-bar-container {
      flex: 1;
      height: 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .severity-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .severity-count {
      width: 24px;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    /* Categories - Enhanced Summary View */
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 48px;
    }
    
    .category-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: all 0.2s;
    }
    
    .category-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
    }
    
    .category-icon {
      font-size: 18px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      width: 32px;
      height: 32px;
      line-height: 32px;
      border-radius: 8px;
      background: var(--bg-tertiary);
      margin: 0 auto 8px;
    }
    
    .category-name {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-secondary);
    }
    
    .category-bar {
      height: 6px;
      background: var(--bg-tertiary);
      border-radius: 3px;
      overflow: hidden;
      display: flex;
      margin-bottom: 12px;
    }
    
    .category-bar-pass {
      background: var(--accent);
      height: 100%;
    }
    
    .category-bar-fail {
      background: var(--danger);
      height: 100%;
    }
    
    .category-stats {
      display: flex;
      justify-content: center;
      gap: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
    }
    
    .category-rate {
      font-size: 24px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      margin-bottom: 4px;
    }
    
    .category-rate.pass-rate-high { color: var(--accent); }
    .category-rate.pass-rate-mid { color: var(--caution); }
    .category-rate.pass-rate-low { color: var(--danger); }
    
    /* Failures Section */
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .section-count {
      background: var(--danger);
      color: var(--bg-primary);
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
    }
    
    .failure-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .failure-item {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-left: 4px solid var(--danger);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .failure-item.severity-critical { border-left-color: #ff4444; }
    .failure-item.severity-high { border-left-color: #ff8800; }
    .failure-item.severity-medium { border-left-color: #ffcc00; }
    .failure-item.severity-low { border-left-color: #666666; }
    
    .failure-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .failure-header:hover {
      background: var(--bg-tertiary);
    }
    
    .failure-case {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      font-weight: 600;
    }
    
    .failure-badges {
      display: flex;
      gap: 8px;
    }
    
    .badge {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 6px;
    }
    
    .badge-critical { background: #ff4444; color: #000; }
    .badge-high { background: #ff8800; color: #000; }
    .badge-medium { background: #ffcc00; color: #000; }
    .badge-low { background: #444; color: #fff; }
    
    .failure-details {
      display: none;
      padding: 0 24px 24px;
      border-top: 1px solid var(--border);
    }
    
    .failure-item.expanded .failure-details {
      display: block;
    }
    
    .detail-section {
      margin-top: 20px;
    }
    
    .detail-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    
    .detail-content {
      background: var(--bg-tertiary);
      border-radius: 8px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .remediation {
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid rgba(0, 255, 136, 0.2);
      border-radius: 8px;
      padding: 16px;
      margin-top: 20px;
    }
    
    .remediation-title {
      color: var(--accent);
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 8px;
    }
    
    .remediation-text {
      font-size: 14px;
      color: var(--text-primary);
    }
    
    /* Error Explanation */
    .error-explanation {
      background: var(--bg-tertiary);
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    
    .explanation-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--danger);
      margin-bottom: 16px;
    }
    
    .explanation-section {
      margin-bottom: 16px;
    }
    
    .explanation-section:last-child {
      margin-bottom: 0;
    }
    
    .explanation-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    
    .explanation-text {
      font-size: 14px;
      color: var(--text-primary);
      line-height: 1.6;
    }
    
    .explanation-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .explanation-list li {
      font-size: 14px;
      color: var(--text-primary);
      line-height: 1.6;
      padding-left: 20px;
      position: relative;
      margin-bottom: 8px;
    }
    
    .explanation-list li:before {
      content: "→";
      position: absolute;
      left: 0;
      color: var(--accent);
      font-weight: 600;
    }
    
    .doc-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      color: var(--accent);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }
    
    .doc-link:hover {
      text-decoration: underline;
    }
    
    /* Payload Sections (Request/Response) */
    .payload-section {
      margin-top: 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .payload-section summary {
      padding: 12px 16px;
      background: var(--bg-tertiary);
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
    }
    
    .payload-section summary:hover {
      background: var(--border);
    }
    
    .payload-section summary::marker {
      color: var(--accent);
    }
    
    .payload-section[open] summary {
      border-bottom: 1px solid var(--border);
    }
    
    .payload-content {
      padding: 16px;
      background: #0d0d0d;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .payload-content pre {
      margin: 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    /* JSON Syntax Highlighting */
    .json-string { color: #ce9178; }
    .json-number { color: #b5cea8; }
    .json-boolean { color: #569cd6; }
    .json-null { color: #569cd6; }
    .json-key { color: #9cdcfe; }
    
    /* Share Button */
    .share-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--accent);
      color: var(--bg-primary);
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .share-btn:hover {
      background: var(--accent-dim);
      transform: translateY(-1px);
    }
    
    .share-btn:active {
      transform: translateY(0);
    }
    
    .share-btn.copied {
      background: #22c55e;
    }
    
    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--bg-secondary);
      border: 1px solid var(--accent);
      color: var(--text-primary);
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 14px;
      box-shadow: 0 8px 32px rgba(0, 255, 136, 0.2);
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
      z-index: 1000;
    }
    
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .header-actions {
      display: flex;
      align-items: flex-start;
      gap: 24px;
    }
    
    /* All Passed State */
    .all-passed {
      text-align: center;
      padding: 80px 40px;
      background: linear-gradient(135deg, rgba(0, 255, 136, 0.05), transparent);
      border: 1px solid rgba(0, 255, 136, 0.2);
      border-radius: 16px;
    }
    
    .all-passed-icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    
    .all-passed-title {
      font-size: 28px;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 12px;
    }
    
    .all-passed-subtitle {
      color: var(--text-secondary);
      font-size: 16px;
    }
    
    /* Footer */
    footer {
      margin-top: 64px;
      padding-top: 32px;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
    }
    
    footer strong {
      color: var(--accent);
      font-weight: 600;
    }
    
    /* Print Styles */
    @media print {
      body { background: #fff; color: #000; }
      .card, .failure-item { border-color: #ddd; background: #f9f9f9; }
      .failure-details { display: block !important; }
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      header { flex-direction: column; gap: 24px; }
      .meta { text-align: left; }
      .stat-value { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">
        <div class="logo-icon">F</div>
        <div>
          <h1>F.A.I.L. Kit Audit Report</h1>
          <div class="tagline">Forensic Audit of Intelligent Logic</div>
        </div>
      </div>
      <div class="header-actions">
        <div class="meta">
          <div><span class="meta-value">${timestamp}</span></div>
          <div>Duration: <span class="meta-value">${duration}</span></div>
          <div>Endpoint: <span class="meta-value">${results.endpoint || 'N/A'}</span></div>
        </div>
        <button class="share-btn" onclick="shareReport()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16,6 12,2 8,6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share Report
        </button>
      </div>
    </header>
    
    <div class="summary-grid">
      <div class="card">
        <div class="card-header">Test Results</div>
        <div class="stats-row">
          <div style="display: flex; gap: 32px;">
            <div class="stat">
              <div class="stat-value">${results.total}</div>
              <div class="stat-label">Total</div>
            </div>
            <div class="stat">
              <div class="stat-value stat-pass">${results.passed}</div>
              <div class="stat-label">Passed</div>
            </div>
            <div class="stat">
              <div class="stat-value stat-fail">${results.failed}</div>
              <div class="stat-label">Failed</div>
            </div>
          </div>
          ${generateDonutChart(results.passed, results.failed)}
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">Failure Severity</div>
        ${generateSeverityBars(severityCounts)}
      </div>
    </div>
    
    <div class="categories-grid">
      ${Object.entries(categories).map(([name, data]) => {
        const meta = CATEGORY_META[name] || { icon: '?', name: name, color: '#666' };
        const total = data.passed + data.failed;
        const passRate = total > 0 ? Math.round((data.passed / total) * 100) : 0;
        const rateClass = passRate >= 80 ? 'pass-rate-high' : passRate >= 50 ? 'pass-rate-mid' : 'pass-rate-low';
        return `
          <div class="category-card" style="border-top: 3px solid ${meta.color}">
            <div class="category-icon">${meta.icon}</div>
            <div class="category-name">${meta.name}</div>
            <div class="category-rate ${rateClass}">${passRate}%</div>
            ${generateMiniBar(data.passed, data.failed)}
            <div class="category-stats">
              <span class="stat-pass">${data.passed} ✓</span>
              <span class="stat-fail">${data.failed} ✗</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    
    ${failures.length > 0 ? `
      <div class="section-title">
        Failures
        <span class="section-count">${failures.length}</span>
      </div>
      
      <div class="failure-list">
        ${failures.map(f => {
          const severity = getSeverity(f.case);
          const docLink = getDocLink(f.case);
          const remediation = getRemediation(f.case, f.reason);
          
          return `
            <div class="failure-item severity-${severity}">
              <div class="failure-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div class="failure-case">${f.case}</div>
                <div class="failure-badges">
                  <span class="badge badge-${severity}">${severity}</span>
                </div>
              </div>
              <div class="failure-details">
                ${generateErrorExplanation(f.case, f.reason || f.error, f.expected, f.actual)}
                
                <div class="detail-section">
                  <div class="detail-label">Technical Details</div>
                  <div class="detail-content">${f.reason || f.error || 'Unknown failure'}</div>
                </div>
                
                ${f.expected ? `
                  <div class="detail-section">
                    <div class="detail-label">Expected</div>
                    <div class="detail-content">${JSON.stringify(f.expected, null, 2)}</div>
                  </div>
                ` : ''}
                
                ${f.actual ? `
                  <div class="detail-section">
                    <div class="detail-label">Actual</div>
                    <div class="detail-content">${JSON.stringify(f.actual, null, 2)}</div>
                  </div>
                ` : ''}
                
                ${f.request ? `
                  <details class="payload-section">
                    <summary>Request Payload</summary>
                    <div class="payload-content">
                      <pre>${syntaxHighlightJson(f.request)}</pre>
                    </div>
                  </details>
                ` : ''}
                
                ${f.response ? `
                  <details class="payload-section">
                    <summary>Response Payload</summary>
                    <div class="payload-content">
                      <pre>${syntaxHighlightJson(f.response)}</pre>
                    </div>
                  </details>
                ` : ''}
                
                <div class="remediation">
                  <div class="remediation-title">Suggested Fix</div>
                  <div class="remediation-text">${remediation}</div>
                  <a href="${docLink}" target="_blank" class="doc-link">
                    View documentation →
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    ` : `
      <div class="all-passed">
        <div class="all-passed-icon">✓</div>
        <div class="all-passed-title">All Tests Passed</div>
        <div class="all-passed-subtitle">Your agent passed all ${results.total} forensic audit cases.</div>
      </div>
    `}
    
    <footer>
      <p>Generated by F.A.I.L. Kit &mdash; <strong>No trace, no ship.</strong></p>
    </footer>
  </div>
  
  <div id="toast" class="toast"></div>
  
  <script>
    // Report data for sharing
    const reportData = ${JSON.stringify({
      timestamp: results.timestamp,
      endpoint: results.endpoint,
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      duration_ms: results.duration_ms,
      failures: failures.map(f => ({
        case: f.case,
        reason: f.reason || f.error,
        expected: f.expected,
        actual: f.actual
      }))
    })};
    
    // LZ-String compression (minimal implementation)
    const LZString = {
      compressToEncodedURIComponent: function(input) {
        if (input == null) return "";
        return btoa(encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, p1) => 
          String.fromCharCode('0x' + p1)
        )).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
      }
    };
    
    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
    
    function shareReport() {
      const btn = document.querySelector('.share-btn');
      try {
        // Compress report data
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(reportData));
        
        // For now, just copy the full HTML as a data URL
        // A proper implementation would use a sharing service
        const dataUrl = window.location.href;
        
        // Copy current page URL or generate a blob URL
        const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Try to save as file
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fail-kit-report-' + new Date().toISOString().split('T')[0] + '.html';
        
        // Copy compressed data to clipboard as fallback
        const shareText = 'F.A.I.L. Kit Report: ' + reportData.passed + '/' + reportData.total + ' passed';
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareText + '\\n\\nReport data (base64):\\n' + compressed.substring(0, 500) + '...');
          btn.classList.add('copied');
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg> Copied!';
          showToast('Report summary copied to clipboard! Download the HTML file to share the full report.');
          
          // Trigger download
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share Report';
          }, 2000);
        } else {
          // Fallback: just download
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Report downloaded! Share the HTML file with your team.');
        }
      } catch (err) {
        showToast('Could not share report: ' + err.message);
      }
    }
  </script>
</body>
</html>`;
}

module.exports = {
  generateHtmlReport,
  getSeverity,
  getDocLink,
  getRemediation
};
