/**
 * F.A.I.L. Kit VS Code Extension
 *
 * Forensic Audit of Intelligent Logic
 *
 * Real-time static analysis for AI agent code.
 * Detects missing receipts, error handling issues, and audit gaps.
 */

import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { FailKitDiagnosticsProvider } from './diagnostics';
import { FailKitCodeActionProvider, registerCodeActionCommands } from './codeActions';
import { AnalysisResult } from './analyzer';
import { 
  generateDashboardHTML, 
  DashboardData, 
  ProvenanceData,
  exportEvidenceBundle,
  exportAsCSV,
  generateEvidencePackage,
} from './reporters/dashboard';
import { 
  applyAllAutoFixes, 
  applyAutoFix, 
  applyFixWithPreview,
  rollbackLastFix,
  previewFix,
  fixHistory,
  registerBlueprintCommands,
} from './autofix';
import {
  loadBaseline,
  saveBaseline,
  createBaseline,
  compareToBaseline,
  generateRegressionReport,
  RegressionResult,
} from './regression';
import { registerSandboxCommands } from './sandbox/server';
import { registerCICommands } from './ci';
import { registerPolicyCommands } from './policies';
import { registerSDKCommands, runCustomRules, matchesToIssues } from './sdk';
import { initTelemetry, reportError } from './utils';
import { PythonLSPClient, createPythonLSPClient } from './python-lsp';

let diagnosticsProvider: FailKitDiagnosticsProvider | undefined;
let dashboardPanel: vscode.WebviewPanel | undefined;
let currentResults: Map<string, AnalysisResult> = new Map();
let currentRegressionResult: RegressionResult | undefined;
let pythonLSPClient: PythonLSPClient | undefined;

