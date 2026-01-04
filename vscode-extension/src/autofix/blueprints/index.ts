/**
 * F.A.I.L. Kit Forensic Blueprints
 *
 * Standardized code scaffolding templates for audit compliance.
 * One-click generation of receipts, error handlers, and audit logging.
 */

import * as vscode from 'vscode';
import { Issue } from '../../analyzer';
import {
  Blueprint,
  BlueprintContext,
  BlueprintGenerator,
  BlueprintRegistryEntry,
} from './types';
import { extractBlueprintContext, detectBlueprintType } from './context-extractor';
import {
  generateReceiptBlueprint,
  generateCompactReceiptBlueprint,
  generateReceiptWithErrorBlueprint,
} from './receipt';
import {
  generateTryCatchBlueprint,
  generateRetryHandlerBlueprint,
  generateLLMErrorHandlerBlueprint,
  generateGracefulDegradationBlueprint,
} from './error-handler';
import {
  generateAuditLoggerClass,
  generateWithRetryUtility,
  generateAuditLoggerFileBlueprint,
  generateSideEffectConfirmationBlueprint,
  generateProvenanceBlueprint,
  generateSecretRemediationBlueprint,
} from './audit-logger';

// Re-export types
export * from './types';
export { extractBlueprintContext, detectBlueprintType } from './context-extractor';
export { generateAuditLoggerClass, generateWithRetryUtility } from './audit-logger';

/**
 * Blueprint registry - maps rule IDs to generators
 */
const BLUEPRINT_REGISTRY: BlueprintRegistryEntry[] = [
  // FK001: Receipt generation (multiple options)
  { ruleId: 'FK001', generator: generateReceiptBlueprint, priority: 100 },
  { ruleId: 'FK001', generator: generateReceiptWithErrorBlueprint, priority: 90 },
  { ruleId: 'FK001', generator: generateCompactReceiptBlueprint, priority: 80 },
  
  // FK002: Error handling
  { ruleId: 'FK002', generator: generateTryCatchBlueprint, priority: 100 },
  { ruleId: 'FK002', generator: generateRetryHandlerBlueprint, priority: 90 },
  { ruleId: 'FK002', generator: generateLLMErrorHandlerBlueprint, priority: 85 },
  { ruleId: 'FK002', generator: generateGracefulDegradationBlueprint, priority: 70 },
  
  // FK003/FK007: Secret remediation
  { ruleId: 'FK003', generator: generateSecretRemediationBlueprint, priority: 100 },
  { ruleId: 'FK007', generator: generateSecretRemediationBlueprint, priority: 100 },
  
  // FK004: Side-effect confirmation
  { ruleId: 'FK004', generator: generateSideEffectConfirmationBlueprint, priority: 100 },
  
  // FK005: LLM resilience
  { ruleId: 'FK005', generator: generateRetryHandlerBlueprint, priority: 100 },
  { ruleId: 'FK005', generator: generateLLMErrorHandlerBlueprint, priority: 90 },
  
  // FK006: Provenance metadata
  { ruleId: 'FK006', generator: generateProvenanceBlueprint, priority: 100 },
];

/**
 * Get all applicable blueprints for an issue
 */
export function getBlueprintsForIssue(
  issue: Issue,
  document: vscode.TextDocument
): Blueprint[] {
  const context = extractBlueprintContext(issue, document);
  const blueprints: Blueprint[] = [];
  
  // Find matching generators
  const matchingEntries = BLUEPRINT_REGISTRY
    .filter(entry => entry.ruleId === issue.ruleId)
    .sort((a, b) => b.priority - a.priority);
  
  for (const entry of matchingEntries) {
    const blueprint = entry.generator(issue, context);
    if (blueprint) {
      blueprints.push(blueprint);
    }
  }
  
  return blueprints;
}

/**
 * Get the best blueprint for an issue (highest priority)
 */
