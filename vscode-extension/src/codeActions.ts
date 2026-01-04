/**
 * F.A.I.L. Kit Code Action Provider
 *
 * Provides quick fixes for agent code issues detected by diagnostics.
 * Enhanced with dashboard links and severity indicators.
 */

import * as vscode from 'vscode';
import { DIAGNOSTIC_SOURCE } from './diagnostics';

/**
 * Extract rule ID from diagnostic code
 */
function getRuleIdFromDiagnostic(diagnostic: vscode.Diagnostic): string {
  if (typeof diagnostic.code === 'object' && diagnostic.code !== null) {
    return String(diagnostic.code.value);
  }
  return String(diagnostic.code);
}

/**
 * Quick fix templates for different issue types
 */
const QUICK_FIX_TEMPLATES = {
  FK001: {
    todo: '// TODO: [FAIL-Kit] Add receipt generation for audit compliance\n',
    receiptSnippet: `
// Generate receipt for audit trail
const receipt = {
  action_id: \`act_\${crypto.randomBytes(4).toString('hex')}\`,
  tool_name: '$TOOL_NAME',
  timestamp: new Date().toISOString(),
  status: 'success',
  input_hash: hashData(input),
  output_hash: hashData(result),
};
`,
    wrapperSnippet: `
// Wrap with receipt generation
const receiptResult = await generateReceiptForAction(async () => {
  $ORIGINAL_CODE
});
`,
  },
  FK002: {
    todo: '// TODO: [FAIL-Kit] Add error handling for this LLM call\n',
    tryCatchSnippet: `try {
  $ORIGINAL_CODE
} catch (error) {
  console.error('LLM call failed:', error);
  throw error;
}
`,
  },
  FK003: {
    todo: '// TODO: [FAIL-Kit] Move this secret to environment variable\n',
  },
  FK004: {
    todo: '// TODO: [FAIL-Kit] Add confirmation before this destructive operation\n',
  },
  FK005: {
    todo: '// TODO: [FAIL-Kit] Add timeout and retry logic for this LLM call\n',
  },
  FK006: {
    todo: '// TODO: [FAIL-Kit] Add action_id and timestamp for provenance\n',
  },
  FK007: {
    todo: '// TODO: [FAIL-Kit] Remove hardcoded credential - use environment variable\n',
  },
};

/**
 * Code action provider for F.A.I.L. Kit quick fixes
 */
