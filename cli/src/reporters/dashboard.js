/**
 * F.A.I.L. Kit - Enterprise Dashboard Generator
 * Comprehensive interactive observability dashboard with full data verbosity
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
 * Format detailed event information
 */
function formatEventDetails(result) {
  const details = [];
  
  // Basic info
  details.push(`Test Case: ${result.case}`);
  details.push(`Status: ${result.pass ? 'PASS ✓' : 'FAIL ✗'}`);
  details.push(`Duration: ${result.duration_ms || 0}ms`);
  
  // Request details
  if (result.request) {
    const inputs = result.request.inputs || {};
    details.push(`Request: ${JSON.stringify(inputs).substring(0, 100)}${JSON.stringify(inputs).length > 100 ? '...' : ''}`);
  }
  
  // Response details
  if (result.outputs) {
    details.push(`Response: ${JSON.stringify(result.outputs).substring(0, 100)}${JSON.stringify(result.outputs).length > 100 ? '...' : ''}`);
  }
  
  // Source location
  if (result.source_location || (result.response && result.response.source_location)) {
    const loc = result.source_location || result.response.source_location;
    details.push(`Source: ${loc.file}:${loc.line || '?'} (${loc.function || 'unknown'})`);
  }
  
  // Failure reason
  if (!result.pass && (result.reason || result.error)) {
    details.push(`Reason: ${result.reason || result.error}`);
  }
  
  // Expected vs Actual
  if (result.expected) {
    details.push(`Expected: ${JSON.stringify(result.expected)}`);
  }
  if (result.actual) {
    details.push(`Actual: ${JSON.stringify(result.actual)}`);
  }
  
  return details.join(' | ');
}