export function getBestBlueprint(
  issue: Issue,
  document: vscode.TextDocument
): Blueprint | null {
  const blueprints = getBlueprintsForIssue(issue, document);
  return blueprints.length > 0 ? blueprints[0] : null;
}

/**
 * Apply a blueprint to a document
 */
export async function applyBlueprint(
  blueprint: Blueprint,
  issue: Issue,
  document: vscode.TextDocument
): Promise<boolean> {
  const edit = new vscode.WorkspaceEdit();
  
  switch (blueprint.insertPosition) {
    case 'before': {
      const position = new vscode.Position(issue.line, 0);
      edit.insert(document.uri, position, blueprint.code + '\n');
      break;
    }
    
    case 'after': {
      const position = new vscode.Position(issue.endLine + 1, 0);
      edit.insert(document.uri, position, blueprint.code + '\n');
      break;
    }
    
    case 'replace': {
      const range = new vscode.Range(
        new vscode.Position(issue.line, 0),
        new vscode.Position(issue.endLine, document.lineAt(issue.endLine).text.length)
      );
      edit.replace(document.uri, range, blueprint.code.trim());
      break;
    }
    
    case 'wrap': {
      // Get the original code
      const range = new vscode.Range(
        new vscode.Position(issue.line, 0),
        new vscode.Position(issue.endLine, document.lineAt(issue.endLine).text.length)
      );
      edit.replace(document.uri, range, blueprint.code.trim());
      break;
    }
  }
  
  // Add required imports if specified
  if (blueprint.requiredImports && blueprint.requiredImports.length > 0) {
    const importText = generateImportStatements(blueprint.requiredImports);
    
    // Find the best position for imports (after existing imports or at top)
    const importPosition = findImportInsertPosition(document);
    edit.insert(document.uri, importPosition, importText + '\n');
  }
  
  return vscode.workspace.applyEdit(edit);
}

/**
 * Generate import statements from import specs
 */
function generateImportStatements(imports: Blueprint['requiredImports']): string {
  if (!imports || imports.length === 0) return '';
  
  return imports
    .map(imp => {
      if (imp.default && imp.named?.length) {
        return `import ${imp.default}, { ${imp.named.join(', ')} } from '${imp.module}';`;
      } else if (imp.default) {
        return `import ${imp.default} from '${imp.module}';`;
      } else if (imp.named?.length) {
        const typePrefix = imp.isType ? 'type ' : '';
        return `import ${typePrefix}{ ${imp.named.join(', ')} } from '${imp.module}';`;
      }
      return `import '${imp.module}';`;
    })
    .join('\n');
}

/**
 * Find the best position to insert import statements
 */
