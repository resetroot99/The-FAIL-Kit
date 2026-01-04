/**
 * F.A.I.L. Kit Dashboard Reporter v1.6.0
 *
 * Light-themed professional dashboard for VS Code webview.
 * Enhanced with evidence export, signatures, and compliance mapping.
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { AnalysisResult, Issue, IssueCategory, IssueSeverity } from '../analyzer';
import { RegressionResult } from '../regression';

export interface DashboardData {
  results: Map<string, AnalysisResult>;
  regressionResult?: RegressionResult;
  provenance: ProvenanceData;
}

export interface ProvenanceData {
  gitHash: string;
  gitBranch: string;
  gitDirty: boolean;
  extensionVersion: string;
  timestamp: string;
  platform: string;
}

// ============================================
// NEW: Evidence Package for audit exports
// ============================================

export interface EvidencePackage {
  version: string;
  generatedAt: string;
  issue: Issue & { filePath: string };
  signature: string;
  signatureAlgorithm: string;
  exportFormats: ('json' | 'csv' | 'pdf')[];
  provenance: ProvenanceData;
  complianceMappings?: ComplianceMapping;
}

export interface ComplianceMapping {
  soc2?: string[];
  pciDss?: string[];
  hipaa?: string[];
  gdpr?: string[];
}

// ============================================
// Compliance mappings for each rule
// ============================================

const COMPLIANCE_MAPPINGS: Record<string, ComplianceMapping> = {
  FK001: {
    soc2: ['CC6.1', 'CC7.2'],
    pciDss: ['10.2.2', '10.3'],
    hipaa: ['164.312(b)'],
    gdpr: ['Art. 30'],
  },
  FK002: {
    soc2: ['CC7.4'],
    pciDss: ['6.5.5'],
    hipaa: ['164.308(a)(1)'],
  },
  FK003: {
    soc2: ['CC6.7', 'CC6.8'],
    pciDss: ['3.4', '6.5.3'],
    hipaa: ['164.312(a)(1)'],
    gdpr: ['Art. 32'],
  },
  FK004: {
    soc2: ['CC6.1', 'CC7.1'],
    pciDss: ['7.1', '7.2'],
    hipaa: ['164.312(d)'],
  },
  FK005: {
    soc2: ['A1.2'],
    pciDss: ['6.5.6'],
  },
  FK006: {
    soc2: ['CC5.2', 'CC7.2'],
    pciDss: ['10.1', '10.2'],
    hipaa: ['164.312(b)'],
    gdpr: ['Art. 30'],
  },
  FK007: {
    soc2: ['CC6.7', 'CC6.8'],
    pciDss: ['2.3', '8.2.1'],
    hipaa: ['164.312(a)(1)'],
    gdpr: ['Art. 32'],
  },
};

/**
 * Generate HMAC signature for evidence integrity
 */
function signWithHMAC(data: string, key: string = 'fail-kit-evidence'): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Generate evidence package for an issue
 */
export function generateEvidencePackage(
  issue: Issue & { filePath: string },
  provenance: ProvenanceData
): EvidencePackage {
  const issueJson = JSON.stringify(issue);
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    issue,
    signature: signWithHMAC(issueJson),
    signatureAlgorithm: 'HMAC-SHA256',
    exportFormats: ['json', 'csv'],
    provenance,
    complianceMappings: COMPLIANCE_MAPPINGS[issue.ruleId],
  };
}

/**
 * Export all issues as JSON evidence bundle
 */
