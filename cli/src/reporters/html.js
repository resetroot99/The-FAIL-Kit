/**
 * F.A.I.L. Kit - HTML Report Generator
 * Creates beautiful, shareable HTML reports with charts and detailed failure analysis.
 */

const { generateErrorExplanation } = require('../error-explainer');

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
    
    /* Categories */
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 48px;
    }
    
    .category-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: border-color 0.2s;
    }
    
    .category-card:hover {
      border-color: var(--accent);
    }
    
    .category-name {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    
    .category-stats {
      display: flex;
      justify-content: center;
      gap: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
    }
    
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
      <div class="meta">
        <div><span class="meta-value">${timestamp}</span></div>
        <div>Duration: <span class="meta-value">${duration}</span></div>
        <div>Endpoint: <span class="meta-value">${results.endpoint || 'N/A'}</span></div>
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
      ${Object.entries(categories).map(([name, data]) => `
        <div class="category-card">
          <div class="category-name">${name}</div>
          <div class="category-stats">
            <span class="stat-pass">${data.passed}✓</span>
            <span class="stat-fail">${data.failed}✗</span>
          </div>
        </div>
      `).join('')}
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
</body>
</html>`;
}

module.exports = {
  generateHtmlReport,
  getSeverity,
  getDocLink,
  getRemediation
};
