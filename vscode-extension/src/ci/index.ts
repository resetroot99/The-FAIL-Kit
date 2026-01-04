/**
 * F.A.I.L. Kit CI/CD Integration
 *
 * Provides helpers for CI/CD integration:
 * - Template generation
 * - Baseline management per branch
 * - PR comment formatting
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface CITemplate {
  name: string;
  description: string;
  filename: string;
  platform: 'github' | 'gitlab' | 'azure' | 'jenkins';
}

export const CI_TEMPLATES: CITemplate[] = [
  {
    name: 'GitHub Actions',
    description: 'Workflow for GitHub pull request auditing',
    filename: 'github-action.yaml',
    platform: 'github',
  },
  {
    name: 'GitLab CI',
    description: 'Pipeline for GitLab merge request auditing',
    filename: 'gitlab-ci.yaml',
    platform: 'gitlab',
  },
];

/**
 * Get template content
 */
export async function getTemplateContent(template: CITemplate): Promise<string> {
  const extensionPath = vscode.extensions.getExtension('fail-kit.fail-kit')?.extensionPath;
  
  if (!extensionPath) {
    // Fallback to inline templates
    return getInlineTemplate(template);
  }

  const templatePath = path.join(extensionPath, 'templates', template.filename);
  
  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch {
    return getInlineTemplate(template);
  }
}

/**
 * Get inline template (fallback)
 */
function getInlineTemplate(template: CITemplate): string {
  if (template.platform === 'github') {
    return `# F.A.I.L. Kit GitHub Action
name: F.A.I.L. Kit Audit

on:
  pull_request:
    branches: [main, master]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g fail-audit
      - run: npx fail-audit run --format json --output report.json
      - name: Check for critical issues
        run: |
          CRITICAL=$(jq '.summary.criticalCount // 0' report.json)
          if [ "$CRITICAL" -gt "0" ]; then
            echo "::error::Critical issues found"
            exit 1
          fi
`;
  }

  if (template.platform === 'gitlab') {
    return `# F.A.I.L. Kit GitLab CI
stages:
  - audit

fail-kit:audit:
  image: node:20
  stage: audit
  script:
    - npm install -g fail-audit
    - npx fail-audit run --format json --output report.json
    - |
      CRITICAL=$(jq '.summary.criticalCount // 0' report.json)
      if [ "$CRITICAL" -gt "0" ]; then
        echo "Critical issues found"
        exit 1
      fi
  artifacts:
    paths:
      - report.json
`;
  }

  return '# No template available';
}

/**
 * Export CI template to workspace
 */
export async function exportCITemplate(template: CITemplate): Promise<{ success: boolean; path?: string; error?: string }> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return { success: false, error: 'No workspace folder open' };
  }

  const content = await getTemplateContent(template);
  
  let targetPath: string;
  if (template.platform === 'github') {
    targetPath = path.join(workspaceFolder.uri.fsPath, '.github', 'workflows', 'fail-kit.yaml');
  } else if (template.platform === 'gitlab') {
    targetPath = path.join(workspaceFolder.uri.fsPath, '.fail-kit', 'gitlab-ci.yaml');
  } else {
    targetPath = path.join(workspaceFolder.uri.fsPath, '.fail-kit', template.filename);
  }

  // Create directory if needed
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Check if file exists
  if (fs.existsSync(targetPath)) {
    const overwrite = await vscode.window.showWarningMessage(
      `${template.filename} already exists. Overwrite?`,
      'Overwrite',
      'Cancel'
    );
    if (overwrite !== 'Overwrite') {
      return { success: false, error: 'Export cancelled' };
    }
  }

  try {
    fs.writeFileSync(targetPath, content);
    return { success: true, path: targetPath };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Write failed' };
  }
}

/**
 * Get baseline path for current branch
 */
export function getBaselinePath(workspaceFolder: vscode.WorkspaceFolder, branch?: string): string {
  const basePath = path.join(workspaceFolder.uri.fsPath, '.fail-kit');
  
  if (branch) {
    // Sanitize branch name for filesystem
    const safeBranch = branch.replace(/[/\\:*?"<>|]/g, '-');
    return path.join(basePath, `baseline-${safeBranch}.json`);
  }
  
  return path.join(basePath, 'baseline.json');
}

/**
 * Get current git branch
 */
export function getCurrentBranch(workspaceFolder: vscode.WorkspaceFolder): string | null {
  try {
    const { execSync } = require('child_process');
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: workspaceFolder.uri.fsPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return branch;
  } catch {
    return null;
  }
}

/**
 * Format issues for PR comment
 */
export function formatPRComment(summary: {
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  shipDecision: string;
  shipReason: string;
}, regressionDelta?: number): string {
  const icon = summary.shipDecision === 'SHIP' ? '✅' :
               summary.shipDecision === 'BLOCK' ? '🚫' : '⚠️';

  let comment = `## ${icon} F.A.I.L. Kit Audit Report\n\n`;
  comment += `| Severity | Count |\n|----------|-------|\n`;
  comment += `| 🔴 Critical | ${summary.criticalCount} |\n`;
  comment += `| 🟠 High | ${summary.highCount} |\n`;
  comment += `| 🟡 Medium | ${summary.mediumCount} |\n`;
  comment += `| 🟢 Low | ${summary.lowCount} |\n`;
  comment += `| **Total** | **${summary.totalIssues}** |\n\n`;
  comment += `**Decision:** ${summary.shipDecision}\n\n`;
  comment += `**Reason:** ${summary.shipReason}\n\n`;

  if (regressionDelta !== undefined) {
    const deltaIcon = regressionDelta > 0 ? '📈' : regressionDelta < 0 ? '📉' : '➡️';
    const deltaText = regressionDelta > 0 ? `+${regressionDelta}` : `${regressionDelta}`;
    comment += `### Regression\n\n${deltaIcon} ${deltaText} issues compared to baseline\n\n`;
  }

  comment += `---\n*Generated by F.A.I.L. Kit v1.6.0*`;

  return comment;
}

/**
 * Register CI commands
 */
export function registerCICommands(context: vscode.ExtensionContext): void {
  // Export CI Template
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.exportCITemplate', async () => {
      const selected = await vscode.window.showQuickPick(
        CI_TEMPLATES.map(t => ({
          label: t.name,
          description: t.description,
          template: t,
        })),
        { title: 'Select CI/CD Platform' }
      );

      if (!selected) return;

      const result = await exportCITemplate(selected.template);
      
      if (result.success) {
        const openFile = await vscode.window.showInformationMessage(
          `Template exported to ${result.path}`,
          'Open File'
        );
        if (openFile === 'Open File' && result.path) {
          const doc = await vscode.workspace.openTextDocument(result.path);
          await vscode.window.showTextDocument(doc);
        }
      } else {
        vscode.window.showErrorMessage(result.error || 'Export failed');
      }
    })
  );

  // Set Branch Baseline
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.setBranchBaseline', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const branch = getCurrentBranch(workspaceFolder);
      if (!branch) {
        vscode.window.showErrorMessage('Could not determine current git branch');
        return;
      }

      const confirm = await vscode.window.showInformationMessage(
        `Set baseline for branch: ${branch}?`,
        'Set Baseline',
        'Cancel'
      );

      if (confirm === 'Set Baseline') {
        await vscode.commands.executeCommand('fail-kit.setBaseline');
        vscode.window.showInformationMessage(`Baseline set for branch: ${branch}`);
      }
    })
  );
}