export class FailKitCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
  ];

  /**
   * Provide code actions for diagnostics
   */
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== DIAGNOSTIC_SOURCE) {
        continue;
      }

      const ruleId = getRuleIdFromDiagnostic(diagnostic);

      // Add "View in Dashboard" action for all rules
      actions.push(this.createDashboardAction(document, diagnostic, ruleId));

      // Add "Auto-Fix" action for supported rules
      if (['FK001', 'FK002', 'FK003', 'FK004', 'FK005', 'FK006', 'FK007'].includes(ruleId)) {
        actions.push(this.createAutoFixAction(document, diagnostic, ruleId));
      }

      switch (ruleId) {
        case 'FK001':
          actions.push(...this.createFK001Actions(document, diagnostic));
          break;
        case 'FK002':
          actions.push(...this.createFK002Actions(document, diagnostic));
          break;
        case 'FK003':
        case 'FK007':
          actions.push(...this.createSecretActions(document, diagnostic, ruleId));
          break;
        case 'FK004':
          actions.push(...this.createSideEffectActions(document, diagnostic));
          break;
        case 'FK005':
          actions.push(...this.createResilienceActions(document, diagnostic));
          break;
        case 'FK006':
          actions.push(...this.createProvenanceActions(document, diagnostic));
          break;
        default:
          // Generic TODO action for unknown rules
          actions.push(this.createTodoAction(document, diagnostic, ruleId));
          break;
      }
    }

    return actions;
  }

  /**
   * Create "View in Dashboard" action
   */
  private createDashboardAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    ruleId: string
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      '$(dashboard) View in Dashboard',
      vscode.CodeActionKind.QuickFix
    );
    action.command = {
      command: 'fail-kit.showInDashboard',
      title: 'View in Dashboard',
      arguments: [document.uri.fsPath, diagnostic.range.start.line, ruleId],
    };
    return action;
  }

  /**
   * Create "Auto-Fix" action
   */
  private createAutoFixAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    ruleId: string
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      '$(wand) Auto-Fix This Issue',
      vscode.CodeActionKind.QuickFix
    );
    action.command = {
      command: 'fail-kit.autoFixIssue',
      title: 'Auto-Fix Issue',
      arguments: [document.uri.fsPath, diagnostic.range.start.line, ruleId],
    };
    action.isPreferred = true;
    return action;
  }

  /**
   * Create actions for FK003/FK007: Secret exposure
   */
  private createSecretActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    ruleId: string
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const template = ruleId === 'FK003' ? QUICK_FIX_TEMPLATES.FK003 : QUICK_FIX_TEMPLATES.FK007;

    // Action 1: Add TODO comment
    const todoAction = new vscode.CodeAction(
      'Add TODO: Move secret to environment variable',
      vscode.CodeActionKind.QuickFix
    );
    todoAction.edit = new vscode.WorkspaceEdit();
    todoAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      this.getIndentation(document, diagnostic.range.start.line) + template.todo
    );
    todoAction.diagnostics = [diagnostic];
    actions.push(todoAction);

    // Action 2: Show security documentation
    const docsAction = new vscode.CodeAction(
      'Learn about secure secret management',
      vscode.CodeActionKind.QuickFix
    );
    docsAction.command = {
      command: 'fail-kit.showDocumentation',
      title: 'Show Documentation',
      arguments: ['secrets'],
    };
    actions.push(docsAction);

    return actions;
  }

  /**
   * Create actions for FK004: Side-effect without confirmation
   */
  private createSideEffectActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const todoAction = new vscode.CodeAction(
      'Add TODO: Add confirmation for destructive operation',
      vscode.CodeActionKind.QuickFix
    );
    todoAction.edit = new vscode.WorkspaceEdit();
    todoAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      this.getIndentation(document, diagnostic.range.start.line) + QUICK_FIX_TEMPLATES.FK004.todo
    );
    todoAction.diagnostics = [diagnostic];
    actions.push(todoAction);

    // Disable action
    actions.push(this.createDisableAction(document, diagnostic));

    return actions;
  }

  /**
   * Create actions for FK005: LLM without resilience
   */
  private createResilienceActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const todoAction = new vscode.CodeAction(
      'Add TODO: Add timeout/retry for LLM call',
      vscode.CodeActionKind.QuickFix
    );
    todoAction.edit = new vscode.WorkspaceEdit();
    todoAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      this.getIndentation(document, diagnostic.range.start.line) + QUICK_FIX_TEMPLATES.FK005.todo
    );
    todoAction.diagnostics = [diagnostic];
    actions.push(todoAction);

    actions.push(this.createDisableAction(document, diagnostic));

    return actions;
  }

  /**
   * Create actions for FK006: Missing provenance
   */
  private createProvenanceActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const todoAction = new vscode.CodeAction(
      'Add TODO: Add provenance metadata',
      vscode.CodeActionKind.QuickFix
    );
    todoAction.edit = new vscode.WorkspaceEdit();
    todoAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      this.getIndentation(document, diagnostic.range.start.line) + QUICK_FIX_TEMPLATES.FK006.todo
    );
    todoAction.diagnostics = [diagnostic];
    actions.push(todoAction);

    actions.push(this.createDisableAction(document, diagnostic));

    return actions;
  }

  /**
   * Create disable action for any rule
   */
  private createDisableAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const disableAction = new vscode.CodeAction(
      'Disable F.A.I.L. Kit for this line',
      vscode.CodeActionKind.QuickFix
    );
    disableAction.edit = new vscode.WorkspaceEdit();
    disableAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      this.getIndentation(document, diagnostic.range.start.line) +
        '// fail-kit-disable-next-line\n'
    );
    disableAction.diagnostics = [diagnostic];
    return disableAction;
  }

  /**
   * Create actions for FK001: Missing receipt
   */
  private createFK001Actions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Action 1: Add TODO comment
    const todoAction = new vscode.CodeAction(
      'Add TODO: Generate receipt for this tool call',
      vscode.CodeActionKind.QuickFix
    );
    todoAction.edit = new vscode.WorkspaceEdit();
    todoAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      this.getIndentation(document, diagnostic.range.start.line) +
        QUICK_FIX_TEMPLATES.FK001.todo
    );
    todoAction.diagnostics = [diagnostic];
    todoAction.isPreferred = true;
    actions.push(todoAction);

    // Action 2: Add fail-kit-disable comment
    const disableAction = new vscode.CodeAction(
      'Disable F.A.I.L. Kit for this line',
      vscode.CodeActionKind.QuickFix
    );
    disableAction.edit = new vscode.WorkspaceEdit();
    disableAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      this.getIndentation(document, diagnostic.range.start.line) +
        '// fail-kit-disable-next-line\n'
    );
    disableAction.diagnostics = [diagnostic];
    actions.push(disableAction);

    // Action 3: Show documentation
    const docsAction = new vscode.CodeAction(
      'Learn about receipt generation',
      vscode.CodeActionKind.QuickFix
    );
    docsAction.command = {
      command: 'fail-kit.showDocumentation',
      title: 'Show Documentation',
      arguments: ['receipts'],
    };
    actions.push(docsAction);

    return actions;
  }

  /**
   * Create actions for FK002: Missing error handling
   */
  private createFK002Actions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Action 1: Add TODO comment
    const todoAction = new vscode.CodeAction(
      'Add TODO: Add error handling for LLM call',
      vscode.CodeActionKind.QuickFix
    );
    todoAction.edit = new vscode.WorkspaceEdit();
    todoAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      this.getIndentation(document, diagnostic.range.start.line) +
        QUICK_FIX_TEMPLATES.FK002.todo
    );
    todoAction.diagnostics = [diagnostic];
    todoAction.isPreferred = true;
    actions.push(todoAction);

    // Action 2: Wrap in try-catch (using snippet)
    const wrapAction = new vscode.CodeAction(
      'Wrap in try-catch block',
      vscode.CodeActionKind.Refactor
    );
    wrapAction.command = {
      command: 'fail-kit.wrapInTryCatch',
      title: 'Wrap in try-catch',
      arguments: [document.uri, diagnostic.range],
    };
    actions.push(wrapAction);

    // Action 3: Add fail-kit-disable comment
    const disableAction = new vscode.CodeAction(
      'Disable F.A.I.L. Kit for this line',
      vscode.CodeActionKind.QuickFix
    );
    disableAction.edit = new vscode.WorkspaceEdit();
    disableAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      this.getIndentation(document, diagnostic.range.start.line) +
        '// fail-kit-disable-next-line\n'
    );
    disableAction.diagnostics = [diagnostic];
    actions.push(disableAction);

    return actions;
  }

  /**
   * Create a generic TODO action for any rule
   */
  private createTodoAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    ruleId: string
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Add TODO: Fix ${ruleId} issue`,
      vscode.CodeActionKind.QuickFix
    );
    action.edit = new vscode.WorkspaceEdit();
    action.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      this.getIndentation(document, diagnostic.range.start.line) +
        `// TODO: [FAIL-Kit ${ruleId}] ${diagnostic.message}\n`
    );
    action.diagnostics = [diagnostic];
    return action;
  }

  /**
   * Get the indentation of a line
   */
  private getIndentation(document: vscode.TextDocument, lineNumber: number): string {
    const line = document.lineAt(lineNumber);
    const match = line.text.match(/^(\s*)/);
    return match ? match[1] : '';
  }
}

