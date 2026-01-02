/**
 * F.A.I.L. Kit - Interactive Dashboard Generator
 * Enterprise-style observability dashboard for audit results
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
 * Syntax highlight JSON
 */
function syntaxHighlightJson(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
 * Generate interactive dashboard HTML
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
  
  // Group by category for timeline
  const categories = {};
  results.results.forEach(r => {
    const prefix = r.case.split('_')[0];
    if (!categories[prefix]) {
      categories[prefix] = [];
    }
    categories[prefix].push(r);
  });
  
  // Serialize full results data for JavaScript
  const resultsData = JSON.stringify(results.results.map((r, idx) => ({
    id: `test-${idx}`,
    case: r.case,
    pass: r.pass,
    reason: r.reason || r.error,
    expected: r.expected,
    actual: r.actual,
    duration_ms: r.duration_ms || 0,
    severity: getSeverity(r.case),
    category: r.case.split('_')[0],
    request: r.request,
    response: r.response,
    outputs: r.outputs,
    source_location: r.source_location || (r.response && r.response.source_location)
  })));
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>F.A.I.L. Kit Dashboard - ${results.endpoint}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg-primary: #0b0f14;
      --bg-secondary: #111827;
      --bg-tertiary: #1f2937;
      --border: rgba(255, 255, 255, 0.1);
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      --accent: #22d3ee;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 100vh;
    }
    
    /* Top Navigation */
    .top-nav {
      height: 56px;
      border-bottom: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .nav-left {
      display: flex;
      align-items: center;
      gap: 32px;
    }
    
    .app-title {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .app-badge {
      background: linear-gradient(135deg, var(--accent), #06b6d4);
      color: var(--bg-primary);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    
    .nav-tabs {
      display: flex;
      gap: 8px;
    }
    
    .nav-tab {
      padding: 8px 16px;
      font-size: 14px;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;
      position: relative;
      background: none;
      border: none;
    }
    
    .nav-tab.active {
      color: var(--text-primary);
      background: rgba(34, 211, 238, 0.1);
    }
    
    .nav-tab.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
    }
    
    .nav-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .nav-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      background: none;
      border: none;
    }
    
    .nav-icon:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
    }
    
    /* Main Layout */
    .main-container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 450px;
      gap: 16px;
    }
    
    .view-section {
      display: none;
    }
    
    .view-section.active {
      display: block;
    }
    
    /* Card Base */
    .card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
      overflow: hidden;
    }
    
    .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .card-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-secondary);
    }
    
    .card-body {
      padding: 20px;
    }
    
    /* Status Card */
    .status-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
    }
    
    .status-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 600;
    }
    
    .status-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    
    .status-verified {
      background: rgba(16, 185, 129, 0.2);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    
    .status-failed {
      background: rgba(239, 68, 68, 0.2);
      color: var(--danger);
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    
    .status-meta {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    /* Timeline */
    .timeline-container {
      min-height: 400px;
      position: relative;
    }
    
    .timeline-lanes {
      display: flex;
      flex-direction: column;
      gap: 32px;
      margin-top: 40px;
    }
    
    .timeline-lane {
      position: relative;
    }
    
    .timeline-lane-header {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .timeline-track {
      height: 40px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }
    
    .timeline-event {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
    
    .timeline-event.pass {
      background: rgba(16, 185, 129, 0.2);
      border: 2px solid var(--success);
    }
    
    .timeline-event.fail {
      background: rgba(239, 68, 68, 0.2);
      border: 2px solid var(--danger);
    }
    
    .timeline-event:hover {
      transform: translateY(-50%) scale(1.2);
      box-shadow: 0 0 20px currentColor;
    }
    
    /* Forensic Log */
    .forensic-panel {
      height: calc(100vh - 120px);
      display: flex;
      flex-direction: column;
    }
    
    .forensic-search {
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }
    
    .search-input {
      width: 100%;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
      color: var(--text-primary);
      font-size: 13px;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.1);
    }
    
    .forensic-filters {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    
    .filter-btn {
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .filter-btn.active {
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
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }
    
    .forensic-item:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    
    .forensic-item.selected {
      background: rgba(34, 211, 238, 0.08);
      border-left-color: var(--accent);
    }
    
    .forensic-item.expanded {
      background: rgba(34, 211, 238, 0.05);
    }
    
    .forensic-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    
    .forensic-case {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
    }
    
    .severity-tag {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.5px;
    }
    
    .severity-critical { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .severity-high { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .severity-medium { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .severity-low { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
    
    .forensic-item-meta {
      font-size: 11px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    
    .forensic-item-details {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      display: none;
      font-size: 12px;
    }
    
    .forensic-item.expanded .forensic-item-details {
      display: block;
    }
    
    .detail-section {
      margin-bottom: 12px;
    }
    
    .detail-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
    
    .detail-content {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      line-height: 1.6;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .detail-content pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .json-string { color: #ce9178; }
    .json-number { color: #b5cea8; }
    .json-boolean { color: #569cd6; }
    .json-null { color: #569cd6; }
    .json-key { color: #9cdcfe; }
    
    .source-location-box {
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 4px;
      padding: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
    }
    
    .source-location-box div {
      margin-bottom: 4px;
    }
    
    .source-location-box div:last-child {
      margin-bottom: 0;
    }
    
    /* Metrics Row */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    
    .metric-card {
      text-align: center;
      padding: 24px;
    }
    
    .metric-value {
      font-size: 48px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      background: linear-gradient(135deg, var(--accent), #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .metric-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-secondary);
      margin-top: 8px;
    }
    
    .metric-chart {
      height: 80px;
      margin-top: 16px;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      justify-content: center;
    }
    
    .chart-bar {
      flex: 1;
      background: linear-gradient(to top, var(--accent), rgba(34, 211, 238, 0.3));
      border-radius: 2px;
      min-height: 8px;
      transition: all 0.3s;
    }
    
    .chart-bar:hover {
      background: var(--accent);
      box-shadow: 0 0 12px var(--accent);
    }
    
    /* Tooltip */
    .tooltip {
      position: fixed;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      max-width: 350px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      display: none;
    }
    
    .tooltip.show {
      display: block;
    }
    
    .tooltip-title {
      font-weight: 600;
      margin-bottom: 8px;
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent);
    }
    
    .tooltip-content {
      color: var(--text-secondary);
      line-height: 1.6;
    }
    
    /* Responsive */
    @media (max-width: 1200px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
      .forensic-panel {
        height: auto;
        max-height: 600px;
      }
    }
    
    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    /* Export Modal */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    
    .modal.show {
      display: flex;
    }
    
    .modal-content {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
    }
    
    .modal-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .modal-body {
      margin-bottom: 20px;
    }
    
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    
    .btn-primary {
      background: var(--accent);
      color: var(--bg-primary);
    }
    
    .btn-primary:hover {
      background: #06b6d4;
    }
    
    .btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }
    
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  </style>
</head>
<body>
  <div class="top-nav">
    <div class="nav-left">
      <div class="app-title">
        <span>F.A.I.L. Kit</span>
        <span class="app-badge">FORENSIC</span>
      </div>
      <div class="nav-tabs">
        <button class="nav-tab active" data-view="dashboard">Dashboard</button>
        <button class="nav-tab" data-view="timeline">Timeline</button>
        <button class="nav-tab" data-view="forensics">Forensics</button>
        <button class="nav-tab" data-view="reports">Reports</button>
      </div>
    </div>
    <div class="nav-right">
      <button class="nav-icon" id="export-btn" title="Export">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5m0 0l5 5m-5-5v12"/>
        </svg>
      </button>
      <button class="nav-icon" id="settings-btn" title="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
        </svg>
      </button>
    </div>
  </div>
  
  <div class="main-container">
    <!-- Dashboard View -->
    <div class="view-section active" id="dashboard-view">
      <div class="dashboard-grid">
        <div>
          <!-- Status Card -->
          <div class="card" style="margin-bottom: 16px;">
            <div class="status-card">
              <div class="status-badge">
                <div class="status-icon ${passRate >= 80 ? 'status-verified' : 'status-failed'}">
                  ${passRate >= 80 ? '✓' : '✗'}
                </div>
                <div>
                  <div style="font-size: 16px;">Status: ${passRate >= 80 ? 'VERIFIED' : 'FAILED'}</div>
                  <div style="font-size: 12px; color: var(--text-muted);">${results.passed}/${results.total} tests passed</div>
                </div>
              </div>
              <div class="status-meta">
                <div>Last updated: ${new Date(results.timestamp).toLocaleString()}</div>
                <div>Duration: ${((results.duration_ms || 0) / 1000).toFixed(2)}s</div>
                <div>Endpoint: ${results.endpoint || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <!-- Timeline Card -->
          <div class="card" style="margin-bottom: 16px;">
            <div class="card-header">
              <div class="card-title">AI Agent Action Timeline</div>
              <div style="font-size: 11px; color: var(--text-muted);">Click events to filter forensic log</div>
            </div>
            <div class="card-body">
              <div class="timeline-container">
                <div class="timeline-lanes">
                  ${Object.entries(categories).map(([category, tests]) => `
                    <div class="timeline-lane">
                      <div class="timeline-lane-header">${category} (${tests.filter(t => !t.pass).length}/${tests.length} failed)</div>
                      <div class="timeline-track" id="track-${category}">
                        ${tests.map((test, idx) => {
                          const position = (idx / tests.length) * 95;
                          return `
                            <div class="timeline-event ${test.pass ? 'pass' : 'fail'}" 
                                 style="left: ${position}%"
                                 data-case="${test.case}"
                                 data-status="${test.pass ? 'PASS' : 'FAIL'}"
                                 data-reason="${(test.reason || test.error || 'N/A').replace(/"/g, '&quot;')}"
                                 data-duration="${test.duration_ms || 0}"
                                 data-severity="${getSeverity(test.case)}">
                              ${test.pass ? '✓' : '✗'}
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Metrics Row -->
          <div class="metrics-row">
            <div class="card metric-card">
              <div class="metric-value">${passRate}%</div>
              <div class="metric-label">Pass Rate</div>
              <div class="metric-chart">
                ${Object.entries(categories).slice(0, 8).map(([cat, tests]) => {
                  const passRate = tests.length > 0 ? (tests.filter(t => t.pass).length / tests.length) * 100 : 0;
                  return `<div class="chart-bar" style="height: ${Math.max(passRate, 10)}%" title="${cat}: ${passRate.toFixed(0)}%"></div>`;
                }).join('')}
              </div>
            </div>
            
            <div class="card metric-card">
              <div class="metric-value">${results.total}</div>
              <div class="metric-label">Total Tests</div>
              <div class="metric-chart">
                ${Object.values(severityCounts).map((count, idx) => {
                  const height = results.total > 0 ? (count / results.total) * 100 : 0;
                  return `<div class="chart-bar" style="height: ${Math.max(height, 10)}%"></div>`;
                }).join('')}
              </div>
            </div>
            
            <div class="card metric-card">
              <div class="metric-value">${severityCounts.critical}</div>
              <div class="metric-label">Critical</div>
              <div class="metric-chart">
                ${['critical', 'high', 'medium', 'low'].map(sev => {
                  const count = severityCounts[sev];
                  const maxCount = Math.max(...Object.values(severityCounts), 1);
                  const height = (count / maxCount) * 100;
                  return `<div class="chart-bar" style="height: ${Math.max(height, 10)}%"></div>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Forensic Log Panel -->
        <div class="card forensic-panel">
          <div class="card-header">
            <div class="card-title">Forensic Log Details</div>
            <div style="font-size: 11px; color: var(--text-muted);">Click items to expand</div>
          </div>
          <div class="forensic-search">
            <input type="text" class="search-input" placeholder="Search test cases..." id="forensic-search">
            <div class="forensic-filters">
              <button class="filter-btn active" data-filter="all">All (${results.total})</button>
              <button class="filter-btn" data-filter="fail">Failed (${failures.length})</button>
              <button class="filter-btn" data-filter="pass">Passed (${passes.length})</button>
              <button class="filter-btn" data-filter="critical">Critical (${severityCounts.critical})</button>
              <button class="filter-btn" data-filter="high">High (${severityCounts.high})</button>
            </div>
          </div>
          <div class="forensic-list" id="forensic-list">
            ${results.results.map((result, idx) => `
              <div class="forensic-item" data-idx="${idx}" data-case="${result.case}" data-status="${result.pass ? 'pass' : 'fail'}" data-severity="${getSeverity(result.case)}">
                <div class="forensic-item-header">
                  <div class="forensic-case">${result.case}</div>
                  <div class="severity-tag severity-${getSeverity(result.case)}">${getSeverity(result.case)}</div>
                </div>
                <div class="forensic-item-meta">
                  ${result.pass ? '✓ PASS' : '✗ FAIL'} · ${result.duration_ms || 0}ms
                  ${(result.source_location || (result.response && result.response.source_location)) ? ` · ${(result.source_location || result.response.source_location).file}:${(result.source_location || result.response.source_location).line}` : ''}
                </div>
                <div class="forensic-item-details">
                  ${result.reason || result.error ? `
                    <div class="detail-section">
                      <div class="detail-label">Failure Reason</div>
                      <div class="detail-content">${result.reason || result.error}</div>
                    </div>
                  ` : ''}
                  
                  ${(result.source_location || (result.response && result.response.source_location)) ? `
                    <div class="detail-section">
                      <div class="detail-label">Source Location</div>
                      <div class="source-location-box">
                        <div><strong>File:</strong> ${(result.source_location || result.response.source_location).file}</div>
                        ${(result.source_location || result.response.source_location).function ? `<div><strong>Function:</strong> ${(result.source_location || result.response.source_location).function}</div>` : ''}
                        <div><strong>Line:</strong> ${(result.source_location || result.response.source_location).line}${(result.source_location || result.response.source_location).column ? `:${(result.source_location || result.response.source_location).column}` : ''}</div>
                      </div>
                    </div>
                  ` : ''}
                  
                  ${result.request ? `
                    <div class="detail-section">
                      <div class="detail-label">Request</div>
                      <div class="detail-content">
                        <pre>${syntaxHighlightJson(result.request)}</pre>
                      </div>
                    </div>
                  ` : ''}
                  
                  ${result.response || result.outputs ? `
                    <div class="detail-section">
                      <div class="detail-label">Response</div>
                      <div class="detail-content">
                        <pre>${syntaxHighlightJson(result.response || result.outputs)}</pre>
                      </div>
                    </div>
                  ` : ''}
                  
                  ${result.expected ? `
                    <div class="detail-section">
                      <div class="detail-label">Expected</div>
                      <div class="detail-content">
                        <pre>${syntaxHighlightJson(result.expected)}</pre>
                      </div>
                    </div>
                  ` : ''}
                  
                  ${result.actual ? `
                    <div class="detail-section">
                      <div class="detail-label">Actual</div>
                      <div class="detail-content">
                        <pre>${syntaxHighlightJson(result.actual)}</pre>
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Other views placeholder -->
    <div class="view-section" id="timeline-view">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Timeline View</div>
        </div>
        <div class="card-body">
          <p style="color: var(--text-secondary);">Detailed timeline view with all test execution data.</p>
        </div>
      </div>
    </div>
    
    <div class="view-section" id="forensics-view">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Forensics View</div>
        </div>
        <div class="card-body">
          <p style="color: var(--text-secondary);">Full forensic analysis with detailed test case breakdown.</p>
        </div>
      </div>
    </div>
    
    <div class="view-section" id="reports-view">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Reports View</div>
        </div>
        <div class="card-body">
          <p style="color: var(--text-secondary);">Generate and export reports in various formats.</p>
        </div>
      </div>
    </div>
  </div>
  
  <div class="tooltip" id="tooltip">
    <div class="tooltip-title"></div>
    <div class="tooltip-content"></div>
  </div>
  
  <!-- Export Modal -->
  <div class="modal" id="export-modal">
    <div class="modal-content">
      <div class="modal-title">Export Report</div>
      <div class="modal-body">
        <p style="color: var(--text-secondary); margin-bottom: 12px;">Choose export format:</p>
        <button class="btn btn-primary" style="width: 100%; margin-bottom: 8px;" onclick="exportJSON()">Export as JSON</button>
        <button class="btn btn-secondary" style="width: 100%;" onclick="exportHTML()">Save Dashboard HTML</button>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>
  </div>
  
  <script>
    // Store full test data
    const testData = ${resultsData};
    
    // Timeline event interactions
    document.querySelectorAll('.timeline-event').forEach(event => {
      // Tooltip on hover
      event.addEventListener('mouseenter', (e) => {
        const tooltip = document.getElementById('tooltip');
        const rect = e.target.getBoundingClientRect();
        const testCase = e.target.dataset.case;
        const test = testData.find(t => t.case === testCase);
        
        tooltip.querySelector('.tooltip-title').textContent = testCase;
        tooltip.querySelector('.tooltip-content').innerHTML = \`
          <strong>Status:</strong> \${e.target.dataset.status}<br>
          <strong>Duration:</strong> \${e.target.dataset.duration}ms<br>
          <strong>Severity:</strong> \${e.target.dataset.severity}<br>
          \${e.target.dataset.reason !== 'N/A' ? \`<strong>Reason:</strong> \${e.target.dataset.reason}\` : ''}
        \`;
        
        tooltip.style.left = Math.min(rect.left, window.innerWidth - 350) + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
        tooltip.classList.add('show');
      });
      
      event.addEventListener('mouseleave', () => {
        document.getElementById('tooltip').classList.remove('show');
      });
      
      // Click to filter forensic log
      event.addEventListener('click', (e) => {
        const testCase = e.target.dataset.case;
        const forensicItem = document.querySelector(\`.forensic-item[data-case="\${testCase}"]\`);
        if (forensicItem) {
          // Scroll to item
          forensicItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Select and expand
          document.querySelectorAll('.forensic-item').forEach(i => i.classList.remove('selected'));
          forensicItem.classList.add('selected', 'expanded');
        }
      });
    });
    
    // Forensic search
    document.getElementById('forensic-search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.forensic-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'block' : 'none';
      });
    });
    
    // Forensic filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const filter = e.target.dataset.filter;
        document.querySelectorAll('.forensic-item').forEach(item => {
          if (filter === 'all') {
            item.style.display = 'block';
          } else if (filter === 'fail' || filter === 'pass') {
            item.style.display = item.dataset.status === filter ? 'block' : 'none';
          } else {
            item.style.display = item.dataset.severity === filter ? 'block' : 'none';
          }
        });
      });
    });
    
    // Forensic item click to expand
    document.querySelectorAll('.forensic-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't toggle if clicking inside details
        if (e.target.closest('.forensic-item-details')) return;
        
        item.classList.toggle('expanded');
        document.querySelectorAll('.forensic-item').forEach(i => {
          if (i !== item) i.classList.remove('selected');
        });
        item.classList.add('selected');
      });
    });
    
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        document.getElementById(view + '-view').classList.add('active');
      });
    });
    
    // Export button
    document.getElementById('export-btn').addEventListener('click', () => {
      document.getElementById('export-modal').classList.add('show');
    });
    
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      alert('Settings panel coming soon!\\n\\nCurrent features:\\n- Interactive timeline\\n- Real-time search\\n- Expandable forensic details\\n- Multiple export formats');
    });
    
    function closeModal() {
      document.getElementById('export-modal').classList.remove('show');
    }
    
    function exportJSON() {
      const dataStr = JSON.stringify(testData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fail-kit-audit-' + new Date().toISOString().split('T')[0] + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      closeModal();
    }
    
    function exportHTML() {
      const html = document.documentElement.outerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fail-kit-dashboard-' + new Date().toISOString().split('T')[0] + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      closeModal();
    }
    
    // Close modal on outside click
    document.getElementById('export-modal').addEventListener('click', (e) => {
      if (e.target.id === 'export-modal') {
        closeModal();
      }
    });
  </script>
</body>
</html>`;
}

module.exports = {
  generateDashboard,
  getSeverity
};
