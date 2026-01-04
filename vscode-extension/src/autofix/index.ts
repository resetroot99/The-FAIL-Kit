/**
 * F.A.I.L. Kit Auto-Fix System
 *
 * Automatically generates fixes for common issues.
 * Includes preview, confirmation, and rollback support.
 */

import * as vscode from 'vscode';
import { Issue } from '../analyzer';
import { fixHistory, generateUnifiedDiff, DiffHunk, parseDiffHunks } from './history';

export * from './history';

export interface AutoFix {
  ruleId: string;
  canFix(issue: Issue): boolean;
  generateFix(issue: Issue, document: vscode.TextDocument): vscode.WorkspaceEdit | null;
  confidence: number; // 0-100
}

export interface AutoFixResult {
  issue: Issue;
  fix: vscode.WorkspaceEdit;
  confidence: number;
  description: string;
  preview: string;
}

// ============================================
// NEW: Fix Preview System
// ============================================

export interface FixPreview {
  issue: Issue;
  before: string;
  after: string;
  diff: string;
  diffHunks: DiffHunk[];
  canRollback: boolean;
  confidence: number;
  estimatedImpact: 'safe' | 'moderate' | 'risky';
}

/**
 * Generate a preview of a fix without applying it
 */
export async function previewFix(issue: Issue, document: vscode.TextDocument): Promise<FixPreview | null> {
  const fixer = findAutoFix(issue);
  if (!fixer) {
    return null;
  }

  const fix = fixer.generateFix(issue, document);
  if (!fix) {
    return null;
  }

  // Get the before content
  const beforeContent = document.getText();
  
  // Apply the fix to a copy to get after content
  const afterContent = applyEditToString(beforeContent, fix, document.uri);
  
  // Generate diff
  const diff = generateUnifiedDiff(beforeContent, afterContent, document.uri.fsPath);
  const diffHunks = parseDiffHunks(diff);
  
  // Estimate impact based on change size and type
  const changeSize = Math.abs(afterContent.length - beforeContent.length);
  const linesChanged = diffHunks.reduce((sum, h) => sum + h.lines.length, 0);
  
  let estimatedImpact: 'safe' | 'moderate' | 'risky' = 'safe';
  if (linesChanged > 20 || changeSize > 500) {
    estimatedImpact = 'risky';
  } else if (linesChanged > 5 || changeSize > 100) {
    estimatedImpact = 'moderate';
  }

  return {
    issue,
    before: beforeContent,
    after: afterContent,
    diff,
    diffHunks,
    canRollback: true,
    confidence: fixer.confidence,
    estimatedImpact,
  };
}

/**
 * Apply a workspace edit to a string and return the result
 */
function applyEditToString(content: string, edit: vscode.WorkspaceEdit, uri: vscode.Uri): string {
  const edits = edit.get(uri);
  if (!edits || edits.length === 0) {
    return content;
  }

  // Sort edits by position (reverse order for safe application)
  const sortedEdits = [...edits].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return b.range.start.line - a.range.start.line;
    }
    return b.range.start.character - a.range.start.character;
  });

  const lines = content.split('\n');
  
  for (const textEdit of sortedEdits) {
    const { range, newText } = textEdit;
    
    // Convert range to character positions
    let startOffset = 0;
    for (let i = 0; i < range.start.line; i++) {
      startOffset += lines[i].length + 1; // +1 for newline
    }
    startOffset += range.start.character;
    
    let endOffset = 0;
    for (let i = 0; i < range.end.line; i++) {
      endOffset += lines[i].length + 1;
    }
    endOffset += range.end.character;
    
    // Apply the edit
    content = content.substring(0, startOffset) + newText + content.substring(endOffset);
  }
  
  return content;
}

/**
 * Apply a fix with preview confirmation
 */
