/**
 * F.A.I.L. Kit - Professional Audit Report Generator
 * Compact, data-dense report format for AI agent auditing
 */

const { generateErrorExplanation } = require('../error-explainer');

/**
 * Get severity level for a case ID
 */
function getSeverity(caseId) {
  if (caseId.includes('CONTRACT_0003') || caseId.includes('CONTRACT_02') || caseId.includes('AGENT_0008')) {
    return 'critical';
  }
  if (caseId.startsWith('ADV_') || caseId.startsWith('AGENT_')) {
    return 'high';
  }
  if (caseId.startsWith('RAG_') || caseId.startsWith('SHIFT_')) {
    return 'medium';
  }
  return 'low';
}

/**
 * Get category metadata
 */
function getCategoryMeta(prefix) {
  const meta = {
    CONTRACT: { name: 'Contract', color: '#6366f1', icon: 'C' },
    AGENT: { name: 'Agent', color: '#f97316', icon: 'A' },
    ADV: { name: 'Adversarial', color: '#ef4444', icon: 'X' },
    RAG: { name: 'RAG', color: '#8b5cf6', icon: 'R' },
    SHIFT: { name: 'Distribution', color: '#14b8a6', icon: 'S' },
    GROUND: { name: 'Grounding', color: '#3b82f6', icon: 'G' },
    AUTO: { name: 'Auto-Gen', color: '#10b981', icon: 'Z' }
  };
  return meta[prefix] || { name: prefix, color: '#666', icon: '?' };
}

/**
 * Generate professional report HTML
 */