const EXTENSION_VERSION = '1.0.1';

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('F.A.I.L. Kit extension activated');

  // Initialize telemetry (disabled by default)
  initTelemetry();

  // Create diagnostics provider
  diagnosticsProvider = new FailKitDiagnosticsProvider();
  context.subscriptions.push(diagnosticsProvider);

  // Register code action provider
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    [
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'file', language: 'javascriptreact' },
    ],
    new FailKitCodeActionProvider(),
    {
      providedCodeActionKinds: FailKitCodeActionProvider.providedCodeActionKinds,
    }
  );
  context.subscriptions.push(codeActionProvider);

  // Register code action commands
  registerCodeActionCommands(context);

  // Register sandbox commands
  registerSandboxCommands(context);

  // Register CI/CD commands
  registerCICommands(context);

  // Register policy commands
  registerPolicyCommands(context);

  // Register SDK commands
  registerSDKCommands(context);

  // Register Blueprint commands (Forensic Patterns)
  registerBlueprintCommands(context);

  // Initialize Python LSP client if enabled
  const pythonLSPEnabled = vscode.workspace.getConfiguration('failKit').get<boolean>('pythonLsp.enabled', false);
  if (pythonLSPEnabled) {
    pythonLSPClient = createPythonLSPClient();
    pythonLSPClient.start().then((started) => {
      if (started) {
        vscode.window.showInformationMessage('F.A.I.L. Kit: Python LSP server started');
      }
    });
    context.subscriptions.push({ dispose: () => pythonLSPClient?.dispose() });
  }

  // Register Python LSP commands
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.startPythonLSP', async () => {
      if (!pythonLSPClient) {
        pythonLSPClient = createPythonLSPClient();
      }
      const started = await pythonLSPClient.start();
      if (started) {
        vscode.window.showInformationMessage('F.A.I.L. Kit: Python LSP server started');
      } else {
        vscode.window.showErrorMessage('F.A.I.L. Kit: Failed to start Python LSP server');
      }
    }),
    vscode.commands.registerCommand('fail-kit.stopPythonLSP', async () => {
      if (pythonLSPClient) {
        await pythonLSPClient.stop();
        vscode.window.showInformationMessage('F.A.I.L. Kit: Python LSP server stopped');
      }
    }),
    vscode.commands.registerCommand('fail-kit.restartPythonLSP', async () => {
      if (pythonLSPClient) {
        const restarted = await pythonLSPClient.restart();
        if (restarted) {
          vscode.window.showInformationMessage('F.A.I.L. Kit: Python LSP server restarted');
        } else {
          vscode.window.showErrorMessage('F.A.I.L. Kit: Failed to restart Python LSP server');
        }
      }
    }),
    vscode.commands.registerCommand('fail-kit.showPythonLSPLogs', () => {
      if (pythonLSPClient) {
        pythonLSPClient.getOutputChannel().show();
      } else {
        vscode.window.showWarningMessage('Python LSP client not initialized');
      }
    })
  );

  // Register manual analysis commands
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.analyzeFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && diagnosticsProvider) {
        diagnosticsProvider.triggerAnalysis(editor.document);
        vscode.window.showInformationMessage('F.A.I.L. Kit: Analysis complete');
      } else {
        vscode.window.showWarningMessage('No active editor to analyze');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.analyzeWorkspace', async () => {
      if (!diagnosticsProvider) {
        vscode.window.showErrorMessage('F.A.I.L. Kit not initialized');
        return;
      }

      const progress = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'F.A.I.L. Kit: Analyzing workspace...',
          cancellable: false,
        },
        async () => {
          const result = await diagnosticsProvider!.analyzeWorkspace();
          currentResults = diagnosticsProvider!.getAllResults();
          return result;
        }
      );

      vscode.window.showInformationMessage(
        `F.A.I.L. Kit: Analyzed ${progress.filesAnalyzed} files, found ${progress.issuesFound} issues`
      );
    })
  );

  // ============================================
  // NEW COMMANDS
  // ============================================

  // Generate Dashboard Report
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.generateReport', async () => {
      if (!diagnosticsProvider) {
        vscode.window.showErrorMessage('F.A.I.L. Kit not initialized');
        return;
      }

      // Run workspace analysis first
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'F.A.I.L. Kit: Generating report...',
          cancellable: false,
        },
        async () => {
          await diagnosticsProvider!.analyzeWorkspace();
          currentResults = diagnosticsProvider!.getAllResults();
        }
      );

      // Check for baseline and compare
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const baseline = loadBaseline(workspaceFolder);
        if (baseline) {
          currentRegressionResult = compareToBaseline(currentResults, baseline);
        }
      }

      // Create or reveal dashboard panel
      showDashboard(context);
    })
  );

  // Set Baseline
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.setBaseline', async () => {
      if (!diagnosticsProvider) {
        vscode.window.showErrorMessage('F.A.I.L. Kit not initialized');
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      // Run analysis first
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'F.A.I.L. Kit: Creating baseline...',
          cancellable: false,
        },
        async () => {
          await diagnosticsProvider!.analyzeWorkspace();
          currentResults = diagnosticsProvider!.getAllResults();
          const baseline = createBaseline(currentResults);
          saveBaseline(workspaceFolder, baseline);
        }
      );

      vscode.window.showInformationMessage(
        `F.A.I.L. Kit: Baseline saved with ${currentResults.size} files`
      );
    })
  );

  // Compare to Baseline
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.compareBaseline', async () => {
      if (!diagnosticsProvider) {
        vscode.window.showErrorMessage('F.A.I.L. Kit not initialized');
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const baseline = loadBaseline(workspaceFolder);
      if (!baseline) {
        vscode.window.showWarningMessage('No baseline found. Set a baseline first.');
        return;
      }

      // Run analysis
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'F.A.I.L. Kit: Comparing to baseline...',
          cancellable: false,
        },
        async () => {
          await diagnosticsProvider!.analyzeWorkspace();
          currentResults = diagnosticsProvider!.getAllResults();
          currentRegressionResult = compareToBaseline(currentResults, baseline);
        }
      );

      // Show results
      if (currentRegressionResult) {
        const { summary } = currentRegressionResult;
        const icon = summary.delta >= 0 ? '[OK]' : '[!]';
        vscode.window.showInformationMessage(
          `${icon} F.A.I.L. Kit: ${summary.recommendation}`,
          'View Report'
        ).then(selection => {
          if (selection === 'View Report') {
            showDashboard(context);
          }
        });
      }
    })
  );

  // Auto-Fix All
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.autoFixAll', async () => {
      if (!diagnosticsProvider) {
        vscode.window.showErrorMessage('F.A.I.L. Kit not initialized');
        return;
      }

      // Get current document
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const result = currentResults.get(editor.document.uri.fsPath);
      if (!result || result.issues.length === 0) {
        vscode.window.showInformationMessage('No issues to fix in current file');
        return;
      }

      // Apply fixes
      const fixes = await applyAllAutoFixes(result.issues, editor.document);

      if (fixes.length === 0) {
        vscode.window.showInformationMessage('No auto-fixable issues found');
        return;
      }

      // Confirm with user
      const confirm = await vscode.window.showWarningMessage(
        `Apply ${fixes.length} auto-fixes?`,
        'Apply All',
        'Preview',
        'Cancel'
      );

      if (confirm === 'Apply All') {
        // Apply all fixes
        for (const fix of fixes) {
          await vscode.workspace.applyEdit(fix.fix);
        }
        vscode.window.showInformationMessage(`Applied ${fixes.length} fixes`);

        // Re-analyze
        diagnosticsProvider.triggerAnalysis(editor.document);
      } else if (confirm === 'Preview') {
        // Show preview of fixes
        const preview = fixes.map(f => `• ${f.description}`).join('\n');
        vscode.window.showInformationMessage(`Fixes:\n${preview}`, { modal: true });
      }
    })
  );

  // Auto-Fix Single Issue (with preview)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'fail-kit.autoFixIssue',
      async (filePath: string, line: number, ruleId: string) => {
        const document = await vscode.workspace.openTextDocument(filePath);
        const result = currentResults.get(filePath);

        if (!result) {
          vscode.window.showErrorMessage('No analysis results for this file');
          return;
        }

        const issue = result.issues.find(i => i.line === line && i.ruleId === ruleId);
        if (!issue) {
          vscode.window.showErrorMessage('Issue not found');
          return;
        }

        // Use new preview system
        const fixResult = await applyFixWithPreview(issue, document, true);
        if (fixResult.applied) {
          vscode.window.showInformationMessage(`Fix applied. Use 'F.A.I.L. Kit: Rollback' to undo.`);
          // Re-analyze
          if (diagnosticsProvider) {
            diagnosticsProvider.triggerAnalysis(document);
          }
        } else if (fixResult.error) {
          vscode.window.showWarningMessage(fixResult.error);
        }
      }
    )
  );

  // Rollback Last Fix
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.rollbackFix', async () => {
      if (!fixHistory.canRollback()) {
        vscode.window.showInformationMessage('No fixes to rollback');
        return;
      }

      const lastEntry = fixHistory.getLastEntry();
      const confirm = await vscode.window.showWarningMessage(
        `Rollback ${lastEntry?.ruleId} fix in ${lastEntry?.filePath.split('/').pop()}?`,
        'Rollback',
        'Cancel'
      );

      if (confirm !== 'Rollback') {
        return;
      }

      const result = await rollbackLastFix();
      if (result.success) {
        vscode.window.showInformationMessage(result.message);
        // Re-analyze affected file
        if (diagnosticsProvider && lastEntry) {
          const document = await vscode.workspace.openTextDocument(lastEntry.filePath);
          diagnosticsProvider.triggerAnalysis(document);
        }
      } else {
        vscode.window.showErrorMessage(result.message);
      }
    })
  );

  // Show Fix History
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.showFixHistory', async () => {
      const history = fixHistory.getHistory(20);
      
      if (history.length === 0) {
        vscode.window.showInformationMessage('No fix history available');
        return;
      }

      const items = history.map((entry, index) => ({
        label: `${entry.ruleId}: ${entry.description}`,
        description: `${entry.filePath.split('/').pop()} - ${entry.timestamp.toLocaleString()}`,
        detail: `Line ${entry.range.startLine + 1}`,
        entry,
        index,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        title: 'Fix History',
        placeHolder: 'Select a fix to view or rollback',
      });

      if (selected) {
        const action = await vscode.window.showQuickPick(
          [
            { label: '$(eye) View File', value: 'view' },
            { label: '$(discard) Rollback This & Subsequent', value: 'rollback' },
          ],
          { title: `${selected.entry.ruleId} Fix` }
        );

        if (action?.value === 'view') {
          const doc = await vscode.workspace.openTextDocument(selected.entry.filePath);
          const editor = await vscode.window.showTextDocument(doc);
          const pos = new vscode.Position(selected.entry.range.startLine, 0);
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        } else if (action?.value === 'rollback') {
          const result = await fixHistory.rollbackById(selected.entry.id);
          if (result.success) {
            vscode.window.showInformationMessage('Rollback complete');
          } else {
            vscode.window.showErrorMessage(result.error || 'Rollback failed');
          }
        }
      }
    })
  );

  // Show Issue in Dashboard
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'fail-kit.showInDashboard',
      async (filePath: string, line: number, ruleId: string) => {
        // Open dashboard first
        await vscode.commands.executeCommand('fail-kit.generateReport');
        
        // Scroll to the issue in the dashboard (handled by webview message)
        if (dashboardPanel) {
          dashboardPanel.webview.postMessage({
            command: 'scrollToIssue',
            filePath,
            line,
            ruleId,
          });
        }
      }
    )
  );

  // Export Report
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.exportReport', async () => {
      if (currentResults.size === 0) {
        vscode.window.showWarningMessage('No analysis results to export');
        return;
      }

      // Generate markdown report
      let report = `# F.A.I.L. Kit Audit Report\n\n`;
      report += `Generated: ${new Date().toISOString()}\n\n`;

      let totalIssues = 0;
      for (const [filePath, result] of currentResults) {
        if (result.issues.length > 0) {
          report += `## ${filePath}\n\n`;
          for (const issue of result.issues) {
            report += `- **[${issue.issueSeverity.toUpperCase()}]** Line ${issue.line + 1}: ${issue.message}\n`;
            report += `  - Business Impact: ${issue.businessImpact}\n`;
            report += `  - Fix: ${issue.fixHint}\n\n`;
            totalIssues++;
          }
        }
      }

      if (currentRegressionResult) {
        report += `\n## Regression Analysis\n\n`;
        report += generateRegressionReport(currentRegressionResult);
      }

      // Save to file
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('fail-kit-report.md'),
        filters: { 'Markdown': ['md'] },
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(report));
        vscode.window.showInformationMessage(`Report saved to ${uri.fsPath}`);
      }
    })
  );

  // Register status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = '$(shield) FAIL-Kit';
  statusBarItem.tooltip = 'F.A.I.L. Kit: Click to analyze current file';
  statusBarItem.command = 'fail-kit.analyzeFile';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Update status bar based on diagnostics
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && diagnosticsProvider) {
        const diagnostics = diagnosticsProvider.getDiagnostics(editor.document.uri);
        if (diagnostics.length > 0) {
          statusBarItem.text = `$(shield) FAIL-Kit (${diagnostics.length})`;
          statusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.warningBackground'
          );
        } else {
          statusBarItem.text = '$(shield) FAIL-Kit';
          statusBarItem.backgroundColor = undefined;
        }
      }
    })
  );

  // Show welcome message on first activation
  const hasShownWelcome = context.globalState.get('fail-kit.welcomeShown');
  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        'F.A.I.L. Kit v0.2.0 is now active! Real-time analysis + Dashboard + Auto-Fix.',
        'View Dashboard',
        'Dismiss'
      )
      .then((selection) => {
        if (selection === 'View Dashboard') {
          vscode.commands.executeCommand('fail-kit.generateReport');
        }
      });
    context.globalState.update('fail-kit.welcomeShown', true);
  }
}

