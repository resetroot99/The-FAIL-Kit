/**
 * F.A.I.L. Kit Regression Detection
 *
 * Compares current analysis results against a baseline to detect regressions.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult, Issue, AnalysisSummary } from '../analyzer';

export interface Baseline {
  version: string;
  timestamp: string;
  files: { [filePath: string]: FileBaseline };
  summary: BaselineSummary;
}

export interface FileBaseline {
  issueCount: number;
  issues: BaselineIssue[];
  hash: string;
}

export interface BaselineIssue {
  ruleId: string;
  line: number;
  message: string;
  issueSeverity: string;
}

export interface BaselineSummary {
  totalFiles: number;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface RegressionResult {
  hasRegression: boolean;
  newFailures: RegressionItem[];
  resolvedIssues: RegressionItem[];
  unchanged: RegressionItem[];
  summary: RegressionSummary;
}

export interface RegressionItem {
  filePath: string;
  issue: Issue | BaselineIssue;
  type: 'new' | 'resolved' | 'unchanged';
}

export interface RegressionSummary {
  newFailureCount: number;
  resolvedCount: number;
  unchangedCount: number;
  delta: number; // positive = improvement, negative = regression
  recommendation: string;
}

const BASELINE_FILENAME = '.fail-kit-baseline.json';

/**
 * Get baseline file path for workspace
 */
export function getBaselinePath(workspaceFolder: vscode.WorkspaceFolder): string {
  return path.join(workspaceFolder.uri.fsPath, '.fail-kit', BASELINE_FILENAME);
}

/**
 * Load baseline from disk
 */
export function loadBaseline(workspaceFolder: vscode.WorkspaceFolder): Baseline | null {
  const baselinePath = getBaselinePath(workspaceFolder);
  
  try {
    if (fs.existsSync(baselinePath)) {
      const content = fs.readFileSync(baselinePath, 'utf-8');
      return JSON.parse(content) as Baseline;
    }
  } catch (error) {
    console.error('Failed to load baseline:', error);
  }
  
  return null;
}

/**
 * Save baseline to disk
 */
export function saveBaseline(
  workspaceFolder: vscode.WorkspaceFolder,
  baseline: Baseline
): void {
  const baselinePath = getBaselinePath(workspaceFolder);
  const dir = path.dirname(baselinePath);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
}

/**
 * Create baseline from current analysis results
 */
export function createBaseline(
  results: Map<string, AnalysisResult>
): Baseline {
  const files: { [filePath: string]: FileBaseline } = {};
  let totalIssues = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const [filePath, result] of results) {
    const issues: BaselineIssue[] = result.issues.map(issue => ({
      ruleId: issue.ruleId,
      line: issue.line,
      message: issue.message,
      issueSeverity: issue.issueSeverity,
    }));

    files[filePath] = {
      issueCount: issues.length,
      issues,
      hash: hashIssues(issues),
    };

    totalIssues += issues.length;
    criticalCount += result.summary.criticalCount;
    highCount += result.summary.highCount;
    mediumCount += result.summary.mediumCount;
    lowCount += result.summary.lowCount;
  }

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    files,
    summary: {
      totalFiles: results.size,
      totalIssues,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
    },
  };
}

/**
 * Compare current results against baseline
 */