function generateDashboard(results) {
  const failures = results.results.filter(r => !r.pass);
  const passes = results.results.filter(r => r.pass);
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  
  // Group by severity
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  failures.forEach(f => {
    const severity = getSeverity(f.case);
    severityCounts[severity]++;
  });
  
  // Group by category
  const categories = {};
  results.results.forEach(r => {
    const prefix = r.case.split('_')[0];
    if (!categories[prefix]) {
      categories[prefix] = { tests: [], passed: 0, failed: 0 };
    }
    categories[prefix].tests.push(r);
    if (r.pass) categories[prefix].passed++;
    else categories[prefix].failed++;
  });
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>F.A.I.L. Kit Audit Report - ${results.endpoint}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg-primary: #0a0e1a;
      --bg-secondary: #111827;
      --bg-tertiary: #1f2937;
      --border: rgba(255, 255, 255, 0.08);
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      --accent: #22d3ee;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      font-size: 13px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    
    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }
    
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .brand-icon {
      width: 28px;
      height: 28px;
      background: var(--accent);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: var(--bg-primary);
      font-size: 14px;
    }
    
    .brand-text {
      font-size: 16px;
      font-weight: 700;
    }
    
    .brand-subtitle {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    
    .header-actions button {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .header-actions button:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    
    /* Status Bar */
    .status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .status-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .status-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
    }
    
    .status-verified {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 2px solid var(--success);
    }
    
    .status-failed {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      border: 2px solid var(--danger);
    }
    
    .status-info h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    .status-info p {
      font-size: 11px;
      color: var(--text-muted);
    }
    
    .status-meta {
      text-align: right;
      font-size: 11px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    
    .status-meta div {
      margin-bottom: 2px;
    }
    
    /* Grid Layout */
    .grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 20px;
    }
    
    /* Card */
    .card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .card-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .card-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-secondary);
    }
    
    .card-body {
      padding: 16px;
    }
    
    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .metric {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    
    .metric-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent);
      line-height: 1;
    }
    
    .metric-subtitle {
      font-size: 10px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    
    /* Timeline */
    .timeline-lanes {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .timeline-lane {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
    }
    
    .lane-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    
    .lane-badge {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 10px;
      color: white;
    }
    
    .lane-name {
      font-size: 12px;
      font-weight: 600;
    }
    
    .lane-stats {
      font-size: 10px;
      color: var(--text-muted);
      margin-left: auto;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .lane-events {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    
    .event-dot {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .event-dot.pass {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid var(--success);
      color: var(--success);
    }
    
    .event-dot.fail {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid var(--danger);
      color: var(--danger);
    }
    
    .event-dot:hover {
      transform: scale(1.1);
      box-shadow: 0 0 12px currentColor;
    }
    
    .event-dot.selected {
      box-shadow: 0 0 16px currentColor;
      transform: scale(1.15);
    }
    
    /* Forensic Panel */
    .forensic-panel {
      position: sticky;
      top: 20px;
      height: calc(100vh - 40px);
      display: flex;
      flex-direction: column;
    }
    
    .forensic-search {
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border);
    }
    
    .search-input {
      width: 100%;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      color: var(--text-primary);
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    .filter-row {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    
    .filter-chip {
      padding: 4px 8px;
      font-size: 9px;
      font-weight: 600;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .filter-chip:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .filter-chip.active {
      background: rgba(34, 211, 238, 0.15);
      border-color: var(--accent);
      color: var(--accent);
    }
    
    .forensic-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    
    .forensic-item {
      padding: 10px 12px;
      margin-bottom: 6px;
      border-radius: 6px;
      cursor: pointer;
      border-left: 2px solid transparent;
      background: rgba(255, 255, 255, 0.02);
      transition: all 0.2s;
    }
    
    .forensic-item:hover {
      background: rgba(255, 255, 255, 0.05);
      border-left-color: var(--accent);
    }
    
    .forensic-item.selected {
      background: rgba(34, 211, 238, 0.1);
      border-left-color: var(--accent);
    }
    
    .forensic-item.fail {
      border-left-color: var(--danger);
    }
    
    .forensic-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    
    .forensic-time {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--text-muted);
    }
    
    .tag {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 5px;
      border-radius: 3px;
      letter-spacing: 0.5px;
    }
    
    .tag-critical { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .tag-high { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .tag-medium { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .tag-low { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
    
    .forensic-case {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 3px;
    }
    
    .forensic-type {
      font-size: 10px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
    
    .forensic-details {
      font-size: 10px;
      color: var(--text-muted);
      line-height: 1.4;
      font-family: 'JetBrains Mono', monospace;
    }
    
    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    @media print {
      .header-actions, .filter-row { display: none; }
      .forensic-panel { position: static; height: auto; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="brand">
        <div class="brand-icon">F</div>
        <div>
          <div class="brand-text">F.A.I.L. Kit Audit Report</div>
          <div class="brand-subtitle">Forensic Analysis of Intelligent Logic</div>
        </div>
      </div>
      <div class="header-actions">
        <button onclick="window.print()">Export PDF</button>
        <button onclick="exportReport()">Download HTML</button>
      </div>
    </div>
    
    <!-- Status Bar -->
    <div class="status-bar">
      <div class="status-left">
        <div class="status-badge ${passRate >= 80 ? 'status-verified' : 'status-failed'}">
          ${passRate >= 80 ? '✓' : '✗'}
        </div>
        <div class="status-info">
          <h3>STATUS: ${passRate >= 80 ? 'VERIFIED' : 'FAILED'}</h3>
          <p>${passRate >= 80 ? 'System integrity confirmed' : 'System integrity compromised - review failures'}</p>
        </div>
      </div>
      <div class="status-meta">
        <div><strong>Date:</strong> ${new Date(results.timestamp).toLocaleString()}</div>
        <div><strong>Tests:</strong> ${results.passed}/${results.total} passed (${passRate}%)</div>
        <div><strong>Duration:</strong> ${((results.duration_ms || 0) / 1000).toFixed(2)}s</div>
        <div><strong>Endpoint:</strong> ${results.endpoint}</div>
      </div>
    </div>
    
    <!-- Metrics Grid -->
    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-label">Pass Rate</div>
        <div class="metric-value">${passRate}%</div>
        <div class="metric-subtitle">${results.passed} of ${results.total}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Total Failures</div>
        <div class="metric-value" style="color: var(--danger)">${failures.length}</div>
        <div class="metric-subtitle">${severityCounts.critical} critical, ${severityCounts.high} high</div>
      </div>
      <div class="metric">
        <div class="metric-label">Test Duration</div>
        <div class="metric-value" style="color: var(--warning); font-size: 24px;">${((results.duration_ms || 0) / 1000).toFixed(2)}s</div>
        <div class="metric-subtitle">${(results.duration_ms / results.total).toFixed(0)}ms avg</div>
      </div>
    </div>
    
    <!-- Main Grid -->
    <div class="grid">
      <div>
        <!-- Timeline -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Test Execution Timeline</div>
            <div style="font-size: 10px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">
              ${Object.keys(categories).length} categories · ${results.total} tests
            </div>
          </div>
          <div class="card-body">
            <div class="timeline-lanes">
              ${Object.entries(categories).map(([catName, catData]) => {
                const meta = getCategoryMeta(catName);
                return `
                  <div class="timeline-lane">
                    <div class="lane-header">
                      <div class="lane-badge" style="background: ${meta.color}">
                        ${meta.icon}
                      </div>
                      <div class="lane-name">${meta.name}</div>
                      <div class="lane-stats">${catData.passed}/${catData.tests.length} passed</div>
                    </div>
                    <div class="lane-events">
                      ${catData.tests.map((test, idx) => {
                        return `
                          <div class="event-dot ${test.pass ? 'pass' : 'fail'}" 
                               data-idx="${results.results.indexOf(test)}"
                               onclick="selectEvent(${results.results.indexOf(test)})"
                               title="${test.case}: ${test.pass ? 'PASS' : 'FAIL'}">
                            ${test.pass ? '✓' : '✗'}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Forensic Panel -->
      <div class="card forensic-panel">
        <div class="card-header">
          <div class="card-title">Forensic Details</div>
          <div style="font-size: 10px; color: var(--text-muted);">${results.results.length} events</div>
        </div>
        
        <div class="forensic-search">
          <input type="text" class="search-input" placeholder="Search tests..." id="forensic-search">
          <div class="filter-row">
            <button class="filter-chip active" onclick="applyFilter('all', this)">All (${results.results.length})</button>
            <button class="filter-chip" onclick="applyFilter('fail', this)">Failed (${failures.length})</button>
            <button class="filter-chip" onclick="applyFilter('pass', this)">Passed (${passes.length})</button>
            <button class="filter-chip" onclick="applyFilter('critical', this)">Critical (${severityCounts.critical})</button>
            <button class="filter-chip" onclick="applyFilter('high', this)">High (${severityCounts.high})</button>
          </div>
        </div>
        
        <div class="forensic-list" id="forensic-list">
          ${results.results.map((result, idx) => {
            const severity = getSeverity(result.case);
            const category = result.case.split('_')[0];
            const meta = getCategoryMeta(category);
            const timeOffset = idx * 100;
            const timestamp = new Date(new Date(results.timestamp).getTime() + timeOffset).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
            
            return `
              <div class="forensic-item ${result.pass ? 'pass' : 'fail'}" 
                   data-idx="${idx}"
                   data-status="${result.pass ? 'pass' : 'fail'}"
                   data-severity="${severity}"
                   onclick="selectForensicItem(${idx})">
                <div class="forensic-header">
                  <div class="forensic-time">${timestamp}</div>
                  <span class="tag tag-${severity}">${severity}</span>
                </div>
                <div class="forensic-case">${result.case}</div>
                <div class="forensic-type">${meta.name} · ${result.pass ? 'PASS ✓' : 'FAIL ✗'} · ${result.duration_ms || 0}ms</div>
                <div class="forensic-details">
                  ${result.pass ? 
                    `Validation successful` : 
                    `${result.reason || result.error || 'Test failed'}`
                  }
                  ${result.source_location || (result.response && result.response.source_location) ? 
                    `<br>Source: ${(result.source_location || result.response.source_location).file}:${(result.source_location || result.response.source_location).line}` : 
                    ''
                  }
                  ${result.request && result.request.inputs ? 
                    `<br>Input: ${JSON.stringify(result.request.inputs).substring(0, 60)}${JSON.stringify(result.request.inputs).length > 60 ? '...' : ''}` : 
                    ''
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const fullResults = ${JSON.stringify(results, null, 2)};
    
    function selectEvent(idx) {
      document.querySelectorAll('.event-dot').forEach(el => el.classList.remove('selected'));
      document.querySelectorAll('.forensic-item').forEach(el => el.classList.remove('selected'));
      
      const event = document.querySelector(\`.event-dot[data-idx="\${idx}"]\`);
      if (event) event.classList.add('selected');
      
      const forensicItem = document.querySelector(\`.forensic-item[data-idx="\${idx}"]\`);
      if (forensicItem) {
        forensicItem.classList.add('selected');
        forensicItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    
    function selectForensicItem(idx) {
      selectEvent(idx);
    }
    
    function applyFilter(filter, button) {
      document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      document.querySelectorAll('.forensic-item').forEach(item => {
        const status = item.dataset.status;
        const severity = item.dataset.severity;
        
        let show = false;
        if (filter === 'all') show = true;
        else if (filter === 'pass' || filter === 'fail') show = status === filter;
        else show = severity === filter;
        
        item.style.display = show ? 'block' : 'none';
      });
    }
    
    document.getElementById('forensic-search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.forensic-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'block' : 'none';
      });
    });
    
    function exportReport() {
      const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fail-audit-report-' + new Date().toISOString().split('T')[0] + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
}

module.exports = {
  generateDashboard,
  getSeverity,
  getCategoryMeta
};