export async function applyFixWithPreview(
  issue: Issue,
  document: vscode.TextDocument,
  showPreview: boolean = true
): Promise<{ applied: boolean; historyId?: string; error?: string }> {
  const preview = await previewFix(issue, document);
  if (!preview) {
    return { applied: false, error: 'No fix available for this issue' };
  }

  if (showPreview) {
    // Show diff preview in quick pick
    const choice = await vscode.window.showQuickPick(
      [
        { label: '$(check) Apply Fix', description: `Confidence: ${preview.confidence}%`, value: 'apply' },
        { label: '$(eye) View Diff', description: 'See what will change', value: 'diff' },
        { label: '$(x) Cancel', description: 'Do not apply', value: 'cancel' },
      ],
      {
        title: `Fix ${issue.ruleId}: ${issue.message.substring(0, 50)}...`,
        placeHolder: `Impact: ${preview.estimatedImpact} | ${preview.diffHunks.length} hunk(s)`,
      }
    );

    if (!choice || choice.value === 'cancel') {
      return { applied: false };
    }

    if (choice.value === 'diff') {
      // Show diff in output channel
      const channel = vscode.window.createOutputChannel('F.A.I.L. Kit Fix Preview');
      channel.clear();
      channel.appendLine(`=== Fix Preview for ${issue.ruleId} ===`);
      channel.appendLine(`File: ${document.uri.fsPath}`);
      channel.appendLine(`Line: ${issue.line + 1}`);
      channel.appendLine(`Confidence: ${preview.confidence}%`);
      channel.appendLine(`Impact: ${preview.estimatedImpact}`);
      channel.appendLine('');
      channel.appendLine(preview.diff);
      channel.show();

      // Ask again after showing diff
      const confirmChoice = await vscode.window.showQuickPick(
        [
          { label: '$(check) Apply Fix', value: 'apply' },
          { label: '$(x) Cancel', value: 'cancel' },
        ],
        { title: 'Apply this fix?' }
      );

      if (!confirmChoice || confirmChoice.value === 'cancel') {
        return { applied: false };
      }
    }
  }

  // Record in history before applying
  const historyId = fixHistory.record({
    filePath: document.uri.fsPath,
    ruleId: issue.ruleId,
    description: getFixDescription(issue),
    beforeContent: preview.before,
    afterContent: preview.after,
    range: {
      startLine: issue.line,
      startColumn: issue.column,
      endLine: issue.endLine,
      endColumn: issue.endColumn,
    },
  });

  // Apply the fix
  const fixer = findAutoFix(issue);
  const fix = fixer?.generateFix(issue, document);
  
  if (!fix) {
    return { applied: false, error: 'Failed to generate fix' };
  }

  const success = await vscode.workspace.applyEdit(fix);
  
  if (!success) {
    // Remove from history if failed
    return { applied: false, error: 'Failed to apply fix' };
  }

  return { applied: true, historyId };
}

/**
 * Rollback the last applied fix
 */
export async function rollbackLastFix(): Promise<{ success: boolean; message: string }> {
  if (!fixHistory.canRollback()) {
    return { success: false, message: 'No fixes to rollback' };
  }

  const result = await fixHistory.rollbackLast();
  
  if (result.success && result.entry) {
    return { 
      success: true, 
      message: `Rolled back ${result.entry.ruleId} fix in ${result.entry.filePath}`,
    };
  }

  return { success: false, message: result.error || 'Rollback failed' };
}

/**
 * Receipt generation auto-fixer
 */
export class ReceiptFixer implements AutoFix {
  ruleId = 'FK001';
  confidence = 90;

  canFix(issue: Issue): boolean {
    return issue.ruleId === 'FK001' && issue.category === 'receipt_missing';
  }

  generateFix(issue: Issue, document: vscode.TextDocument): vscode.WorkspaceEdit | null {
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(issue.line);
    const indent = line.text.match(/^(\s*)/)?.[1] || '';
    
    // Find the end of the statement (after the semicolon or closing brace)
    let insertLine = issue.endLine;
    const endLineText = document.lineAt(insertLine).text;
    
    // Generate receipt code
    const toolName = this.extractToolName(issue.code);
    const receiptCode = `
${indent}// Generate receipt for audit trail
${indent}const receipt = {
${indent}  action_id: \`act_\${Date.now().toString(36)}\`,
${indent}  tool_name: '${toolName}',
${indent}  timestamp: new Date().toISOString(),
${indent}  status: 'success',
${indent}  input_hash: 'sha256:' + require('crypto').createHash('sha256').update(JSON.stringify(input)).digest('hex'),
${indent}  output_hash: 'sha256:' + require('crypto').createHash('sha256').update(JSON.stringify(result)).digest('hex'),
${indent}};
`;

    // Insert after the current line
    const insertPosition = new vscode.Position(insertLine + 1, 0);
    edit.insert(document.uri, insertPosition, receiptCode);

    return edit;
  }

  private extractToolName(code: string): string {
    // Extract tool name from code pattern
    if (code.includes('stripe')) return 'payment';
    if (code.includes('prisma')) return 'database';
    if (code.includes('axios') || code.includes('fetch')) return 'http_request';
    if (code.includes('fs.')) return 'file_system';
    if (code.includes('sendEmail') || code.includes('mail')) return 'email';
    if (code.includes('agent')) return 'agent_action';
    return 'tool_call';
  }
}

/**
 * Error handling auto-fixer (try-catch wrapper)
 */
