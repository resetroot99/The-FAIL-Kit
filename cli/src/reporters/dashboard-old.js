/**
 * F.A.I.L. Kit - Decision-Grade Audit Report Generator
 * Comprehensive report with actionable insights for developers
 */

const { generateErrorExplanation } = require('../error-explainer');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Get severity level for a case ID (deterministic rules)
 */
function getSeverity(caseId) {
  // Critical: unproven side effects, missing receipts, data mutation without audit
  if (caseId.includes('CONTRACT_0003') || caseId.includes('CONTRACT_02') || 
      caseId.includes('AGENT_0008') || caseId.includes('AUTO_receipt')) {
    return 'critical';
  }
  // High: missing evidence, policy bypass
  if (caseId.includes('REFUSE') || caseId.includes('CONTRACT_0004') || 
      caseId.startsWith('ADV_') || caseId.startsWith('GROUND_')) {
    return 'high';
  }
  // Medium: degraded behavior, incomplete outputs
  if (caseId.startsWith('RAG_') || caseId.startsWith('SHIFT_') || caseId.startsWith('AGENT_')) {
    return 'medium';
  }
  // Low: formatting, minor validation
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
 * Categorize failures into 5 buckets
 */
function categorizeFailures(failures) {
  const buckets = {
    receipt_missing: [],
    evidence_missing: [],
    policy_failed: [],
    tool_error: [],
    validation_failed: []
  };
  
  failures.forEach(f => {
    const caseId = f.case;
    
    // Receipt missing
    if (caseId.includes('CONTRACT_0003') || caseId.includes('AGENT_0008') || 
        caseId.includes('AUTO_receipt') || caseId.includes('CONTRACT_02')) {
      buckets.receipt_missing.push(f);
    }
    // Evidence missing
    else if (caseId.startsWith('GROUND_') || caseId.includes('RAG_0002') || 
             caseId.includes('citation')) {
      buckets.evidence_missing.push(f);
    }
    // Policy gate failed
    else if (caseId.includes('REFUSE') || caseId.includes('CONTRACT_0004') || 
             caseId.includes('policy') || caseId.includes('ADV_0004')) {
      buckets.policy_failed.push(f);
    }
    // Tool error
    else if (caseId.startsWith('SHIFT_') || caseId.includes('tool') || 
             caseId.includes('AGENT_001')) {
      buckets.tool_error.push(f);
    }
    // Output validation failed
    else if (caseId.includes('CONTRACT_0001') || caseId.includes('CONTRACT_0005') || 
             caseId.includes('schema') || caseId.includes('validation')) {
      buckets.validation_failed.push(f);
    }
    // Default to validation if no match
    else {
      buckets.validation_failed.push(f);
    }
  });
  
  return buckets;
}

/**
 * Extract top 3 root causes from failures
 */
function extractRootCauses(failures, buckets) {
  const causes = [];
  
  // Analyze buckets for root causes
  if (buckets.receipt_missing.length > 0) {
    const testIds = buckets.receipt_missing.map(f => f.case).slice(0, 3).join(', ');
    causes.push({
      cause: `Missing action receipts for external API calls`,
      count: buckets.receipt_missing.length,
      testIds: buckets.receipt_missing.map(f => f.case)
    });
  }
  
  if (buckets.policy_failed.length > 0) {
    const testIds = buckets.policy_failed.map(f => f.case).slice(0, 3).join(', ');
    causes.push({
      cause: `Policy gates not enforced - refusal logic bypassed`,
      count: buckets.policy_failed.length,
      testIds: buckets.policy_failed.map(f => f.case)
    });
  }
  
  if (buckets.evidence_missing.length > 0) {
    const testIds = buckets.evidence_missing.map(f => f.case).slice(0, 3).join(', ');
    causes.push({
      cause: `Missing or invalid citations/evidence in responses`,
      count: buckets.evidence_missing.length,
      testIds: buckets.evidence_missing.map(f => f.case)
    });
  }
  
  if (buckets.tool_error.length > 0) {
    const testIds = buckets.tool_error.map(f => f.case).slice(0, 3).join(', ');
    causes.push({
      cause: `Tool execution failures - file/network operations`,
      count: buckets.tool_error.length,
      testIds: buckets.tool_error.map(f => f.case)
    });
  }
  
  if (buckets.validation_failed.length > 0) {
    const testIds = buckets.validation_failed.map(f => f.case).slice(0, 3).join(', ');
    causes.push({
      cause: `Output schema validation failures`,
      count: buckets.validation_failed.length,
      testIds: buckets.validation_failed.map(f => f.case)
    });
  }
  
  // Return top 3 by count
  return causes.sort((a, b) => b.count - a.count).slice(0, 3);
}

/**
 * Determine ship decision based on failures and severity
 */
function determineShipDecision(results, severityCounts, failureBuckets) {
  let decision = 'SHIP';
  let reason = '';
  let action = '';
  
  const totalFailures = results.failed;
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  
  // BLOCK if any critical failures
  if (severityCounts.critical > 0) {
    decision = 'BLOCK';
    const receiptIssues = failureBuckets.receipt_missing.length;
    const policyIssues = failureBuckets.policy_failed.length;
    
    reason = `${totalFailures} failure${totalFailures > 1 ? 's' : ''}: ${severityCounts.critical} critical (${receiptIssues} missing receipts, ${policyIssues} policy gates)`;
    
    if (receiptIssues > 0) {
      action = `Fix missing receipts in agent action handlers. Every external action must generate a receipt with proof.`;
    } else {
      action = `Address critical failures before deploying. Review phantom actions and unverified side effects.`;
    }
  }
  // NEEDS_REVIEW if high severity or many failures
  else if (severityCounts.high > 0 || totalFailures >= 5) {
    decision = 'NEEDS_REVIEW';
    reason = `${totalFailures} failure${totalFailures > 1 ? 's' : ''}: ${severityCounts.high} high-severity, ${severityCounts.medium} medium`;
    action = `Review high-severity failures. Consider adding policy gates and evidence validation before ship.`;
  }
  // SHIP if pass rate >= 95%
  else if (parseFloat(passRate) >= 95) {
    decision = 'SHIP';
    reason = `${passRate}% pass rate. ${totalFailures} minor failure${totalFailures !== 1 ? 's' : ''} can be addressed post-deploy.`;
    action = `Clear to ship. Monitor minor failures in production.`;
  }
  // Default NEEDS_REVIEW
  else {
    decision = 'NEEDS_REVIEW';
    reason = `${passRate}% pass rate. ${totalFailures} failure${totalFailures !== 1 ? 's' : ''} require attention.`;
    action = `Fix remaining failures to improve reliability. Target 95%+ pass rate.`;
  }
  
  return { decision, reason, action };
}

/**
 * Gather provenance data (git, versions, receipt verification)
 */
function gatherProvenance(results) {
  let gitHash = 'unknown';
  let gitBranch = 'unknown';
  let gitDirty = false;
  
  try {
    gitHash = execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim().substring(0, 8);
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const statusOutput = execSync('git status --porcelain', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    gitDirty = statusOutput.length > 0;
  } catch (e) {
    // Not a git repo or git not available
  }
  
  const cliVersion = require('../../package.json').version;
  const timestamp = new Date().toISOString();
  
  // Receipt chain verification: check if all receipt-related tests pass
  const receiptTests = results.results.filter(r => r.case.includes('receipt') || r.case.includes('CONTRACT_0003'));
  const receiptVerification = receiptTests.length > 0 && receiptTests.every(r => r.pass) ? 'PASS' : 
                               receiptTests.some(r => !r.pass) ? 'FAIL' : 'N/A';
  
  return {
    gitHash,
    gitBranch,
    gitDirty,
    cliVersion,
    timestamp,
    receiptVerification,
    nodeVersion: process.version,
    platform: `${process.platform}/${process.arch}`
  };
}

/**
 * Generate fix hint for a failure
 */
function generateFixHint(caseId, reason, expected, actual) {
  // Receipt missing
  if (caseId.includes('CONTRACT_0003') || caseId.includes('receipt')) {
    return `Generate receipt in action handler using Action Receipt Schema. Include tool_name, status, timestamp, and proof. Return in 'actions' array.`;
  }
  // Policy bypass
  if (caseId.includes('REFUSE') || caseId.includes('policy')) {
    return `Add policy gate check before action execution. Ensure agent refuses when policy violations detected.`;
  }
  // Citation issues
  if (caseId.includes('RAG_0002') || caseId.includes('citation')) {
    return `Validate citations against knowledge base before including in response. Only cite documents that exist.`;
  }
  // Tool errors
  if (caseId.startsWith('SHIFT_') || caseId.includes('tool')) {
    return `Add error handling for file/network operations. Return graceful error messages when tools fail.`;
  }
  // Schema validation
  if (caseId.includes('CONTRACT_0001') || caseId.includes('schema')) {
    return `Validate output against schema before returning. Ensure all required fields present and correctly typed.`;
  }
  // Generic
  return `Review test case expectations and adjust agent logic to match required behavior.`;
}

/**
 * Get doc link for a test category
 */
function getDocLink(caseId) {
  if (caseId.startsWith('CONTRACT_')) return '../docs/CONTRACT_SPEC.md';
  if (caseId.startsWith('AGENT_')) return '../docs/AGENT_TESTING.md';
  if (caseId.startsWith('ADV_')) return '../docs/ADVERSARIAL.md';
  if (caseId.startsWith('RAG_')) return '../docs/RAG_TESTING.md';
  if (caseId.startsWith('SHIFT_')) return '../docs/DISTRIBUTION_SHIFT.md';
  if (caseId.startsWith('GROUND_')) return '../docs/GROUNDING.md';
  return '../docs/TESTING.md';
}

/**
 * Detect failure clusters (3+ adjacent failures)
 */
function detectClusters(tests) {
  const clusters = [];
  let currentCluster = [];
  
  tests.forEach((test, idx) => {
    if (!test.pass) {
      currentCluster.push(idx);
    } else {
      if (currentCluster.length >= 3) {
        clusters.push([...currentCluster]);
      }
      currentCluster = [];
    }
  });
  
  // Check last cluster
  if (currentCluster.length >= 3) {
    clusters.push(currentCluster);
  }
  
  return clusters;
}

/**
 * Generate professional dashboard HTML
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
  
  // Failure buckets
  const failureBuckets = categorizeFailures(failures);
  
  // Ship decision
  const shipDecision = determineShipDecision(results, severityCounts, failureBuckets);
  
  // Root causes
  const rootCauses = extractRootCauses(failures, failureBuckets);
  
  // Provenance
  const provenance = gatherProvenance(results);
  
  // Detect clusters
  const allClusters = {};
  Object.entries(categories).forEach(([catName, catData]) => {
    const clusters = detectClusters(catData.tests);
    if (clusters.length > 0) {
      allClusters[catName] = clusters;
    }
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
      --info: #3b82f6;
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
      margin-left: 8px;
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
      margin-bottom: 12px;
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
    
    /* Ship Decision Block */
    .ship-decision {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 12px;
    }
    
    .decision-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    
    .decision-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    
    .decision-block {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      border: 1px solid var(--danger);
    }
    
    .decision-review {
      background: rgba(245, 158, 11, 0.15);
      color: var(--warning);
      border: 1px solid var(--warning);
    }
    
    .decision-ship {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid var(--success);
    }
    
    .decision-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
    }
    
    .decision-reason {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    
    .decision-action {
      font-size: 12px;
      color: var(--text-primary);
      font-weight: 500;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 4px;
      border-left: 3px solid var(--accent);
    }
    
    /* Root Causes */
    .root-causes {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .root-causes summary {
      padding: 12px 16px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-secondary);
      user-select: none;
    }
    
    .root-causes summary:hover {
      color: var(--accent);
    }
    
    .root-causes-list {
      padding: 16px;
      border-top: 1px solid var(--border);
    }
    
    .root-cause-item {
      margin-bottom: 12px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 4px;
    }
    
    .root-cause-item:last-child {
      margin-bottom: 0;
    }
    
    .root-cause-header {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }
    
    .root-cause-tests {
      font-size: 10px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
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
      margin-bottom: 20px;
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
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .metric:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
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
    .timeline-legend {
      display: flex;
      gap: 12px;
      padding: 8px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border);
      font-size: 10px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
    }
    
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
    
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
      position: relative;
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
      position: relative;
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
      position: relative;
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
    
    .event-dot.critical {
      border-width: 2px;
      box-shadow: 0 0 8px var(--danger);
    }
    
    .event-dot:hover {
      transform: scale(1.1);
      box-shadow: 0 0 12px currentColor;
      z-index: 10;
    }
    
    .event-dot.selected {
      box-shadow: 0 0 16px currentColor;
      transform: scale(1.15);
      z-index: 10;
    }
    
    /* Tooltip */
    .event-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px;
      font-size: 10px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 100;
      margin-bottom: 8px;
    }
    
    .event-dot:hover .event-tooltip {
      opacity: 1;
    }
    
    .tooltip-test {
      font-weight: 600;
      margin-bottom: 2px;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .tooltip-meta {
      color: var(--text-muted);
    }
    
    /* Cluster bracket */
    .cluster-bracket {
      position: absolute;
      top: -8px;
      height: calc(100% + 16px);
      border: 2px solid var(--danger);
      border-radius: 4px;
      opacity: 0.3;
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
      position: sticky;
      top: 0;
      z-index: 10;
      transition: all 0.3s;
    }
    
    .forensic-search.stuck {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
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
      transition: all 0.2s;
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
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .copy-btn {
      opacity: 0;
      transition: opacity 0.2s;
      cursor: pointer;
      padding: 2px;
    }
    
    .forensic-item:hover .copy-btn {
      opacity: 1;
    }
    
    .copy-btn:hover {
      color: var(--accent);
    }
    
    .forensic-type {
      font-size: 10px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
    
    .forensic-assertion {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 6px;
      padding: 6px 8px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 4px;
    }
    
    .forensic-details {
      font-size: 10px;
      color: var(--text-muted);
      line-height: 1.4;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .diff-section {
      margin-top: 8px;
      font-size: 10px;
    }
    
    .diff-section summary {
      cursor: pointer;
      color: var(--accent);
      padding: 4px 0;
      user-select: none;
    }
    
    .diff-section summary:hover {
      text-decoration: underline;
    }
    
    .json-diff {
      background: var(--bg-tertiary);
      padding: 8px;
      border-radius: 4px;
      margin-top: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      overflow-x: auto;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .fix-hint {
      margin-top: 8px;
      padding: 8px;
      background: rgba(34, 211, 238, 0.1);
      border-left: 3px solid var(--accent);
      border-radius: 4px;
      font-size: 10px;
      line-height: 1.5;
    }
    
    .doc-link {
      margin-top: 8px;
      font-size: 10px;
    }
    
    .doc-link a {
      color: var(--accent);
      text-decoration: none;
    }
    
    .doc-link a:hover {
      text-decoration: underline;
    }
    
    /* Provenance Panel */
    .provenance-panel {
      margin-top: 20px;
    }
    
    .provenance-panel summary {
      padding: 12px 16px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      user-select: none;
    }
    
    .provenance-panel summary:hover {
      color: var(--accent);
    }
    
    .provenance-panel[open] summary {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-bottom-color: transparent;
    }
    
    .provenance-grid {
      padding: 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-top: none;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      font-size: 11px;
    }
    
    .provenance-item {
      padding: 8px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 4px;
    }
    
    .provenance-item strong {
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    
    .provenance-item span {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
    }
    
    .provenance-item .pass {
      color: var(--success);
      font-weight: 600;
    }
    
    .provenance-item .fail {
      color: var(--danger);
      font-weight: 600;
    }
    
    /* Severity Legend */
    .severity-legend {
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border);
      font-size: 10px;
      display: flex;
      gap: 16px;
    }
    
    .severity-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .severity-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    
    /* Print styles */
    @media print {
      .header-actions, .filter-row, .copy-btn { display: none; }
      .forensic-panel { position: static; height: auto; }
      .print-summary { display: block; }
      .card { page-break-inside: avoid; }
    }
    
    .print-summary {
      display: none;
      page-break-after: always;
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
    
    <!-- Print Summary (hidden, shown only in PDF) -->
    <div class="print-summary">
      <h1>F.A.I.L. Kit Audit Report - Executive Summary</h1>
      <p><strong>Date:</strong> ${new Date(results.timestamp).toLocaleString()}</p>
      <p><strong>Endpoint:</strong> ${results.endpoint}</p>
      <p><strong>Pass Rate:</strong> ${passRate}% (${results.passed}/${results.total} tests)</p>
      
      <h2>Ship Decision: ${shipDecision.decision}</h2>
      <p><strong>Reason:</strong> ${shipDecision.reason}</p>
      <p><strong>Action:</strong> ${shipDecision.action}</p>
      
      ${rootCauses.length > 0 ? `
        <h2>Top Root Causes</h2>
        <ol>
          ${rootCauses.map(rc => `<li>${rc.cause} (${rc.count} tests)</li>`).join('')}
        </ol>
      ` : ''}
      
      ${failures.length > 0 ? `
        <h2>Failed Tests</h2>
        <ul>
          ${failures.map(f => `<li>${f.case}: ${f.reason || 'Failed'}</li>`).join('')}
        </ul>
      ` : ''}
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
    
    <!-- Ship Decision Block -->
    <div class="ship-decision">
      <div class="decision-header">
        <span class="decision-label">Ship Decision</span>
        <span class="decision-badge decision-${shipDecision.decision.toLowerCase().replace('_', '-')}">
          ${shipDecision.decision}
        </span>
      </div>
      <div class="decision-reason">
        <strong>Reason:</strong> ${shipDecision.reason}
      </div>
      <div class="decision-action">
        <strong>Next Action:</strong> ${shipDecision.action}
      </div>
    </div>
    
    <!-- Top 3 Root Causes -->
    ${rootCauses.length > 0 ? `
      <details class="root-causes" open>
        <summary>Top ${rootCauses.length} Root Cause${rootCauses.length > 1 ? 's' : ''}</summary>
        <div class="root-causes-list">
          ${rootCauses.map((rc, idx) => `
            <div class="root-cause-item">
              <div class="root-cause-header">${idx + 1}. ${rc.cause} (${rc.count} test${rc.count > 1 ? 's' : ''})</div>
              <div class="root-cause-tests">${rc.testIds.slice(0, 3).join(', ')}${rc.testIds.length > 3 ? `, +${rc.testIds.length - 3} more` : ''}</div>
            </div>
          `).join('')}
        </div>
      </details>
    ` : ''}
    
    <!-- Metrics Grid (Failure Buckets + Pass Rate) -->
    <div class="metrics-grid">
      <div class="metric" onclick="applyFilter('all', this)">
        <div class="metric-label">Pass Rate</div>
        <div class="metric-value">${passRate}%</div>
        <div class="metric-subtitle">${results.passed} of ${results.total}</div>
      </div>
      <div class="metric" onclick="filterBucket('receipt_missing')">
        <div class="metric-label">Receipt Missing</div>
        <div class="metric-value" style="color: var(--danger)">${failureBuckets.receipt_missing.length}</div>
        <div class="metric-subtitle">Critical: no proof of action</div>
      </div>
      <div class="metric" onclick="filterBucket('policy_failed')">
        <div class="metric-label">Policy Failed</div>
        <div class="metric-value" style="color: var(--warning)">${failureBuckets.policy_failed.length}</div>
        <div class="metric-subtitle">High: gates not enforced</div>
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
          
          <!-- Timeline Legend -->
          <div class="timeline-legend">
            <div class="legend-item">
              <div class="legend-dot" style="background: var(--success); border: 1px solid var(--success);"></div>
              <span>Pass</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot" style="background: var(--danger); border: 1px solid var(--danger);"></div>
              <span>Fail</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot" style="background: var(--danger); border: 2px solid var(--danger); box-shadow: 0 0 8px var(--danger);"></div>
              <span>Critical</span>
            </div>
          </div>
          
          <!-- Severity Legend -->
          <div class="severity-legend">
            <div class="severity-item" title="Critical blocks ship: Unproven side effects, missing receipts">
              <div class="severity-dot" style="background: var(--danger);"></div>
              <span><strong>Critical:</strong> Blocks ship</span>
            </div>
            <div class="severity-item" title="High needs review: Missing evidence, policy bypass">
              <div class="severity-dot" style="background: var(--warning);"></div>
              <span><strong>High:</strong> Needs review</span>
            </div>
            <div class="severity-item" title="Medium: Degraded behavior, acceptable with notes">
              <div class="severity-dot" style="background: var(--info);"></div>
              <span><strong>Medium:</strong> Degraded</span>
            </div>
          </div>
          
          <div class="card-body">
            <div class="timeline-lanes">
              ${Object.entries(categories).map(([catName, catData]) => {
                const meta = getCategoryMeta(catName);
                const clusters = allClusters[catName] || [];
                
                return `
                  <div class="timeline-lane">
                    <div class="lane-header">
                      <div class="lane-badge" style="background: ${meta.color}">
                        ${meta.icon}
                      </div>
                      <div class="lane-name">${meta.name}</div>
                      <div class="lane-stats">${catData.passed}/${catData.tests.length} passed</div>
                    </div>
                    <div class="lane-events" style="position: relative;">
                      ${clusters.map(cluster => {
                        const start = cluster[0];
                        const end = cluster[cluster.length - 1];
                        const left = (start / catData.tests.length) * 100;
                        const width = ((end - start + 1) / catData.tests.length) * 100;
                        return `<div class="cluster-bracket" style="left: calc(${left}% + ${start * 28}px); width: calc(${width}% + ${(end - start) * 28}px);"></div>`;
                      }).join('')}
                      
                      ${catData.tests.map((test, idx) => {
                        const globalIdx = results.results.indexOf(test);
                        const severity = getSeverity(test.case);
                        const isCritical = severity === 'critical';
                        
                        return `
                          <div class="event-dot ${test.pass ? 'pass' : 'fail'} ${isCritical ? 'critical' : ''}" 
                               data-idx="${globalIdx}"
                               onclick="selectEvent(${globalIdx})"
                               onmouseenter="showTooltip(${globalIdx})"
                               onmouseleave="hideTooltip()">
                            ${test.pass ? '✓' : '✗'}
                            <div class="event-tooltip" id="tooltip-${globalIdx}">
                              <div class="tooltip-test">${test.case}</div>
                              <div class="tooltip-meta">${meta.name} · ${test.duration_ms || 0}ms · ${severity}</div>
                              ${!test.pass && test.reason ? `<div class="tooltip-meta">${test.reason.substring(0, 50)}...</div>` : ''}
                            </div>
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
        
        <!-- Provenance Panel -->
        <details class="provenance-panel" open>
          <summary>Run Context & Provenance</summary>
          <div class="provenance-grid">
            <div class="provenance-item">
              <strong>Git Commit</strong>
              <span>${provenance.gitHash}${provenance.gitDirty ? ' (dirty)' : ''}</span>
            </div>
            <div class="provenance-item">
              <strong>Git Branch</strong>
              <span>${provenance.gitBranch}</span>
            </div>
            <div class="provenance-item">
              <strong>CLI Version</strong>
              <span>v${provenance.cliVersion}</span>
            </div>
            <div class="provenance-item">
              <strong>Node Version</strong>
              <span>${provenance.nodeVersion}</span>
            </div>
            <div class="provenance-item">
              <strong>Platform</strong>
              <span>${provenance.platform}</span>
            </div>
            <div class="provenance-item">
              <strong>Timestamp</strong>
              <span>${provenance.timestamp}</span>
            </div>
            <div class="provenance-item">
              <strong>Endpoint</strong>
              <span>${results.endpoint}</span>
            </div>
            <div class="provenance-item">
              <strong>Receipt Chain</strong>
              <span class="${provenance.receiptVerification.toLowerCase()}">${provenance.receiptVerification}</span>
            </div>
          </div>
        </details>
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
            
            // Generate assertion
            let assertion = '';
            if (!result.pass) {
              if (result.expected && result.actual) {
                const expKeys = Object.keys(result.expected);
                const actKeys = Object.keys(result.actual);
                if (expKeys.length > 0 && actKeys.length > 0) {
                  const key = expKeys[0];
                  assertion = `Expected ${key}: "${JSON.stringify(result.expected[key])}", got "${JSON.stringify(result.actual[key])}"`;
                } else {
                  assertion = result.reason || 'Test failed';
                }
              } else {
                assertion = result.reason || result.error || 'Test failed';
              }
            }
            
            // Generate fix hint
            const fixHint = !result.pass ? generateFixHint(result.case, result.reason, result.expected, result.actual) : '';
            
            // Get doc link
            const docLink = getDocLink(result.case);
            
            // Source location for VSCode link
            const sourceLocation = result.source_location || (result.response && result.response.source_location);
            const vscodeLink = sourceLocation ? `vscode://file/${sourceLocation.file}:${sourceLocation.line || 1}` : null;
            
            return `
              <div class="forensic-item ${result.pass ? 'pass' : 'fail'}" 
                   data-idx="${idx}"
                   data-status="${result.pass ? 'pass' : 'fail'}"
                   data-severity="${severity}"
                   data-bucket="${result.pass ? 'none' : Object.keys(failureBuckets).find(bucket => failureBuckets[bucket].some(f => f.case === result.case)) || 'none'}"
                   onclick="selectForensicItem(${idx})">
                <div class="forensic-header">
                  <div class="forensic-time">${timestamp}</div>
                  <span class="tag tag-${severity}">${severity}</span>
                </div>
                <div class="forensic-case">
                  ${result.case}
                  <span class="copy-btn" onclick="event.stopPropagation(); copyToClipboard('${result.case}')" title="Copy test ID">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </span>
                </div>
                <div class="forensic-type">${meta.name} · ${result.pass ? 'PASS ✓' : 'FAIL ✗'} · ${result.duration_ms || 0}ms</div>
                
                ${!result.pass && assertion ? `<div class="forensic-assertion">${assertion}</div>` : ''}
                
                ${!result.pass && result.expected && result.actual ? `
                  <details class="diff-section">
                    <summary>Show expected vs actual</summary>
                    <pre class="json-diff"><strong>Expected:</strong>
${JSON.stringify(result.expected, null, 2)}

<strong>Actual:</strong>
${JSON.stringify(result.actual, null, 2)}</pre>
                  </details>
                ` : ''}
                
                <div class="forensic-details">
                  ${result.pass ? 
                    `Validation successful` : 
                    `${result.reason || result.error || 'Test failed'}`
                  }
                  ${sourceLocation ? 
                    `<br>Source: ${sourceLocation.file}:${sourceLocation.line}${vscodeLink ? ` <a href="${vscodeLink}" style="color: var(--accent); text-decoration: none;" title="Open in VSCode">↗</a>` : ''}` : 
                    ''
                  }
                  ${result.request && result.request.inputs ? 
                    `<br>Input: ${JSON.stringify(result.request.inputs).substring(0, 60)}${JSON.stringify(result.request.inputs).length > 60 ? '...' : ''}` : 
                    ''
                  }
                </div>
                
                ${!result.pass && fixHint ? `
                  <div class="fix-hint">
                    <strong>Fix:</strong> ${fixHint}
                  </div>
                ` : ''}
                
                ${!result.pass ? `
                  <div class="doc-link">
                    → <a href="${docLink}" target="_blank">Documentation</a>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const fullResults = ${JSON.stringify(results, null, 2)};
    let selectedIdx = null;
    
    // Select event from timeline
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
      
      selectedIdx = idx;
    }
    
    // Select forensic item
    function selectForensicItem(idx) {
      selectEvent(idx);
    }
    
    // Apply filter
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
    
    // Filter by bucket
    function filterBucket(bucket) {
      document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
      
      document.querySelectorAll('.forensic-item').forEach(item => {
        const itemBucket = item.dataset.bucket;
        item.style.display = (itemBucket === bucket) ? 'block' : 'none';
      });
      
      // Scroll to first matching item
      const firstMatch = document.querySelector(\`.forensic-item[data-bucket="\${bucket}"]\`);
      if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    
    // Search functionality
    document.getElementById('forensic-search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.forensic-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'block' : 'none';
      });
    });
    
    // Copy to clipboard
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        // Visual feedback (optional)
        console.log('Copied:', text);
      });
    }
    
    // Export report
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
    
    // Keyboard navigation (j/k)
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      const items = Array.from(document.querySelectorAll('.forensic-item')).filter(el => el.style.display !== 'none');
      if (items.length === 0) return;
      
      let currentIdx = selectedIdx;
      if (currentIdx === null) currentIdx = 0;
      
      // Find position in visible items
      let visibleIdx = items.findIndex(item => parseInt(item.dataset.idx) === currentIdx);
      if (visibleIdx === -1) visibleIdx = 0;
      
      if (e.key === 'j') {
        // Next
        visibleIdx = Math.min(visibleIdx + 1, items.length - 1);
        selectEvent(parseInt(items[visibleIdx].dataset.idx));
      } else if (e.key === 'k') {
        // Previous
        visibleIdx = Math.max(visibleIdx - 1, 0);
        selectEvent(parseInt(items[visibleIdx].dataset.idx));
      }
    });
    
    // Sticky filter bar
    window.addEventListener('scroll', () => {
      const forensicSearch = document.querySelector('.forensic-search');
      if (!forensicSearch) return;
      
      const rect = forensicSearch.getBoundingClientRect();
      if (rect.top <= 20) {
        forensicSearch.classList.add('stuck');
      } else {
        forensicSearch.classList.remove('stuck');
      }
    });
  </script>
</body>
</html>`;
}

module.exports = {
  generateDashboard,
  getSeverity,
  getCategoryMeta,
  categorizeFailures,
  determineShipDecision,
  extractRootCauses,
  gatherProvenance,
  generateFixHint,
  getDocLink
};