/**
 * Show dashboard webview panel
 */
function showDashboard(context: vscode.ExtensionContext): void {
  if (dashboardPanel) {
    dashboardPanel.reveal(vscode.ViewColumn.One);
  } else {
    dashboardPanel = vscode.window.createWebviewPanel(
      'failKitDashboard',
      'F.A.I.L. Kit Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    dashboardPanel.onDidDispose(() => {
      dashboardPanel = undefined;
    });

    // Handle messages from webview
    dashboardPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'openFile':
          const doc = await vscode.workspace.openTextDocument(message.filePath);
          const editor = await vscode.window.showTextDocument(doc);
          const position = new vscode.Position(message.line, 0);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          );
          break;

        case 'fixIssue':
          vscode.commands.executeCommand(
            'fail-kit.autoFixIssue',
            message.filePath,
            message.line,
            message.ruleId
          );
          break;

        case 'autoFix':
          vscode.commands.executeCommand('fail-kit.autoFixAll');
          break;

        case 'setBaseline':
          vscode.commands.executeCommand('fail-kit.setBaseline');
          break;

        case 'exportReport':
          vscode.commands.executeCommand('fail-kit.exportReport');
          break;

        case 'exportJSON':
          await exportAsJSON();
          break;

        case 'exportCSV':
          await exportAsCSVFile();
          break;

        case 'exportIssue':
          await exportSingleIssue(message.index);
          break;

        case 'refresh':
          vscode.commands.executeCommand('fail-kit.generateReport');
          break;
      }
    });

    // Helper function to export as JSON
    async function exportAsJSON() {
      const allIssues = gatherAllIssues();
      const provenance = gatherProvenance();
      const json = exportEvidenceBundle(allIssues, provenance);
      
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('fail-kit-evidence.json'),
        filters: { 'JSON': ['json'] },
      });
      
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(json));
        vscode.window.showInformationMessage(`Evidence exported to ${uri.fsPath}`);
      }
    }

    // Helper function to export as CSV
    async function exportAsCSVFile() {
      const allIssues = gatherAllIssues();
      const csv = exportAsCSV(allIssues);
      
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('fail-kit-issues.csv'),
        filters: { 'CSV': ['csv'] },
      });
      
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(csv));
        vscode.window.showInformationMessage(`CSV exported to ${uri.fsPath}`);
      }
    }

    // Helper function to export single issue
    async function exportSingleIssue(index: number) {
      const allIssues = gatherAllIssues();
      if (index < 0 || index >= allIssues.length) return;
      
      const issue = allIssues[index];
      const provenance = gatherProvenance();
      const evidence = generateEvidencePackage(issue, provenance);
      
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`fail-kit-${issue.ruleId}-evidence.json`),
        filters: { 'JSON': ['json'] },
      });
      
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(evidence, null, 2)));
        vscode.window.showInformationMessage(`Evidence for ${issue.ruleId} exported`);
      }
    }

    // Helper function to gather all issues
    function gatherAllIssues() {
      const allIssues: Array<any> = [];
      for (const [filePath, result] of currentResults) {
        for (const issue of result.issues) {
          allIssues.push({ ...issue, filePath });
        }
      }
      return allIssues;
    }
  }

  // Update dashboard content
  updateDashboard(context);
}

