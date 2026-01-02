/**
 * F.A.I.L. Kit - Premium Dashboard Reporter
 * Clean, fast, organized audit reports
 */

const { execSync } = require('child_process');

function getSeverity(caseId) {
  if (caseId.includes('CONTRACT_0003') || caseId.includes('CONTRACT_02') || 
      caseId.includes('AGENT_0008') || caseId.includes('AUTO_receipt')) {
    return 'critical';
  }
  if (caseId.includes('REFUSE') || caseId.includes('CONTRACT_0004') || 
      caseId.startsWith('ADV_') || caseId.startsWith('GROUND_')) {
    return 'high';
  }
  if (caseId.startsWith('RAG_') || caseId.startsWith('SHIFT_') || caseId.startsWith('AGENT_')) {
    return 'medium';
  }
  return 'low';
}

function determineShipDecision(results) {
  const failures = results.results.filter(r => !r.pass);
  const criticalCount = failures.filter(f => getSeverity(f.case) === 'critical').length;
  const highCount = failures.filter(f => getSeverity(f.case) === 'high').length;
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  
  if (criticalCount > 0) {
    return {
      decision: 'BLOCK',
      color: '#ef4444',
      reason: `${criticalCount} critical failure${criticalCount > 1 ? 's' : ''} detected`,
      action: 'Fix missing receipts and unverified actions before deployment'
    };
  }
  
  if (highCount > 0 || results.failed >= 5) {
    return {
      decision: 'REVIEW',
      color: '#f59e0b',
      reason: `${results.failed} failure${results.failed > 1 ? 's' : ''} require attention`,
      action: 'Review high-severity issues and add policy gates'
    };
  }
  
  if (parseFloat(passRate) >= 95) {
    return {
      decision: 'SHIP',
      color: '#10b981',
      reason: `${passRate}% pass rate`,
      action: 'Clear to deploy. Monitor minor issues in production'
    };
  }
  
  return {
    decision: 'REVIEW',
    color: '#f59e0b',
    reason: `${passRate}% pass rate`,
    action: 'Address remaining failures to reach 95%+ threshold'
  };
}