export function compareToBaseline(
  current: Map<string, AnalysisResult>,
  baseline: Baseline
): RegressionResult {
  const newFailures: RegressionItem[] = [];
  const resolvedIssues: RegressionItem[] = [];
  const unchanged: RegressionItem[] = [];

  // Check each current file
  for (const [filePath, result] of current) {
    const baselineFile = baseline.files[filePath];

    if (!baselineFile) {
      // All issues in this file are new
      for (const issue of result.issues) {
        newFailures.push({
          filePath,
          issue,
          type: 'new',
        });
      }
    } else {
      // Compare issues
      const baselineIssueKeys = new Set(
        baselineFile.issues.map(i => `${i.ruleId}:${i.line}`)
      );
      const currentIssueKeys = new Set(
        result.issues.map(i => `${i.ruleId}:${i.line}`)
      );

      // Find new issues
      for (const issue of result.issues) {
        const key = `${issue.ruleId}:${issue.line}`;
        if (!baselineIssueKeys.has(key)) {
          newFailures.push({
            filePath,
            issue,
            type: 'new',
          });
        } else {
          unchanged.push({
            filePath,
            issue,
            type: 'unchanged',
          });
        }
      }

      // Find resolved issues
      for (const baselineIssue of baselineFile.issues) {
        const key = `${baselineIssue.ruleId}:${baselineIssue.line}`;
        if (!currentIssueKeys.has(key)) {
          resolvedIssues.push({
            filePath,
            issue: baselineIssue,
            type: 'resolved',
          });
        }
      }
    }
  }

  // Check for files that were in baseline but no longer exist in current
  for (const [filePath, baselineFile] of Object.entries(baseline.files)) {
    if (!current.has(filePath)) {
      // All issues in this file are resolved (file was deleted or not analyzed)
      for (const issue of baselineFile.issues) {
        resolvedIssues.push({
          filePath,
          issue,
          type: 'resolved',
        });
      }
    }
  }

  const delta = resolvedIssues.length - newFailures.length;
  const hasRegression = newFailures.length > 0;

  let recommendation: string;
  if (delta > 0) {
    recommendation = `Improved! ${resolvedIssues.length} issues resolved, ${newFailures.length} new issues.`;
  } else if (delta < 0) {
    recommendation = `Regression detected. ${newFailures.length} new issues introduced. Fix before merging.`;
  } else if (newFailures.length > 0) {
    recommendation = `Mixed results. ${newFailures.length} new issues, ${resolvedIssues.length} resolved. Review changes.`;
  } else {
    recommendation = 'No changes. All issues unchanged from baseline.';
  }

  return {
    hasRegression,
    newFailures,
    resolvedIssues,
    unchanged,
    summary: {
      newFailureCount: newFailures.length,
      resolvedCount: resolvedIssues.length,
      unchangedCount: unchanged.length,
      delta,
      recommendation,
    },
  };
}

/**
 * Generate regression report
 */
export function generateRegressionReport(result: RegressionResult): string {
  const { summary, newFailures, resolvedIssues } = result;

  let report = `# F.A.I.L. Kit Regression Report

## Summary

- **New Failures:** ${summary.newFailureCount}
- **Resolved Issues:** ${summary.resolvedCount}
- **Unchanged:** ${summary.unchangedCount}
- **Delta:** ${summary.delta > 0 ? '+' : ''}${summary.delta}

**Recommendation:** ${summary.recommendation}

`;

  if (newFailures.length > 0) {
    report += `## New Failures

| File | Rule | Line | Message |
|------|------|------|---------|
`;
    for (const item of newFailures) {
      const issue = item.issue as Issue;
      report += `| ${item.filePath} | ${issue.ruleId} | ${issue.line + 1} | ${issue.message.substring(0, 50)}... |\n`;
    }
    report += '\n';
  }

  if (resolvedIssues.length > 0) {
    report += `## Resolved Issues

| File | Rule | Line | Message |
|------|------|------|---------|
`;
    for (const item of resolvedIssues) {
      const issue = item.issue as BaselineIssue;
      report += `| ${item.filePath} | ${issue.ruleId} | ${issue.line + 1} | ${issue.message.substring(0, 50)}... |\n`;
    }
  }

  return report;
}

/**
 * Simple hash function for issues
 */
function hashIssues(issues: BaselineIssue[]): string {
  const str = JSON.stringify(issues.map(i => `${i.ruleId}:${i.line}`).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Check if regression exceeds threshold
 */
export function exceedsRegressionThreshold(
  result: RegressionResult,
  maxNewCritical: number = 0,
  maxNewHigh: number = 2,
  maxNewTotal: number = 5
): boolean {
  const newCritical = result.newFailures.filter(
    f => (f.issue as Issue).issueSeverity === 'critical'
  ).length;
  const newHigh = result.newFailures.filter(
    f => (f.issue as Issue).issueSeverity === 'high'
  ).length;

  return (
    newCritical > maxNewCritical ||
    newHigh > maxNewHigh ||
    result.newFailures.length > maxNewTotal
  );
}