function findImportInsertPosition(document: vscode.TextDocument): vscode.Position {
  let lastImportLine = -1;
  
  for (let i = 0; i < Math.min(document.lineCount, 50); i++) {
    const line = document.lineAt(i).text;
    if (/^import\s/.test(line) || /^import\s*\{/.test(line)) {
      lastImportLine = i;
    }
    // Stop searching after we've passed imports and into code
    if (lastImportLine >= 0 && !/^import|^\/\/|^\/\*|^\s*$/.test(line)) {
      break;
    }
  }
  
  if (lastImportLine >= 0) {
    return new vscode.Position(lastImportLine + 1, 0);
  }
  
  // No existing imports, add at top (after any initial comments)
  for (let i = 0; i < Math.min(document.lineCount, 10); i++) {
    const line = document.lineAt(i).text;
    if (!/^\/\/|^\/\*|\*\/|^\s*\*|^\s*$/.test(line)) {
      return new vscode.Position(i, 0);
    }
  }
  
  return new vscode.Position(0, 0);
}

/**
 * Create VS Code quick fix actions for blueprints
 */
export function createBlueprintQuickFixes(
  issue: Issue,
  document: vscode.TextDocument
): vscode.CodeAction[] {
  const blueprints = getBlueprintsForIssue(issue, document);
  
  return blueprints.map((blueprint, index) => {
    const action = new vscode.CodeAction(
      `${index === 0 ? '$(lightbulb) ' : ''}${blueprint.name}`,
      index === 0 
        ? vscode.CodeActionKind.QuickFix 
        : vscode.CodeActionKind.Refactor
    );
    
    action.diagnostics = [];
    action.isPreferred = index === 0;
    action.command = {
      title: blueprint.name,
      command: 'fail-kit.applyBlueprint',
      arguments: [blueprint, issue, document.uri.fsPath],
    };
    
    // Add title with description (CodeAction doesn't have tooltip property)
    action.title = `${blueprint.name} - ${blueprint.description}`;
    
    return action;
  });
}

/**
 * Show blueprint picker for an issue
 */
export async function showBlueprintPicker(
  issue: Issue,
  document: vscode.TextDocument
): Promise<Blueprint | undefined> {
  const blueprints = getBlueprintsForIssue(issue, document);
  
  if (blueprints.length === 0) {
    vscode.window.showInformationMessage('No blueprints available for this issue');
    return undefined;
  }
  
  if (blueprints.length === 1) {
    return blueprints[0];
  }
  
  const items = blueprints.map((bp, index) => ({
    label: `${index === 0 ? '$(star) ' : ''}${bp.name}`,
    description: `${bp.confidence}% confidence • ${bp.impact} impact`,
    detail: bp.description,
    blueprint: bp,
  }));
  
  const selected = await vscode.window.showQuickPick(items, {
    title: `Select Blueprint for ${issue.ruleId}`,
    placeHolder: 'Choose a fix pattern',
  });
  
  return selected?.blueprint;
}

/**
 * Register blueprint commands
 */
export function registerBlueprintCommands(context: vscode.ExtensionContext): void {
  // Apply specific blueprint
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'fail-kit.applyBlueprint',
      async (blueprint: Blueprint, issue: Issue, filePath: string) => {
        const document = await vscode.workspace.openTextDocument(filePath);
        const success = await applyBlueprint(blueprint, issue, document);
        
        if (success) {
          vscode.window.showInformationMessage(
            `Applied: ${blueprint.name}`
          );
        } else {
          vscode.window.showErrorMessage(
            `Failed to apply blueprint: ${blueprint.name}`
          );
        }
      }
    )
  );
  
  // Generate AuditLogger utility file
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'fail-kit.generateAuditLogger',
      async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showErrorMessage('No workspace folder open');
          return;
        }
        
        const defaultPath = vscode.Uri.joinPath(
          workspaceFolder.uri,
          'src',
          'lib',
          'audit-logger.ts'
        );
        
        const uri = await vscode.window.showSaveDialog({
          defaultUri: defaultPath,
          filters: { 'TypeScript': ['ts'] },
          title: 'Save AuditLogger Utility',
        });
        
        if (uri) {
          const code = generateAuditLoggerClass('');
          await vscode.workspace.fs.writeFile(uri, Buffer.from(code));
          
          // Also generate withRetry utility
          const retryCode = generateWithRetryUtility('');
          const retryUri = vscode.Uri.joinPath(
            vscode.Uri.file(uri.fsPath.replace(/[^/\\]+$/, '')),
            'retry-utils.ts'
          );
          await vscode.workspace.fs.writeFile(retryUri, Buffer.from(retryCode));
          
          vscode.window.showInformationMessage(
            `Created AuditLogger at ${uri.fsPath}`
          );
          
          // Open the file
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc);
        }
      }
    )
  );
  
  // Show blueprint picker
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'fail-kit.showBlueprintPicker',
      async (issue: Issue, filePath: string) => {
        const document = await vscode.workspace.openTextDocument(filePath);
        const blueprint = await showBlueprintPicker(issue, document);
        
        if (blueprint) {
          const success = await applyBlueprint(blueprint, issue, document);
          if (success) {
            vscode.window.showInformationMessage(`Applied: ${blueprint.name}`);
          }
        }
      }
    )
  );
}