export class ErrorHandlingFixer implements AutoFix {
  ruleId = 'FK002';
  confidence = 85;

  canFix(issue: Issue): boolean {
    return issue.ruleId === 'FK002' && issue.category === 'error_handling';
  }

  generateFix(issue: Issue, document: vscode.TextDocument): vscode.WorkspaceEdit | null {
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(issue.line);
    const indent = line.text.match(/^(\s*)/)?.[1] || '';
    const innerIndent = indent + '  ';

    // Get the full statement
    const statementText = line.text.trim();

    // Check if it's a single-line or multi-line statement
    const startLine = issue.line;
    const endLine = issue.endLine;

    // Get all lines of the statement
    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(document.lineAt(i).text);
    }

    // Create try-catch wrapper
    const tryCatchStart = `${indent}try {\n`;
    const tryCatchEnd = `${indent}} catch (error) {
${innerIndent}console.error('Operation failed:', error);
${innerIndent}// Escalate error to policy
${innerIndent}if (typeof policy !== 'undefined') {
${innerIndent}  policy.escalate = true;
${innerIndent}  policy.reasons.push(error instanceof Error ? error.message : String(error));
${innerIndent}}
${innerIndent}throw error;
${indent}}
`;

    // Replace the original lines with wrapped version
    const range = new vscode.Range(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine, document.lineAt(endLine).text.length)
    );

    const indentedLines = lines.map(l => innerIndent + l.trim()).join('\n');
    const wrappedCode = tryCatchStart + indentedLines + '\n' + tryCatchEnd;

    edit.replace(document.uri, range, wrappedCode);

    return edit;
  }
}

/**
 * Secret removal auto-fixer (FK003, FK007)
 */
export class SecretFixer implements AutoFix {
  ruleId = 'FK003';
  confidence = 70;

  canFix(issue: Issue): boolean {
    return issue.ruleId === 'FK003' || issue.ruleId === 'FK007';
  }