export function exportEvidenceBundle(
  issues: Array<Issue & { filePath: string }>,
  provenance: ProvenanceData
): string {
  const bundle = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalIssues: issues.length,
    provenance,
    evidence: issues.map(issue => generateEvidencePackage(issue, provenance)),
    bundleSignature: signWithHMAC(JSON.stringify(issues)),
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Export issues as CSV
 */
export function exportAsCSV(issues: Array<Issue & { filePath: string }>): string {
  const headers = [
    'Rule ID',
    'Severity',
    'File',
    'Line',
    'Message',
    'Category',
    'Business Impact',
    'Fix Hint',
    'Risk Score',
    'SOC2',
    'PCI-DSS',
    'HIPAA',
  ];
  
  const rows = issues.map(issue => {
    const compliance = COMPLIANCE_MAPPINGS[issue.ruleId] || {};
    return [
      issue.ruleId,
      issue.issueSeverity,
      issue.filePath,
      issue.line + 1,
      `"${issue.message.replace(/"/g, '""')}"`,
      issue.category,
      `"${issue.businessImpact.replace(/"/g, '""')}"`,
      `"${issue.fixHint.replace(/"/g, '""')}"`,
      issue.riskScore,
      (compliance.soc2 || []).join(';'),
      (compliance.pciDss || []).join(';'),
      (compliance.hipaa || []).join(';'),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Category metadata for styling
 */
const CATEGORY_META: Record<string, { name: string; color: string; icon: string }> = {
  receipt_missing: { name: 'Receipt Missing', color: '#ef4444', icon: '📜' },
  error_handling: { name: 'Error Handling', color: '#f59e0b', icon: '⚠️' },
  policy_failed: { name: 'Policy Failed', color: '#8b5cf6', icon: '🚫' },
  tool_error: { name: 'Tool Error', color: '#3b82f6', icon: '🔧' },
  validation_failed: { name: 'Validation', color: '#14b8a6', icon: '✓' },
  audit_gap: { name: 'Audit Gap', color: '#6366f1', icon: '📊' },
  secret_exposure: { name: 'Secret Exposure', color: '#dc2626', icon: '🔑' },
  side_effect_unconfirmed: { name: 'Unconfirmed Side-Effect', color: '#ea580c', icon: '💥' },
  llm_resilience: { name: 'LLM Resilience', color: '#0891b2', icon: '🔄' },
  provenance_missing: { name: 'Missing Provenance', color: '#7c3aed', icon: '🏷️' },
  hardcoded_credential: { name: 'Hardcoded Credential', color: '#be123c', icon: '🔐' },
};

/**
 * Generate dashboard HTML for VS Code webview - matches v1.5.2 design
 */
export function generateDashboardHTML(
  data: DashboardData,
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const { results, regressionResult, provenance } = data;

  // Aggregate all issues across files
  const allIssues: Array<Issue & { filePath: string }> = [];
  let totalToolCalls = 0;
  let totalLLMCalls = 0;
  let totalAgentCalls = 0;

  for (const [filePath, result] of results) {
    for (const issue of result.issues) {
      allIssues.push({ ...issue, filePath });
    }
    totalToolCalls += result.toolCalls.length;
    totalLLMCalls += result.llmCalls.length;
    totalAgentCalls += result.agentCalls.length;
  }

  // Calculate summary
  const severityCounts = {
    critical: allIssues.filter(i => i.issueSeverity === 'critical').length,
    high: allIssues.filter(i => i.issueSeverity === 'high').length,
    medium: allIssues.filter(i => i.issueSeverity === 'medium').length,
    low: allIssues.filter(i => i.issueSeverity === 'low').length,
  };

  // Category buckets
  const categoryBuckets: Record<IssueCategory, typeof allIssues> = {
    receipt_missing: [],
    error_handling: [],
    policy_failed: [],
    tool_error: [],
    validation_failed: [],
    audit_gap: [],
    secret_exposure: [],
    side_effect_unconfirmed: [],
    llm_resilience: [],
    provenance_missing: [],
    hardcoded_credential: [],
  };

  allIssues.forEach(issue => {
    categoryBuckets[issue.category].push(issue);
  });

  // Ship decision
  const shipDecision = calculateShipDecision(severityCounts, allIssues.length);

  // Root causes
  const rootCauses = extractRootCauses(categoryBuckets);

  // Pass rate
  const totalFiles = results.size;
  const filesWithIssues = [...results.values()].filter(r => r.issues.length > 0).length;
  const passRate = totalFiles > 0 ? (((totalFiles - filesWithIssues) / totalFiles) * 100).toFixed(1) : '100.0';

  // Status
  const isVerified = allIssues.length === 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src https://fonts.gstatic.com https://fonts.googleapis.com;">
  <title>F.A.I.L. Kit Audit Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #fafafa;
      --bg-tertiary: #f5f5f5;
      --border: rgba(0, 0, 0, 0.1);
      --text-primary: #171717;
      --text-secondary: #525252;
      --text-muted: #a3a3a3;
      --accent: #3b82f6;
      --success: #22c55e;
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
      margin-bottom: 24px;
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
      border-radius: 6px;
      margin-bottom: 16px;
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
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 16px;
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
      background: rgba(255, 255, 255, 0.5);
      border-radius: 4px;
      border-left: 3px solid var(--accent);
    }
    
    /* Root Causes */
    .root-causes {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 24px;
    }
    
    .root-causes-header {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
    }
    
    .root-causes-list {
      padding: 16px;
    }
    
    .root-cause-item {
      margin-bottom: 16px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.02);
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
    
    .root-cause-count {
      color: var(--danger);
      font-weight: 700;
    }
    
    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .metric {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 6px;
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
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 24px;
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
    
    /* Forensic Panel */
    .forensic-panel {
      position: sticky;
      top: 20px;
    }
    
    .forensic-search {
      padding: 12px;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border);
    }
    
    .search-input {
      width: 100%;
      background: var(--bg-primary);
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
      background: rgba(0, 0, 0, 0.05);
    }
    
    .filter-chip.active {
      background: rgba(59, 130, 246, 0.15);
      border-color: var(--accent);
      color: var(--accent);
    }
    
    .forensic-list {
      max-height: 500px;
      overflow-y: auto;
      padding: 8px;
    }
    
    .forensic-item {
      padding: 10px 12px;
      margin-bottom: 6px;
      border-radius: 6px;
      cursor: pointer;
      border-left: 2px solid transparent;
      background: rgba(0, 0, 0, 0.02);
      transition: all 0.2s;
    }
    
    .forensic-item:hover {
      background: rgba(0, 0, 0, 0.05);
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
    
    .tag-critical { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    .tag-high { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
    .tag-medium { background: rgba(59, 130, 246, 0.2); color: var(--info); }
    .tag-low { background: rgba(107, 114, 128, 0.2); color: #6b7280; }
    
    .forensic-case {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
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
    
    .fix-hint {
      margin-top: 8px;
      padding: 8px;
      background: rgba(59, 130, 246, 0.1);
      border-left: 3px solid var(--accent);
      border-radius: 4px;
      font-size: 10px;
      line-height: 1.5;
    }
    
    .compliance-badges {
      display: inline-flex;
      gap: 4px;
      margin-left: 8px;
    }
    
    .compliance-badge {
      font-size: 8px;
      padding: 2px 4px;
      border-radius: 3px;
      background: rgba(99, 102, 241, 0.15);
      color: var(--info);
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    
    .evidence-actions {
      margin-top: 8px;
      display: flex;
      gap: 6px;
    }
    
    .btn-small {
      padding: 4px 8px;
      font-size: 9px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--bg-primary);
      color: var(--text-secondary);
      cursor: pointer;
      font-weight: 500;
    }
    
    .btn-small:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    
    .signature-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    
    .timeline-view {
      border-left: 2px solid var(--border);
      padding-left: 16px;
      margin-left: 8px;
    }
    
    .timeline-item {
      position: relative;
      padding: 8px 0;
    }
    
    .timeline-item::before {
      content: '';
      position: absolute;
      left: -21px;
      top: 12px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
    }
    
    .timeline-item.critical::before { background: var(--danger); }
    .timeline-item.high::before { background: var(--warning); }
    
    /* Provenance Panel */
    .provenance-panel {
      margin-top: 20px;
    }
    
    .provenance-header {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 6px 6px 0 0;
    }
    
    .provenance-grid {
      padding: 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-top: none;
      border-radius: 0 0 6px 6px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      font-size: 11px;
    }
    
    .provenance-item {
      padding: 8px;
      background: rgba(0, 0, 0, 0.02);
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
    
    /* Action Buttons */
    .action-buttons {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      transition: all 0.2s;
    }
    
    .btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    
    .btn-primary {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    
    .btn-primary:hover {
      background: #2563eb;
      border-color: #2563eb;
      color: white;
    }
    
    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }
    
    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .empty-state-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--success);
      margin-bottom: 8px;
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
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.2);
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
        <button onclick="exportReport()">Export PDF</button>
        <button onclick="refresh()">Refresh</button>
      </div>
    </div>
    
    <!-- Status Bar -->
    <div class="status-bar">
      <div class="status-left">
        <div class="status-badge ${isVerified ? 'status-verified' : 'status-failed'}">
          ${isVerified ? 'OK' : 'X'}
        </div>
        <div class="status-info">
          <h3>STATUS: ${isVerified ? 'VERIFIED' : 'ISSUES DETECTED'}</h3>
          <p>${isVerified ? 'System integrity confirmed' : `${allIssues.length} issue(s) require attention`}</p>
        </div>
      </div>
      <div class="status-meta">
        <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
        <div><strong>Files:</strong> ${totalFiles} analyzed</div>
        <div><strong>Pass Rate:</strong> ${passRate}%</div>
        <div><strong>Branch:</strong> ${provenance.gitBranch}@${provenance.gitHash}</div>
      </div>
    </div>
    
    <!-- Ship Decision Block -->
    <div class="ship-decision">
      <div class="decision-header">
        <span class="decision-label">Ship Decision</span>
        <span class="decision-badge ${shipDecision.decision === 'BLOCK' ? 'decision-block' : shipDecision.decision === 'NEEDS_REVIEW' ? 'decision-review' : 'decision-ship'}">
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
    
    <!-- Root Causes -->
    ${rootCauses.length > 0 ? `
    <div class="root-causes">
      <div class="root-causes-header">Top ${rootCauses.length} Root Causes</div>
      <div class="root-causes-list">
        ${rootCauses.map(cause => `
        <div class="root-cause-item">
          <div class="root-cause-header">
            <span class="root-cause-count">${cause.count}×</span> ${cause.cause}
          </div>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <!-- Metrics Grid -->
    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-label">Pass Rate</div>
        <div class="metric-value">${passRate}%</div>
        <div class="metric-subtitle">${totalFiles - filesWithIssues} of ${totalFiles} files</div>
      </div>
      <div class="metric">
        <div class="metric-label">Receipt Missing</div>
        <div class="metric-value" style="color: var(--danger)">${categoryBuckets.receipt_missing.length}</div>
        <div class="metric-subtitle">Critical: no proof of action</div>
      </div>
      <div class="metric">
        <div class="metric-label">Error Handling</div>
        <div class="metric-value" style="color: var(--warning)">${categoryBuckets.error_handling.length}</div>
        <div class="metric-subtitle">High: unhandled failures</div>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div class="action-buttons">
      <button class="btn btn-primary" onclick="autoFix()">$(wand) Auto-Fix All</button>
      <button class="btn" onclick="setBaseline()">$(bookmark) Set Baseline</button>
      <button class="btn" onclick="exportJSON()">$(json) Export JSON</button>
      <button class="btn" onclick="exportCSV()">$(table) Export CSV</button>
      <button class="btn" onclick="exportReport()">$(file-pdf) Export PDF</button>
      ${regressionResult ? `<button class="btn" style="color: ${regressionResult.summary.delta >= 0 ? 'var(--success)' : 'var(--danger)'}">${regressionResult.summary.delta >= 0 ? '▲' : '▼'} ${Math.abs(regressionResult.summary.delta)} since baseline</button>` : ''}
    </div>
    
    <!-- Main Grid -->
    ${allIssues.length > 0 ? `
    <div class="grid">
      <div>
        <!-- Issues Card -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Issues by Severity</div>
            <div style="font-size: 10px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">
              ${severityCounts.critical} critical · ${severityCounts.high} high · ${severityCounts.medium} medium · ${severityCounts.low} low
            </div>
          </div>
          <div class="card-body">
            ${allIssues.slice(0, 20).map(issue => {
              const compliance = COMPLIANCE_MAPPINGS[issue.ruleId] || {};
              const complianceBadges = [
                ...(compliance.soc2 ? ['SOC2'] : []),
                ...(compliance.pciDss ? ['PCI'] : []),
                ...(compliance.hipaa ? ['HIPAA'] : []),
                ...(compliance.gdpr ? ['GDPR'] : []),
              ].map(c => `<span class="compliance-badge">${c}</span>`).join('');
              
              return `
            <div class="forensic-item fail" onclick="openFile('${issue.filePath}', ${issue.line})">
              <div class="forensic-header">
                <span class="forensic-time">${issue.filePath.split('/').pop()}:${issue.line + 1}</span>
                <span class="tag tag-${issue.issueSeverity}">${issue.issueSeverity}</span>
              </div>
              <div class="forensic-case">
                ${issue.ruleId}
                <span class="compliance-badges">${complianceBadges}</span>
              </div>
              <div class="forensic-assertion">${issue.message.substring(0, 100)}${issue.message.length > 100 ? '...' : ''}</div>
              <div class="fix-hint">
                <strong>Fix:</strong> ${issue.fixHint}
              </div>
              <div class="evidence-actions">
                <button class="btn-small" onclick="event.stopPropagation(); exportIssue(${allIssues.indexOf(issue)})">Export Evidence</button>
                <button class="btn-small" onclick="event.stopPropagation(); fixIssue('${issue.filePath}', ${issue.line}, '${issue.ruleId}')">Fix</button>
              </div>
            </div>
            `}).join('')}
          </div>
        </div>
      </div>
      
      <!-- Forensic Panel -->
      <div class="forensic-panel">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Quick Filters</div>
          </div>
          <div class="forensic-search">
            <input type="text" class="search-input" placeholder="Search issues..." id="searchInput">
            <div class="filter-row">
              <button class="filter-chip active" onclick="filterAll()">All</button>
              <button class="filter-chip" onclick="filterCritical()">Critical</button>
              <button class="filter-chip" onclick="filterHigh()">High</button>
              <button class="filter-chip" onclick="filterReceipt()">Receipts</button>
            </div>
          </div>
          <div class="forensic-list">
            ${allIssues.slice(0, 50).map((issue, idx) => `
            <div class="forensic-item fail" onclick="showIssueDetails(${idx})">
              <div class="forensic-header">
                <span class="forensic-time">${issue.estimatedFixTime}</span>
                <span class="tag tag-${issue.issueSeverity}">${issue.issueSeverity}</span>
              </div>
              <div class="forensic-case">${issue.ruleId}</div>
              <div class="forensic-type">${issue.filePath.split('/').pop()}:${issue.line + 1}</div>
            </div>
            `).join('')}
          </div>
          
          <!-- Issue Details Modal -->
          <div id="issueModal" class="modal" style="display:none;">
            <div class="modal-content">
              <div class="modal-header">
                <span class="modal-title" id="modalTitle">Issue Details</span>
                <button class="modal-close" onclick="closeModal()">&times;</button>
              </div>
              <div class="modal-body" id="modalBody"></div>
              <div class="modal-footer">
                <button class="btn" onclick="closeModal()">Close</button>
                <button class="btn btn-primary" id="modalFixBtn">Fix Issue</button>
                <button class="btn btn-primary" id="modalOpenBtn">Open File</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ` : `
    <div class="empty-state">
      <div class="empty-state-icon">OK</div>
      <div class="empty-state-title">All Clear!</div>
      <div>No issues found. Your agent code is audit-ready.</div>
    </div>
    `}
    
    <!-- Provenance Panel -->
    <div class="provenance-panel">
      <div class="provenance-header">Provenance</div>
      <div class="provenance-grid">
        <div class="provenance-item">
          <strong>Git Hash</strong>
          <span>${provenance.gitHash}${provenance.gitDirty ? ' (dirty)' : ''}</span>
        </div>
        <div class="provenance-item">
          <strong>Branch</strong>
          <span>${provenance.gitBranch}</span>
        </div>
        <div class="provenance-item">
          <strong>Extension Version</strong>
          <span>v${provenance.extensionVersion}</span>
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
          <strong>Total Issues</strong>
          <span>${allIssues.length}</span>
        </div>
      </div>
    </div>
  </div>

  <style>
    .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal-content { background: var(--bg-primary); border-radius: 12px; max-width: 700px; width: 90%; max-height: 80vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .modal-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .modal-title { font-weight: 600; font-size: 16px; }
    .modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted); }
    .modal-body { padding: 20px; overflow-y: auto; max-height: 50vh; }
    .modal-footer { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end; }
    .detail-section { margin-bottom: 16px; }
    .detail-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; letter-spacing: 0.5px; }
    .detail-value { font-size: 14px; color: var(--text-primary); }
    .detail-code { background: var(--bg-secondary); padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto; }
    .detail-steps { list-style: none; padding: 0; margin: 0; }
    .detail-steps li { padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .detail-steps li:last-child { border-bottom: none; }
  </style>
  <script>
    const vscode = acquireVsCodeApi();
    const issues = ${JSON.stringify(allIssues.slice(0, 50).map(i => ({
      filePath: i.filePath,
      line: i.line,
      ruleId: i.ruleId,
      message: i.message,
      code: i.code,
      issueSeverity: i.issueSeverity,
      businessImpact: i.businessImpact,
      fixHint: i.fixHint,
      exampleFix: i.exampleFix || '',
      estimatedFixTime: i.estimatedFixTime,
      rootCause: i.rootCause || { type: 'unknown', description: 'No root cause available', affectedComponent: 'Unknown', requiredAction: 'Review manually' },
      reproductionSteps: i.reproductionSteps || ['1. Review the flagged code', '2. Apply suggested fix'],
    })))};
    
    function openFile(filePath, line) {
      vscode.postMessage({ command: 'openFile', filePath, line });
    }
    
    function fixIssue(filePath, line, ruleId) {
      vscode.postMessage({ command: 'fixIssue', filePath, line, ruleId });
    }
    
    function autoFix() {
      vscode.postMessage({ command: 'autoFix' });
    }
    
    function setBaseline() {
      vscode.postMessage({ command: 'setBaseline' });
    }
    
    function exportReport() {
      vscode.postMessage({ command: 'exportReport' });
    }
    
    function exportJSON() {
      vscode.postMessage({ command: 'exportJSON' });
    }
    
    function exportCSV() {
      vscode.postMessage({ command: 'exportCSV' });
    }
    
    function exportIssue(index) {
      vscode.postMessage({ command: 'exportIssue', index });
    }
    
    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }
    
    function showIssueDetails(idx) {
      const issue = issues[idx];
      if (!issue) return;
      
      const modal = document.getElementById('issueModal');
      const title = document.getElementById('modalTitle');
      const body = document.getElementById('modalBody');
      const fixBtn = document.getElementById('modalFixBtn');
      const openBtn = document.getElementById('modalOpenBtn');
      
      title.textContent = issue.ruleId + ' - ' + issue.issueSeverity.toUpperCase();
      
      body.innerHTML = \`
        <div class="detail-section">
          <div class="detail-label">Message</div>
          <div class="detail-value">\${issue.message}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">Business Impact</div>
          <div class="detail-value">\${issue.businessImpact}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">Root Cause</div>
          <div class="detail-value">\${issue.rootCause.description}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">Affected Component</div>
          <div class="detail-value">\${issue.rootCause.affectedComponent}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">Required Action</div>
          <div class="detail-value">\${issue.rootCause.requiredAction}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">Reproduction Steps</div>
          <ol class="detail-steps">
            \${issue.reproductionSteps.map(s => '<li>' + s + '</li>').join('')}
          </ol>
        </div>
        <div class="detail-section">
          <div class="detail-label">Code</div>
          <div class="detail-code">\${issue.code}</div>
        </div>
        \${issue.exampleFix ? \`
        <div class="detail-section">
          <div class="detail-label">Example Fix</div>
          <div class="detail-code">\${issue.exampleFix.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>\` : ''}
        <div class="detail-section">
          <div class="detail-label">Estimated Fix Time</div>
          <div class="detail-value">\${issue.estimatedFixTime}</div>
        </div>
      \`;
      
      fixBtn.onclick = () => { fixIssue(issue.filePath, issue.line, issue.ruleId); closeModal(); };
      openBtn.onclick = () => { openFile(issue.filePath, issue.line); closeModal(); };
      
      modal.style.display = 'flex';
    }
    
    function closeModal() {
      document.getElementById('issueModal').style.display = 'none';
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
    
    function filterAll() {}
    function filterCritical() {}
    function filterHigh() {}
    function filterReceipt() {}
  </script>
</body>
</html>`;
}

/**
 * Calculate ship decision based on severity counts
 */
function calculateShipDecision(severityCounts: Record<string, number>, totalIssues: number): {
  decision: 'BLOCK' | 'NEEDS_REVIEW' | 'SHIP';
  reason: string;
  action: string;
} {
  if (severityCounts.critical > 0) {
    return {
      decision: 'BLOCK',
      reason: `${severityCounts.critical} critical failure(s). Missing receipts or unproven side effects.`,
      action: 'Fix critical issues before deploying. Review phantom actions and missing receipts.',
    };
  }

  if (severityCounts.high >= 3 || totalIssues >= 5) {
    return {
      decision: 'NEEDS_REVIEW',
      reason: `${totalIssues} issue(s): ${severityCounts.high} high-severity. Manual review required.`,
      action: 'Review high-severity failures. Consider adding policy gates before ship.',
    };
  }

  if (totalIssues === 0) {
    return {
      decision: 'SHIP',
      reason: '100% pass rate. All checks passed.',
      action: 'Clear to ship. Monitor in production.',
    };
  }

  return {
    decision: 'NEEDS_REVIEW',
    reason: `${totalIssues} minor issue(s). Can be addressed post-deploy.`,
    action: 'Fix remaining issues to improve reliability. Target 100% pass rate.',
  };
}

/**
 * Extract root causes from category buckets
 */
function extractRootCauses(buckets: Record<IssueCategory, Array<Issue & { filePath: string }>>): Array<{
  cause: string;
  count: number;
}> {
  const causes: Array<{ cause: string; count: number }> = [];

  if (buckets.receipt_missing.length > 0) {
    causes.push({
      cause: 'Missing action receipts for external API calls',
      count: buckets.receipt_missing.length,
    });
  }

  if (buckets.error_handling.length > 0) {
    causes.push({
      cause: 'LLM/Agent calls without error handling',
      count: buckets.error_handling.length,
    });
  }

  if (buckets.policy_failed.length > 0) {
    causes.push({
      cause: 'Policy gates not enforced - refusal logic bypassed',
      count: buckets.policy_failed.length,
    });
  }

  if (buckets.audit_gap.length > 0) {
    causes.push({
      cause: 'Missing audit trail for operations',
      count: buckets.audit_gap.length,
    });
  }

  return causes.sort((a, b) => b.count - a.count).slice(0, 3);
}
