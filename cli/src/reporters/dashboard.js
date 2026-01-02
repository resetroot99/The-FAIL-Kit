/**
 * F.A.I.L. Kit - Interactive Dashboard Generator
 * Enterprise-style observability dashboard for audit results
 */

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
  
  // Create timeline events
  const events = results.results.map((r, idx) => ({
    id: `evt-${idx}`,
    timestamp: new Date(Date.parse(results.timestamp) + idx * 100).toISOString(),
    case: r.case,
    status: r.pass ? 'pass' : 'fail',
    severity: getSeverity(r.case),
    category: r.case.split('_')[0],
    duration: r.duration_ms || 0,
    reason: r.reason || r.error,
    source_location: r.source_location || (r.response && r.response.source_location)
  }));
  
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
      grid-template-columns: 1fr 400px;
      gap: 16px;
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
      max-width: 300px;
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
        <div class="nav-tab active">Dashboard</div>
        <div class="nav-tab">Timeline</div>
        <div class="nav-tab">Forensics</div>
        <div class="nav-tab">Reports</div>
      </div>
    </div>
    <div class="nav-right">
      <div class="nav-icon" title="Export">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5m0 0l5 5m-5-5v12"/>
        </svg>
      </div>
      <div class="nav-icon" title="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
        </svg>
      </div>
    </div>
  </div>
  
  <div class="main-container">
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
            </div>
          </div>
        </div>
        
        <!-- Timeline Card -->
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-header">
            <div class="card-title">AI Agent Action Timeline</div>
          </div>
          <div class="card-body">
            <div class="timeline-container">
              <div class="timeline-lanes">
                ${Object.entries(categories).map(([category, tests]) => `
                  <div class="timeline-lane">
                    <div class="timeline-lane-header">${category}</div>
                    <div class="timeline-track" id="track-${category}">
                      ${tests.map((test, idx) => {
                        const position = (idx / tests.length) * 95;
                        return `
                          <div class="timeline-event ${test.pass ? 'pass' : 'fail'}" 
                               style="left: ${position}%"
                               data-case="${test.case}"
                               data-status="${test.pass ? 'PASS' : 'FAIL'}"
                               data-reason="${test.reason || test.error || 'N/A'}"
                               data-duration="${test.duration_ms || 0}">
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
              ${Array.from({length: 10}, (_, i) => {
                const height = Math.random() * 100;
                return `<div class="chart-bar" style="height: ${height}%"></div>`;
              }).join('')}
            </div>
          </div>
          
          <div class="card metric-card">
            <div class="metric-value">${results.total}</div>
            <div class="metric-label">Total Tests</div>
            <div class="metric-chart">
              ${Object.values(severityCounts).map(count => {
                const height = results.total > 0 ? (count / results.total) * 100 : 0;
                return `<div class="chart-bar" style="height: ${Math.max(height, 10)}%"></div>`;
              }).join('')}
            </div>
          </div>
          
          <div class="card metric-card">
            <div class="metric-value">${failures.filter(f => getSeverity(f.case) === 'critical').length}</div>
            <div class="metric-label">Critical</div>
            <div class="metric-chart">
              ${['critical', 'high', 'medium', 'low'].map(sev => {
                const count = failures.filter(f => getSeverity(f.case) === sev).length;
                const height = failures.length > 0 ? (count / failures.length) * 100 : 0;
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
        </div>
        <div class="forensic-search">
          <input type="text" class="search-input" placeholder="Search test cases..." id="forensic-search">
          <div class="forensic-filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="fail">Failed</button>
            <button class="filter-btn" data-filter="pass">Passed</button>
            <button class="filter-btn" data-filter="critical">Critical</button>
          </div>
        </div>
        <div class="forensic-list" id="forensic-list">
          ${results.results.map((result, idx) => `
            <div class="forensic-item" data-idx="${idx}" data-status="${result.pass ? 'pass' : 'fail'}" data-severity="${getSeverity(result.case)}">
              <div class="forensic-item-header">
                <div class="forensic-case">${result.case}</div>
                <div class="severity-tag severity-${getSeverity(result.case)}">${getSeverity(result.case)}</div>
              </div>
              <div class="forensic-item-meta">
                ${result.pass ? '✓ PASS' : '✗ FAIL'} · ${result.duration_ms || 0}ms
                ${result.source_location ? ` · ${result.source_location.file}:${result.source_location.line}` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>
  
  <div class="tooltip" id="tooltip">
    <div class="tooltip-title"></div>
    <div class="tooltip-content"></div>
  </div>
  
  <script>
    // Timeline event tooltips
    document.querySelectorAll('.timeline-event').forEach(event => {
      event.addEventListener('mouseenter', (e) => {
        const tooltip = document.getElementById('tooltip');
        const rect = e.target.getBoundingClientRect();
        
        tooltip.querySelector('.tooltip-title').textContent = e.target.dataset.case;
        tooltip.querySelector('.tooltip-content').innerHTML = \`
          <strong>Status:</strong> \${e.target.dataset.status}<br>
          <strong>Duration:</strong> \${e.target.dataset.duration}ms<br>
          \${e.target.dataset.reason !== 'N/A' ? \`<strong>Reason:</strong> \${e.target.dataset.reason}\` : ''}
        \`;
        
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
        tooltip.classList.add('show');
      });
      
      event.addEventListener('mouseleave', () => {
        document.getElementById('tooltip').classList.remove('show');
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
    
    // Forensic item selection
    document.querySelectorAll('.forensic-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.forensic-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
      });
    });
  </script>
</body>
</html>`;
}

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

module.exports = {
  generateDashboard,
  getSeverity
};