/**
 * Register commands for code actions
 */
export function registerCodeActionCommands(
  context: vscode.ExtensionContext
): void {
  // Command: Wrap in try-catch
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'fail-kit.wrapInTryCatch',
      async (uri: vscode.Uri, range: vscode.Range) => {
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);

        // Get the line content
        const lineText = document.lineAt(range.start.line).text;
        const indent = lineText.match(/^(\s*)/)?.[1] || '';

        // Create try-catch wrapper
        const wrappedCode = `${indent}try {\n${lineText}\n${indent}} catch (error) {\n${indent}  console.error('Operation failed:', error);\n${indent}  throw error;\n${indent}}\n`;

        // Replace the line
        await editor.edit((editBuilder) => {
          const fullLineRange = document.lineAt(range.start.line).range;
          editBuilder.replace(fullLineRange, wrappedCode);
        });
      }
    )
  );

  // Command: Show documentation
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.showDocumentation', (topic: string) => {
      const baseUrl = 'https://github.com/resetroot99/The-FAIL-Kit';
      let url = baseUrl;

      switch (topic) {
        case 'receipts':
          url = `${baseUrl}/blob/main/receipt-standard/README.md`;
          break;
        case 'error-handling':
          url = `${baseUrl}/blob/main/docs/SECURITY_TESTING.md`;
          break;
        default:
          url = `${baseUrl}#readme`;
      }

      vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );
}