function getGitInfo() {
  try {
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim().substring(0, 8);
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const dirty = execSync('git status --porcelain', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim().length > 0;
    return { hash, branch, dirty };
  } catch {
    return { hash: 'unknown', branch: 'unknown', dirty: false };
  }
}

function generateDashboard(results) {
  const failures = results.results.filter(r => !r.pass);
  const passes = results.results.filter(r => r.pass);
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  const shipDecision = determineShipDecision(results);
  const git = getGitInfo();
  
  // Group by category
  const categories = {};
  results.results.forEach(r => {
    const prefix = r.case.split('_')[0];
    if (!categories[prefix]) {
      categories[prefix] = { passed: 0, failed: 0, tests: [] };
    }
    categories[prefix].tests.push(r);
    if (r.pass) categories[prefix].passed++;
    else categories[prefix].failed++;
  });
  
  // Severity breakdown
  const severityCount = { critical: 0, high: 0, medium: 0, low: 0 };
  failures.forEach(f => severityCount[getSeverity(f.case)]++);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>F.A.I.L. Kit Audit Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg: #0a0a0a;
      --surface: #111111;
      --border: rgba(255, 255, 255, 0.06);
      --text: #ededed;
      --text-dim: #a1a1a1;
      --text-muted: #737373;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --accent: #3b82f6;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      font-size: 14px;
      -webkit-font-smoothing: antialiased;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    
    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      color: white;
    }
    
    .logo-text h1 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    .logo-text p {
      font-size: 12px;
      color: var(--text-muted);
    }
    
    .header-meta {
      text-align: right;
      font-size: 12px;
      color: var(--text-dim);
      font-family: 'SF Mono', 'Monaco', monospace;
    }
    
    .header-meta div {
      margin-bottom: 4px;
    }
    
    /* Ship Decision Card */
    .decision-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }
    
    .decision-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: ${shipDecision.color};
    }
    
    .decision-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .decision-badge {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      background: ${shipDecision.color}15;
      color: ${shipDecision.color};
      border: 1px solid ${shipDecision.color}40;
    }
    
    .decision-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      font-weight: 600;
    }
    
    .decision-content h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .decision-content p {
      font-size: 13px;
      color: var(--text-dim);
      line-height: 1.6;
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: border-color 0.2s;
    }
    
    .stat-card:hover {
      border-color: rgba(255, 255, 255, 0.12);
    }
    
    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 4px;
      font-variant-numeric: tabular-nums;
    }
    
    .stat-subtitle {
      font-size: 12px;
      color: var(--text-dim);
    }
    
    /* Section */
    .section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 24px;
      overflow: hidden;
    }
    
    .section-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .section-badge {
      font-size: 11px;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.03);
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'SF Mono', monospace;
    }
    
    .section-body {
      padding: 24px;
    }
    
    /* Category Grid */
    .category-grid {
      display: grid;
      gap: 12px;
    }
    
    .category-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 8px;
      transition: all 0.2s;
      cursor: pointer;
    }
    
    .category-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.1);
    }
    
    .category-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .category-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 13px;
    }
    
    .category-info h3 {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    .category-info p {
      font-size: 11px;
      color: var(--text-muted);
    }
    
    .category-stats {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
    }
    
    .category-pass {
      color: var(--success);
      font-weight: 600;
    }
    
    .category-fail {
      color: var(--danger);
      font-weight: 600;
    }
    
    /* Test List */
    .test-list {
      display: grid;
      gap: 8px;
    }
    
    .test-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 12px;
      transition: all 0.2s;
    }
    
    .test-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    
    .test-item.fail {
      border-left: 3px solid var(--danger);
    }
    
    .test-item.pass {
      border-left: 3px solid var(--success);
    }
    
    .test-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    
    .test-status {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      flex-shrink: 0;
    }
    
    .test-status.pass {
      background: var(--success)20;
      color: var(--success);
    }
    
    .test-status.fail {
      background: var(--danger)20;
      color: var(--danger);
    }
    
    .test-name {
      font-family: 'SF Mono', monospace;
      font-size: 12px;
      color: var(--text);
    }
    
    .test-severity {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .severity-critical {
      background: var(--danger)20;
      color: var(--danger);
    }
    
    .severity-high {
      background: var(--warning)20;
      color: var(--warning);
    }
    
    .severity-medium {
      background: var(--accent)20;
      color: var(--accent);
    }
    
    .severity-low {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
    }
    
    .test-time {
      font-family: 'SF Mono', monospace;
      font-size: 11px;
      color: var(--text-muted);
      margin-left: 12px;
    }
    
    /* Failure Details */
    .failure-details {
      margin-top: 8px;
      padding: 12px;
      background: rgba(239, 68, 68, 0.05);
      border-radius: 6px;
      font-size: 12px;
      color: var(--text-dim);
      border-left: 3px solid var(--danger);
    }
    
    .failure-reason {
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .failure-hint {
      font-size: 11px;
      color: var(--text-muted);
      font-style: italic;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .container {
        padding: 24px 16px;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
      
      .header-meta {
        text-align: left;
      }
    }
    
    /* Print Styles */
    @media print {
      body {
        background: white;
        color: black;
      }
      
      .section, .stat-card, .decision-card {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">
        <div class="logo-icon">F</div>
        <div class="logo-text">
          <h1>F.A.I.L. Kit Audit Report</h1>
          <p>Forensic Analysis of Intelligent Logic</p>
        </div>
      </div>
      <div class="header-meta">
        <div>${new Date(results.timestamp).toLocaleString()}</div>
        <div>${results.endpoint}</div>
        <div>${git.branch}@${git.hash}${git.dirty ? ' (dirty)' : ''}</div>
      </div>
    </div>
    
    <!-- Ship Decision -->
    <div class="decision-card">
      <div class="decision-header">
        <span class="decision-label">Ship Decision</span>
        <span class="decision-badge">${shipDecision.decision}</span>
      </div>
      <div class="decision-content">
        <h2>${shipDecision.reason}</h2>
        <p>${shipDecision.action}</p>
      </div>
    </div>
    
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Pass Rate</div>
        <div class="stat-value" style="color: ${passRate >= 95 ? 'var(--success)' : passRate >= 80 ? 'var(--warning)' : 'var(--danger)'}">
          ${passRate}%
        </div>
        <div class="stat-subtitle">${results.passed} of ${results.total} tests</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Critical</div>
        <div class="stat-value" style="color: ${severityCount.critical > 0 ? 'var(--danger)' : 'var(--text-muted)'}">
          ${severityCount.critical}
        </div>
        <div class="stat-subtitle">Blocks deployment</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">High Severity</div>
        <div class="stat-value" style="color: ${severityCount.high > 0 ? 'var(--warning)' : 'var(--text-muted)'}">
          ${severityCount.high}
        </div>
        <div class="stat-subtitle">Needs review</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Duration</div>
        <div class="stat-value" style="font-size: 24px;">
          ${((results.duration_ms || 0) / 1000).toFixed(1)}s
        </div>
        <div class="stat-subtitle">Total execution time</div>
      </div>
    </div>
    
    <!-- Categories -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">Test Categories</div>
        <div class="section-badge">${Object.keys(categories).length} categories</div>
      </div>
      <div class="section-body">
        <div class="category-grid">
          ${Object.entries(categories).map(([name, data]) => {
            const colors = {
              CONTRACT: '#6366f1',
              AGENT: '#f97316',
              ADV: '#ef4444',
              RAG: '#8b5cf6',
              SHIFT: '#14b8a6',
              GROUND: '#3b82f6',
              AUTO: '#10b981'
            };
            const color = colors[name] || '#666';
            
            return `
              <div class="category-item" onclick="toggleCategory('${name}')">
                <div class="category-left">
                  <div class="category-icon" style="background: ${color}20; color: ${color};">
                    ${name.charAt(0)}
                  </div>
                  <div class="category-info">
                    <h3>${name}</h3>
                    <p>${data.tests.length} tests</p>
                  </div>
                </div>
                <div class="category-stats">
                  <span class="category-pass">${data.passed} passed</span>
                  ${data.failed > 0 ? `<span class="category-fail">${data.failed} failed</span>` : ''}
                </div>
              </div>
              <div id="category-${name}" style="display: none; margin-left: 44px;">
                <div class="test-list">
                  ${data.tests.map(test => `
                    <div class="test-item ${test.pass ? 'pass' : 'fail'}">
                      <div class="test-left">
                        <div class="test-status ${test.pass ? 'pass' : 'fail'}">
                          ${test.pass ? '✓' : '✗'}
                        </div>
                        <div class="test-name">${test.case}</div>
                        ${!test.pass ? `<span class="test-severity severity-${getSeverity(test.case)}">${getSeverity(test.case)}</span>` : ''}
                      </div>
                      <div class="test-time">${test.duration_ms || 0}ms</div>
                    </div>
                    ${!test.pass && test.reason ? `
                      <div class="failure-details">
                        <div class="failure-reason">${test.reason}</div>
                        <div class="failure-hint">Fix: Add receipt validation for external actions</div>
                      </div>
                    ` : ''}
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
    
    <!-- Failures Only -->
    ${failures.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <div class="section-title">Failed Tests</div>
          <div class="section-badge">${failures.length} failures</div>
        </div>
        <div class="section-body">
          <div class="test-list">
            ${failures.map(test => `
              <div class="test-item fail">
                <div class="test-left">
                  <div class="test-status fail">✗</div>
                  <div class="test-name">${test.case}</div>
                  <span class="test-severity severity-${getSeverity(test.case)}">${getSeverity(test.case)}</span>
                </div>
                <div class="test-time">${test.duration_ms || 0}ms</div>
              </div>
              ${test.reason ? `
                <div class="failure-details">
                  <div class="failure-reason">${test.reason}</div>
                  <div class="failure-hint">Review test expectations and agent implementation</div>
                </div>
              ` : ''}
            `).join('')}
          </div>
        </div>
      </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      <p>Generated by F.A.I.L. Kit v${require('../../package.json').version}</p>
      <p style="margin-top: 8px; font-size: 11px;">No trace, no ship.</p>
    </div>
  </div>
  
  <script>
    function toggleCategory(name) {
      const el = document.getElementById('category-' + name);
      if (el) {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
      }
    }
  </script>
</body>
</html>`;
}

module.exports = {
  generateDashboard,
  getSeverity,
  determineShipDecision
};