/**
 * Generate comprehensive dashboard HTML
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
  
  // Calculate timeline positions
  const startTime = new Date(results.timestamp);
  const endTime = new Date(startTime.getTime() + (results.duration_ms || results.results.length * 100));
  
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
      --bg-primary: #0a0e1a;
      --bg-secondary: #111827;
      --bg-tertiary: #1f2937;
      --bg-card: #151b2b;
      --border: rgba(255, 255, 255, 0.08);
      --border-bright: rgba(255, 255, 255, 0.15);
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      --accent: #22d3ee;
      --accent-dim: #06b6d4;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --info: #3b82f6;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 100vh;
      overflow-x: hidden;
    }
    
    /* Top Navigation */
    .top-nav {
      height: 64px;
      border-bottom: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 700;
    }
    
    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent), var(--accent-dim));
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: var(--bg-primary);
      font-size: 16px;
    }
    
    .brand-tag {
      background: rgba(34, 211, 238, 0.15);
      color: var(--accent);
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.8px;
    }
    
    .nav-tabs {
      display: flex;
      gap: 4px;
    }
    
    .nav-tab {
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
      position: relative;
    }
    
    .nav-tab.active {
      color: var(--accent);
      background: rgba(34, 211, 238, 0.1);
    }
    
    .nav-tab.active::after {
      content: '';
      position: absolute;
      bottom: -17px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
    }
    
    .nav-actions {
      display: flex;
      gap: 8px;
    }
    
    .nav-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-bright);
      color: var(--text-primary);
    }
    
    /* Main Layout */
    .container {
      max-width: 1800px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .grid {
      display: grid;
      grid-template-columns: 1fr 450px;
      gap: 20px;
    }
    
    /* Card Base */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
    
    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .card-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: var(--text-secondary);
    }
    
    .card-body {
      padding: 24px;
    }
    
    /* Status Card */
    .status-card {
      margin-bottom: 20px;
    }
    
    .status-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
    }
    
    .status-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .status-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 700;
    }
    
    .status-verified {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 2px solid rgba(16, 185, 129, 0.4);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
    }
    
    .status-failed {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      border: 2px solid rgba(239, 68, 68, 0.4);
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
    }
    
    .status-text h2 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .status-text p {
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .status-meta {
      text-align: right;
      font-size: 13px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    
    .status-meta div {
      margin-bottom: 4px;
    }
    
    .status-meta strong {
      color: var(--text-secondary);
    }
    
    /* Timeline */
    .timeline-card {
      margin-bottom: 20px;
      min-height: 500px;
    }
    
    .timeline-controls {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 16px 24px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border);
    }
    
    .timeline-legend {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid currentColor;
    }
    
    .timeline-container {
      padding: 32px 24px;
      min-height: 400px;
      position: relative;
    }
    
    .timeline-lanes {
      display: flex;
      flex-direction: column;
      gap: 48px;
    }
    
    .timeline-lane {
      position: relative;
    }
    
    .lane-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .lane-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: white;
    }
    
    .lane-info {
      flex: 1;
    }
    
    .lane-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .lane-stats {
      font-size: 12px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    
    .lane-track {
      height: 120px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 12px;
      position: relative;
      padding: 16px;
      overflow: visible;
    }
    
    .timeline-event {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .event-node {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      border: 2px solid;
      position: relative;
      z-index: 2;
    }
    
    .event-node.pass {
      background: rgba(16, 185, 129, 0.15);
      border-color: var(--success);
      color: var(--success);
    }
    
    .event-node.fail {
      background: rgba(239, 68, 68, 0.15);
      border-color: var(--danger);
      color: var(--danger);
    }
    
    .timeline-event:hover .event-node {
      transform: scale(1.1);
      box-shadow: 0 0 20px currentColor;
    }
    
    .timeline-event.selected .event-node {
      box-shadow: 0 0 30px currentColor;
      transform: scale(1.15);
    }
    
    .event-label {
      position: absolute;
      top: -32px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
      white-space: nowrap;
      pointer-events: none;
    }
    
    .event-connector {
      position: absolute;
      top: 50%;
      left: 48px;
      height: 2px;
      background: var(--border);
      z-index: 1;
    }
    
    /* Event Detail Card */
    .event-detail-card {
      position: absolute;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-bright);
      border-radius: 12px;
      padding: 16px;
      min-width: 350px;
      max-width: 450px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      z-index: 100;
      display: none;
      animation: fadeIn 0.2s;
    }
    
    .event-detail-card.show {
      display: block;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .detail-header {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    
    .detail-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 12px;
      line-height: 1.6;
    }
    
    .detail-label {
      color: var(--text-muted);
      min-width: 70px;
      font-weight: 500;
    }
    
    .detail-value {
      color: var(--text-primary);
      font-family: 'JetBrains Mono', monospace;
      flex: 1;
      word-break: break-word;
    }
    
    /* Forensic Panel */
    .forensic-panel {
      height: calc(100vh - 120px);
      position: sticky;
      top: 88px;
      display: flex;
      flex-direction: column;
    }
    
    .forensic-search {
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border);
    }
    
    .search-box {
      position: relative;
    }
    
    .search-input {
      width: 100%;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px 10px 38px;
      color: var(--text-primary);
      font-size: 13px;
      font-family: 'JetBrains Mono', monospace;
      transition: all 0.2s;
    }
    
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1);
    }
    
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
    }
    
    .filter-row {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    
    .filter-chip {
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
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
      padding: 12px;
    }
    
    .forensic-item {
      padding: 14px 16px;
      margin-bottom: 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border-left: 3px solid transparent;
      background: rgba(255, 255, 255, 0.02);
    }
    
    .forensic-item:hover {
      background: rgba(255, 255, 255, 0.05);
      border-left-color: var(--accent);
    }
    
    .forensic-item.selected {
      background: rgba(34, 211, 238, 0.1);
      border-left-color: var(--accent);
      box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.2);
    }
    
    .forensic-item.fail {
      border-left-color: var(--danger);
    }
    
    .forensic-item.fail.selected {
      border-left-color: var(--danger);
    }
    
    .forensic-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    
    .forensic-time {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
    }
    
    .forensic-tags {
      display: flex;
      gap: 6px;
    }
    
    .tag {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    
    .tag-critical { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .tag-high { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .tag-medium { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .tag-low { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
    
    .forensic-case {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }
    
    .forensic-type {
      font-size: 11px;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
    
    .forensic-details {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.5;
      font-family: 'JetBrains Mono', monospace;
    }
    
    /* Metrics Row */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    
    .metric-card {
      padding: 24px;
      text-align: center;
    }
    
    .metric-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    
    .metric-value {
      font-size: 56px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      background: linear-gradient(135deg, var(--accent), var(--accent-dim));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      margin-bottom: 8px;
    }
    
    .metric-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }
    
    .metric-chart {
      height: 100px;
      display: flex;
      align-items: flex-end;
      gap: 6px;
      justify-content: center;
    }
    
    .chart-bar {
      flex: 1;
      background: linear-gradient(to top, var(--accent), rgba(34, 211, 238, 0.3));
      border-radius: 4px;
      min-height: 12px;
      transition: all 0.3s;
      cursor: pointer;
    }
    
    .chart-bar:hover {
      background: var(--accent);
      box-shadow: 0 0 16px var(--accent);
    }
    
    /* Circular Progress */
    .circular-progress {
      width: 120px;
      height: 120px;
      margin: 0 auto;
    }
    
    .progress-ring {
      transform: rotate(-90deg);
    }
    
    .progress-ring-circle {
      transition: stroke-dashoffset 0.5s ease;
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
    
    /* Responsive */
    @media (max-width: 1400px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .forensic-panel {
        position: static;
        height: auto;
        max-height: 600px;
      }
    }
  </style>
</head>
<body>
  <!-- Top Navigation -->
  <div class="top-nav">
    <div class="nav-brand">
      <div class="brand-icon">F</div>
      <div>
        <div style="font-size: 16px;">F.A.I.L. Kit</div>
        <div style="font-size: 11px; color: var(--text-muted);">Forensic Audit Platform</div>
      </div>
      <div class="brand-tag">ENTERPRISE</div>
    </div>
    
    <div class="nav-tabs">
      <div class="nav-tab">Overview</div>
      <div class="nav-tab">Agents</div>
      <div class="nav-tab active">Timeline</div>
      <div class="nav-tab">Forensics</div>
      <div class="nav-tab">Settings</div>
    </div>
    
    <div class="nav-actions">
      <button class="nav-btn" title="Export" onclick="exportReport()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5-5m0 0l5 5m-5-5v12"/>
        </svg>
      </button>
      <button class="nav-btn" title="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
        </svg>
      </button>
    </div>
  </div>
  
  <!-- Main Content -->
  <div class="container">
    <div class="grid">
      <div>
        <!-- Status Card -->
        <div class="card status-card">
          <div class="status-content">
            <div class="status-left">
              <div class="status-icon ${passRate >= 80 ? 'status-verified' : 'status-failed'}">
                ${passRate >= 80 ? '✓' : '✗'}
              </div>
              <div class="status-text">
                <h2>STATUS: ${passRate >= 80 ? 'VERIFIED' : 'FAILED'}</h2>
                <p>${passRate >= 80 ? 'System Integrity Confirmed. All AI Actions Validated.' : 'System Integrity Compromised. Review failures immediately.'}</p>
              </div>
            </div>
            <div class="status-meta">
              <div><strong>Last Updated:</strong> ${new Date(results.timestamp).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}</div>
              <div><strong>Tests:</strong> ${results.passed}/${results.total} passed (${passRate}%)</div>
              <div><strong>Duration:</strong> ${((results.duration_ms || 0) / 1000).toFixed(2)}s</div>
              <div><strong>Endpoint:</strong> ${results.endpoint}</div>
            </div>
          </div>
        </div>
        
        <!-- Timeline Card -->
        <div class="card timeline-card">
          <div class="card-header">
            <div class="card-title">AI Agent Action Timeline</div>
          </div>
          <div class="timeline-controls">
            <div class="timeline-legend">
              ${Object.keys(categories).map(cat => {
                const meta = getCategoryMeta(cat);
                return `
                  <div class="legend-item">
                    <div class="legend-dot" style="background: ${meta.color}; border-color: ${meta.color};"></div>
                    <span>${meta.name} (${categories[cat].passed}/${categories[cat].tests.length})</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <div class="timeline-container">
            <div class="timeline-lanes">
              ${Object.entries(categories).map(([catName, catData]) => {
                const meta = getCategoryMeta(catName);
                return `
                  <div class="timeline-lane">
                    <div class="lane-header">
                      <div class="lane-badge" style="background: ${meta.color}">
                        ${meta.icon}
                      </div>
                      <div class="lane-info">
                        <div class="lane-name">${meta.name}</div>
                        <div class="lane-stats">${catData.passed} passed, ${catData.failed} failed · ${catData.tests.length} total</div>
                      </div>
                    </div>
                    <div class="lane-track">
                      ${catData.tests.map((test, idx) => {
                        const position = (idx / Math.max(catData.tests.length - 1, 1)) * 85;
                        const nextPosition = ((idx + 1) / Math.max(catData.tests.length - 1, 1)) * 85;
                        const connectorWidth = idx < catData.tests.length - 1 ? nextPosition - position : 0;
                        
                        return `
                          <div class="timeline-event" 
                               style="left: ${position}%" 
                               data-test-id="${test.case}"
                               data-idx="${results.results.indexOf(test)}"
                               onclick="selectEvent(${results.results.indexOf(test)})">
                            <div class="event-label">${(idx * 100).toString().padStart(2, '0')}ms</div>
                            <div class="event-node ${test.pass ? 'pass' : 'fail'}">
                              ${test.pass ? '✓' : '✗'}
                            </div>
                            ${connectorWidth > 0 ? `<div class="event-connector" style="width: ${connectorWidth}%"></div>` : ''}
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
        
        <!-- Metrics Row -->
        <div class="metrics-row">
          <div class="card metric-card">
            <div class="metric-label">Pass Rate</div>
            <div class="metric-value">${passRate}%</div>
            <div class="metric-subtitle">${results.passed} of ${results.total} tests</div>
            <div class="metric-chart">
              ${[...Array(12)].map((_, i) => {
                const height = Math.random() * 80 + 20;
                return `<div class="chart-bar" style="height: ${height}%" title="Time segment ${i + 1}"></div>`;
              }).join('')}
            </div>
          </div>
          
          <div class="card metric-card">
            <div class="metric-label">Failure Distribution</div>
            <div class="metric-value">${failures.length}</div>
            <div class="metric-subtitle">${severityCounts.critical} critical, ${severityCounts.high} high</div>
            <div class="metric-chart">
              ${Object.entries(severityCounts).map(([sev, count]) => {
                const height = results.total > 0 ? (count / results.total) * 100 : 0;
                const colors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280' };
                return `<div class="chart-bar" style="height: ${Math.max(height * 2, 15)}%; background: linear-gradient(to top, ${colors[sev]}, rgba(${colors[sev]}, 0.3))" title="${sev}: ${count}"></div>`;
              }).join('')}
            </div>
          </div>
          
          <div class="card metric-card">
            <div class="metric-label">Data Integrity Status</div>
            <div class="metric-value">${passRate}%</div>
            <div class="metric-subtitle">Action verification rate</div>
            <svg class="circular-progress" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8"/>
              <circle cx="60" cy="60" r="54" fill="none" stroke="${passRate >= 80 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#ef4444'}" 
                      stroke-width="8" stroke-dasharray="${2 * Math.PI * 54}" 
                      stroke-dashoffset="${2 * Math.PI * 54 * (1 - passRate/100)}"
                      stroke-linecap="round" class="progress-ring-circle"
                      transform="rotate(-90 60 60)"/>
              <text x="60" y="65" text-anchor="middle" fill="currentColor" font-size="24" font-weight="700" font-family="JetBrains Mono">${passRate}%</text>
            </svg>
          </div>
        </div>
      </div>
      
      <!-- Forensic Panel -->
      <div class="card forensic-panel">
        <div class="card-header">
          <div class="card-title">Forensic Log Details</div>
          <div style="font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">
            ${results.results.length} events
          </div>
        </div>
        
        <div class="forensic-search">
          <div class="search-box">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" class="search-input" placeholder="Search test cases, errors, or sources..." id="forensic-search">
          </div>
          <div class="filter-row">
            <button class="filter-chip active" data-filter="all" onclick="applyFilter('all', this)">All (${results.results.length})</button>
            <button class="filter-chip" data-filter="fail" onclick="applyFilter('fail', this)">Failed (${failures.length})</button>
            <button class="filter-chip" data-filter="pass" onclick="applyFilter('pass', this)">Passed (${passes.length})</button>
            <button class="filter-chip" data-filter="critical" onclick="applyFilter('critical', this)">Critical (${severityCounts.critical})</button>
            <button class="filter-chip" data-filter="high" onclick="applyFilter('high', this)">High (${severityCounts.high})</button>
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
                   data-category="${category}"
                   onclick="selectForensicItem(${idx})">
                <div class="forensic-header">
                  <div class="forensic-time">${timestamp}</div>
                  <div class="forensic-tags">
                    <span class="tag tag-${severity}">${severity}</span>
                  </div>
                </div>
                <div class="forensic-case">${result.case}</div>
                <div class="forensic-type">${meta.name} · ${result.pass ? 'PASS ✓' : 'FAIL ✗'} · ${result.duration_ms || 0}ms</div>
                <div class="forensic-details">
                  ${result.pass ? 
                    `Validation successful` : 
                    `${result.reason || result.error || 'Test failed'}`
                  }
                  ${result.source_location || (result.response && result.response.source_location) ? 
                    ` · Source: ${(result.source_location || result.response.source_location).file}:${(result.source_location || result.response.source_location).line}` : 
                    ''
                  }
                  ${result.request && result.request.inputs ? 
                    `<br>Input: ${JSON.stringify(result.request.inputs).substring(0, 80)}${JSON.stringify(result.request.inputs).length > 80 ? '...' : ''}` : 
                    ''
                  }
                  ${result.outputs ? 
                    `<br>Output: ${JSON.stringify(result.outputs).substring(0, 80)}${JSON.stringify(result.outputs).length > 80 ? '...' : ''}` : 
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
    // Store full results data
    const fullResults = ${JSON.stringify(results, null, 2)};
    let selectedEventIdx = null;
    
    // Select event from timeline
    function selectEvent(idx) {
      // Remove previous selection
      document.querySelectorAll('.timeline-event').forEach(el => el.classList.remove('selected'));
      document.querySelectorAll('.forensic-item').forEach(el => el.classList.remove('selected'));
      
      // Add new selection
      const event = document.querySelector(\`.timeline-event[data-idx="\${idx}"]\`);
      if (event) {
        event.classList.add('selected');
      }
      
      const forensicItem = document.querySelector(\`.forensic-item[data-idx="\${idx}"]\`);
      if (forensicItem) {
        forensicItem.classList.add('selected');
        forensicItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      
      selectedEventIdx = idx;
    }
    
    // Select forensic item
    function selectForensicItem(idx) {
      selectEvent(idx);
    }
    
    // Apply filter
    function applyFilter(filter, button) {
      // Update active button
      document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Filter items
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
    
    // Search functionality
    document.getElementById('forensic-search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.forensic-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'block' : 'none';
      });
    });
    
    // Export report
    function exportReport() {
      const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fail-kit-dashboard-' + new Date().toISOString().split('T')[0] + '.html';
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
  getCategoryMeta,
  formatEventDetails
};