/**
 * Update dashboard webview content
 */
function updateDashboard(context: vscode.ExtensionContext): void {
  if (!dashboardPanel) return;

  const provenance = gatherProvenance();

  const dashboardData: DashboardData = {
    results: currentResults,
    regressionResult: currentRegressionResult,
    provenance,
  };

  dashboardPanel.webview.html = generateDashboardHTML(
    dashboardData,
    dashboardPanel.webview,
    context.extensionUri
  );
}

/**
 * Gather provenance data
 */
function gatherProvenance(): ProvenanceData {
  let gitHash = 'unknown';
  let gitBranch = 'unknown';
  let gitDirty = false;

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceFolder) {
      gitHash = execSync('git rev-parse HEAD', {
        cwd: workspaceFolder,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim().substring(0, 8);

      gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: workspaceFolder,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();

      const statusOutput = execSync('git status --porcelain', {
        cwd: workspaceFolder,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      gitDirty = statusOutput.length > 0;
    }
  } catch {
    // Not a git repo or git not available
  }

  return {
    gitHash,
    gitBranch,
    gitDirty,
    extensionVersion: EXTENSION_VERSION,
    timestamp: new Date().toISOString(),
    platform: `${process.platform}/${process.arch}`,
  };
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  console.log('F.A.I.L. Kit extension deactivated');
  diagnosticsProvider = undefined;
  if (dashboardPanel) {
    dashboardPanel.dispose();
    dashboardPanel = undefined;
  }
  if (pythonLSPClient) {
    pythonLSPClient.dispose();
    pythonLSPClient = undefined;
  }
}