  generateFix(issue: Issue, document: vscode.TextDocument): vscode.WorkspaceEdit | null {
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(issue.line);
    const lineText = line.text;
    const indent = lineText.match(/^(\s*)/)?.[1] || '';

    // Try to extract variable name
    const varMatch = lineText.match(/(?:const|let|var)\s+(\w+)\s*=/);
    const envVarName = varMatch 
      ? varMatch[1].toUpperCase().replace(/([a-z])([A-Z])/g, '$1_$2')
      : 'SECRET_KEY';

    // Replace the hardcoded value with environment variable reference
    const newLine = lineText.replace(
      /['"`][^'"`]{10,}['"`]/,
      `process.env.${envVarName}`
    );

    const range = new vscode.Range(
      new vscode.Position(issue.line, 0),
      new vscode.Position(issue.line, lineText.length)
    );

    edit.replace(document.uri, range, newLine);

    // Add a comment about adding to .env
    const commentLine = `${indent}// TODO: Add ${envVarName} to your .env file\n`;
    edit.insert(document.uri, new vscode.Position(issue.line, 0), commentLine);

    return edit;
  }
}

/**
 * Side-effect confirmation auto-fixer (FK004)
 */
export class SideEffectConfirmationFixer implements AutoFix {
  ruleId = 'FK004';
  confidence = 75;

  canFix(issue: Issue): boolean {
    return issue.ruleId === 'FK004';
  }

  generateFix(issue: Issue, document: vscode.TextDocument): vscode.WorkspaceEdit | null {
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(issue.line);
    const lineText = line.text;
    const indent = lineText.match(/^(\s*)/)?.[1] || '';
    const innerIndent = indent + '  ';

    // Extract the operation type from the code
    const opMatch = lineText.match(/\.(delete|remove|destroy|publish|send|broadcast)\s*\(/);
    const operation = opMatch ? opMatch[1] : 'execute';

    // Wrap with confirmation check
    const confirmCode = `${indent}// Confirm before ${operation} operation
${indent}const confirmed = await confirmAction?.('${operation}') ?? true;
${indent}if (!confirmed) {
${innerIndent}throw new Error('Operation cancelled by user');
${indent}}
`;

    edit.insert(document.uri, new vscode.Position(issue.line, 0), confirmCode);

    return edit;
  }
}

/**
 * LLM Resilience auto-fixer (FK005)
 */
export class LLMResilienceFixer implements AutoFix {
  ruleId = 'FK005';
  confidence = 80;

  canFix(issue: Issue): boolean {
    return issue.ruleId === 'FK005';
  }

  generateFix(issue: Issue, document: vscode.TextDocument): vscode.WorkspaceEdit | null {
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(issue.line);
    const lineText = line.text;
    const indent = lineText.match(/^(\s*)/)?.[1] || '';

    // Add timeout configuration comment
    const resilienceComment = `${indent}// TODO: Add timeout and retry for resilience
${indent}// const options = { timeout: 30000, maxRetries: 3 };
`;

    edit.insert(document.uri, new vscode.Position(issue.line, 0), resilienceComment);

    return edit;
  }
}

/**
 * Provenance metadata auto-fixer (FK006)
 */
export class ProvenanceFixer implements AutoFix {
  ruleId = 'FK006';
  confidence = 85;

  canFix(issue: Issue): boolean {
    return issue.ruleId === 'FK006';
  }

  generateFix(issue: Issue, document: vscode.TextDocument): vscode.WorkspaceEdit | null {
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(issue.line);
    const indent = line.text.match(/^(\s*)/)?.[1] || '';

    const provenanceCode = `${indent}// Add provenance metadata for audit trail
${indent}const actionMetadata = {
${indent}  action_id: \`act_\${Date.now().toString(36)}_\${Math.random().toString(36).substr(2, 9)}\`,
${indent}  timestamp: new Date().toISOString(),
${indent}  // trace_id: context?.traceId,
${indent}};
`;

    edit.insert(document.uri, new vscode.Position(issue.line, 0), provenanceCode);

    return edit;
  }
}

/**
 * All available auto-fixers
 */
export const AUTO_FIXERS: AutoFix[] = [
  new ReceiptFixer(),
  new ErrorHandlingFixer(),
  new SecretFixer(),
  new SideEffectConfirmationFixer(),
  new LLMResilienceFixer(),
  new ProvenanceFixer(),
];

/**
 * Find applicable auto-fix for an issue
 */
export function findAutoFix(issue: Issue): AutoFix | null {
  for (const fixer of AUTO_FIXERS) {
    if (fixer.canFix(issue)) {
      return fixer;
    }
  }
  return null;
}

/**
 * Apply auto-fix for an issue
 */
export async function applyAutoFix(
  issue: Issue,
  document: vscode.TextDocument
): Promise<AutoFixResult | null> {
  const fixer = findAutoFix(issue);
  if (!fixer) {
    return null;
  }

  const fix = fixer.generateFix(issue, document);
  if (!fix) {
    return null;
  }

  return {
    issue,
    fix,
    confidence: fixer.confidence,
    description: getFixDescription(issue),
    preview: getFixPreview(issue),
  };
}

/**
 * Apply all auto-fixes for a document
 */
export async function applyAllAutoFixes(
  issues: Issue[],
  document: vscode.TextDocument,
  minConfidence: number = 90
): Promise<AutoFixResult[]> {
  const results: AutoFixResult[] = [];

  // Sort issues by line number (descending) to apply from bottom to top
  // This prevents line number shifts from affecting subsequent fixes
  const sortedIssues = [...issues].sort((a, b) => b.line - a.line);

  for (const issue of sortedIssues) {
    const result = await applyAutoFix(issue, document);
    if (result && result.confidence >= minConfidence) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Get human-readable description of fix
 */
function getFixDescription(issue: Issue): string {
  switch (issue.ruleId) {
    case 'FK001':
      return `Add receipt generation for ${issue.category === 'receipt_missing' ? 'audit trail' : 'action logging'}`;
    case 'FK002':
      return 'Wrap in try-catch block with error escalation';
    case 'FK003':
      return 'Add audit logging before operation';
    default:
      return 'Apply recommended fix';
  }
}

/**
 * Get preview of what the fix will do
 */
function getFixPreview(issue: Issue): string {
  switch (issue.ruleId) {
    case 'FK001':
      return `+ const receipt = { action_id: ..., tool_name: '...', ... }`;
    case 'FK002':
      return `+ try { ... } catch (error) { policy.escalate = true; throw error; }`;
    case 'FK003':
      return `+ console.log('[AUDIT]', { action: '...', timestamp: ... });`;
    default:
      return '+ (fix code)';
  }
}

/**
 * Generate patch file for auto-fixes
 */
export function generatePatchFile(results: AutoFixResult[], filePath: string): string {
  let patch = `# F.A.I.L. Kit Auto-Fix Patch
# Generated: ${new Date().toISOString()}
# File: ${filePath}
# Issues fixed: ${results.length}

`;

  for (const result of results) {
    patch += `--- ${filePath}
+++ ${filePath}
@@ Fix for ${result.issue.ruleId} at line ${result.issue.line + 1} @@
# ${result.description}
# Confidence: ${result.confidence}%

${result.preview}

`;
  }

  return patch;
}
