/**
 * F.A.I.L. Kit VS Code Extension
 *
 * Forensic Audit of Intelligent Logic
 *
 * Real-time static analysis for AI agent code.
 * Detects missing receipts, error handling issues, and audit gaps.
 */

import * as vscode from 'vscode';
import { FailKitDiagnosticsProvider } from './diagnostics';
import { FailKitCodeActionProvider, registerCodeActionCommands } from './codeActions';

let diagnosticsProvider: FailKitDiagnosticsProvider | undefined;

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('F.A.I.L. Kit extension activated');

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
          return diagnosticsProvider!.analyzeWorkspace();
        }
      );

      vscode.window.showInformationMessage(
        `F.A.I.L. Kit: Analyzed ${progress.filesAnalyzed} files, found ${progress.issuesFound} issues`
      );
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
        'F.A.I.L. Kit is now active! It will analyze your agent code in real-time.',
        'Learn More',
        'Dismiss'
      )
      .then((selection) => {
        if (selection === 'Learn More') {
          vscode.env.openExternal(
            vscode.Uri.parse('https://github.com/resetroot99/The-FAIL-Kit')
          );
        }
      });
    context.globalState.update('fail-kit.welcomeShown', true);
  }
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  console.log('F.A.I.L. Kit extension deactivated');
  diagnosticsProvider = undefined;
}
