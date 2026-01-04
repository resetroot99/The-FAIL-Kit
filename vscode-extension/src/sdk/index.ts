/**
 * F.A.I.L. Kit Extensibility SDK
 *
 * API for creating custom rules and rulepacks.
 * Enables teams to extend F.A.I.L. Kit with domain-specific checks.
 */

import * as vscode from 'vscode';
import { Issue, IssueSeverity, IssueCategory, DiagnosticSeverity } from '../analyzer';
import { loadRulepack, Rulepack, validateRulepack } from './rulepack';

// ============================================
// Custom Rule Definition
// ============================================

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  pattern: RegExp;
  message: string | ((match: RegExpMatchArray) => string);
  fixHint: string;
  exampleFix?: string;
  docLink?: string;
  
  // Optional filter functions
  shouldMatch?: (code: string, filePath: string) => boolean;
  isValid?: (match: RegExpMatchArray, code: string) => boolean;
  
  // Optional auto-fix
  fix?: (document: vscode.TextDocument, match: RegExpMatchArray) => vscode.WorkspaceEdit | null;
}

export interface CustomRuleMatch {
  rule: CustomRule;
  match: RegExpMatchArray;
  position: number;
  line: number;
  column: number;
}

// Global registry of custom rules
const CUSTOM_RULES: CustomRule[] = [];

// ============================================
// Rule Registration API
// ============================================

/**
 * Register a custom rule
 */
export function registerRule(rule: CustomRule): void {
  // Validate rule
  if (!rule.id || !rule.pattern) {
    throw new Error('Rule must have id and pattern');
  }

  // Check for duplicate
  const existing = CUSTOM_RULES.find(r => r.id === rule.id);
  if (existing) {
    console.warn(`Rule ${rule.id} already registered, replacing`);
    const index = CUSTOM_RULES.indexOf(existing);
    CUSTOM_RULES[index] = rule;
  } else {
    CUSTOM_RULES.push(rule);
  }

  console.log(`Registered custom rule: ${rule.id}`);
}

/**
 * Unregister a custom rule
 */
export function unregisterRule(ruleId: string): boolean {
  const index = CUSTOM_RULES.findIndex(r => r.id === ruleId);
  if (index >= 0) {
    CUSTOM_RULES.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Get all registered custom rules
 */
export function getCustomRules(): CustomRule[] {
  return [...CUSTOM_RULES];
}

/**
 * Clear all custom rules
 */
export function clearCustomRules(): void {
  CUSTOM_RULES.length = 0;
}

// ============================================
// Rule Matching
// ============================================

/**
 * Run custom rules against code
 */
export function runCustomRules(code: string, filePath: string): CustomRuleMatch[] {
  const matches: CustomRuleMatch[] = [];
  const lines = code.split('\n');

  for (const rule of CUSTOM_RULES) {
    // Check if rule should run on this file
    if (rule.shouldMatch && !rule.shouldMatch(code, filePath)) {
      continue;
    }

    // Reset regex
    rule.pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(code)) !== null) {
      // Validate match if validator provided
      if (rule.isValid && !rule.isValid(match, code)) {
        continue;
      }

      // Calculate line and column
      let line = 0;
      let column = 0;
      let charCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= match.index) {
          line = i;
          column = match.index - charCount;
          break;
        }
        charCount += lines[i].length + 1; // +1 for newline
      }

      matches.push({
        rule,
        match,
        position: match.index,
        line,
        column,
      });
    }
  }

  return matches;
}

/**
 * Convert custom rule matches to Issues
 */
export function matchesToIssues(matches: CustomRuleMatch[], filePath: string): Issue[] {
  return matches.map(({ rule, match, line, column }) => {
    const message = typeof rule.message === 'function' 
      ? rule.message(match)
      : rule.message;

    return {
      ruleId: rule.id,
      line,
      column,
      endLine: line,
      endColumn: column + match[0].length,
      message,
      severity: severityToDiagnostic(rule.severity),
      code: match[0].substring(0, 80),
      suggestion: rule.fixHint,
      issueSeverity: rule.severity,
      businessImpact: `Custom rule ${rule.id}: ${rule.description}`,
      category: rule.category,
      fixHint: rule.fixHint,
      exampleFix: rule.exampleFix,
      docLink: rule.docLink || `https://github.com/resetroot99/The-FAIL-Kit`,
      estimatedFixTime: '10 minutes',
      riskScore: severityToRiskScore(rule.severity),
      rootCause: {
        type: 'incorrect_pattern',
        description: `Detected by custom rule: ${rule.name}`,
        affectedComponent: 'Custom rule detection',
        requiredAction: rule.fixHint,
        relatedFiles: [filePath],
      },
      reproductionSteps: [
        `1. Open file: ${filePath}`,
        `2. Navigate to line ${line + 1}`,
        `3. Review the matched pattern`,
        `4. Apply fix: ${rule.fixHint}`,
      ],
    };
  });
}

/**
 * Convert severity to diagnostic severity
 */
function severityToDiagnostic(severity: IssueSeverity): DiagnosticSeverity {
  switch (severity) {
    case 'critical': return 'error';
    case 'high': return 'error';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'warning';
  }
}

/**
 * Convert severity to risk score
 */
function severityToRiskScore(severity: IssueSeverity): number {
  switch (severity) {
    case 'critical': return 95;
    case 'high': return 75;
    case 'medium': return 50;
    case 'low': return 25;
    default: return 50;
  }
}

// ============================================
// Built-in Rule Templates
// ============================================

/**
 * Create a regex pattern rule
 */
export function createPatternRule(config: {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  category?: IssueCategory;
  severity?: IssueSeverity;
  message?: string;
  fixHint?: string;
}): CustomRule {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    pattern: config.pattern,
    category: config.category || 'audit_gap',
    severity: config.severity || 'medium',
    message: config.message || `${config.name}: Review this code pattern`,
    fixHint: config.fixHint || 'Review and fix this pattern',
  };
}

/**
 * Create a function call rule
 */
export function createFunctionCallRule(config: {
  id: string;
  name: string;
  description: string;
  functionName: string;
  severity?: IssueSeverity;
  requiresReceipt?: boolean;
  requiresErrorHandling?: boolean;
}): CustomRule {
  const pattern = new RegExp(`await\\s+${config.functionName}\\s*\\(`, 'g');
  
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    pattern,
    category: config.requiresReceipt ? 'receipt_missing' : 'audit_gap',
    severity: config.severity || 'medium',
    message: `${config.functionName}() call detected. ${config.description}`,
    fixHint: config.requiresReceipt 
      ? `Add receipt generation after ${config.functionName}()` 
      : `Review ${config.functionName}() usage`,
  };
}

// ============================================
// SDK Commands
// ============================================

/**
 * Register SDK commands
 */
export function registerSDKCommands(context: vscode.ExtensionContext): void {
  // Install Rulepack
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.installRulepack', async () => {
      const source = await vscode.window.showQuickPick(
        [
          { label: 'From URL', description: 'Install from a URL' },
          { label: 'From File', description: 'Install from local JSON file' },
          { label: 'From npm', description: 'Install from npm package' },
        ],
        { title: 'Install Rulepack' }
      );

      if (!source) return;

      let rulepack: Rulepack | null = null;

      if (source.label === 'From URL') {
        const url = await vscode.window.showInputBox({
          prompt: 'Enter rulepack URL',
          placeHolder: 'https://example.com/rulepack.json',
        });
        if (url) {
          rulepack = await loadRulepack(url);
        }
      } else if (source.label === 'From File') {
        const uris = await vscode.window.showOpenDialog({
          filters: { 'JSON': ['json'] },
          canSelectMany: false,
        });
        if (uris && uris[0]) {
          rulepack = await loadRulepack(uris[0].fsPath);
        }
      } else if (source.label === 'From npm') {
        const packageName = await vscode.window.showInputBox({
          prompt: 'Enter npm package name',
          placeHolder: '@myorg/fail-kit-rules',
        });
        if (packageName) {
          vscode.window.showInformationMessage(`npm rulepack installation: Run 'npm install ${packageName}' and import in your config`);
          return;
        }
      }

      if (rulepack) {
        const validation = validateRulepack(rulepack);
        if (!validation.valid) {
          vscode.window.showErrorMessage(`Invalid rulepack: ${validation.errors.join(', ')}`);
          return;
        }

        // Register rules from rulepack
        for (const rule of rulepack.rules) {
          registerRule({
            ...rule,
            pattern: new RegExp(rule.pattern, 'g'),
          });
        }

        vscode.window.showInformationMessage(
          `Installed rulepack: ${rulepack.name} (${rulepack.rules.length} rules)`
        );
      }
    })
  );

  // List Custom Rules
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.listCustomRules', () => {
      const rules = getCustomRules();
      
      if (rules.length === 0) {
        vscode.window.showInformationMessage('No custom rules installed');
        return;
      }

      const channel = vscode.window.createOutputChannel('F.A.I.L. Kit Custom Rules');
      channel.clear();
      channel.appendLine(`# Custom Rules (${rules.length})\n`);
      
      for (const rule of rules) {
        channel.appendLine(`## ${rule.id}: ${rule.name}`);
        channel.appendLine(`Severity: ${rule.severity}`);
        channel.appendLine(`Category: ${rule.category}`);
        channel.appendLine(`Description: ${rule.description}`);
        channel.appendLine(`Pattern: ${rule.pattern.source}`);
        channel.appendLine('');
      }
      
      channel.show();
    })
  );

  // Create Rule Template
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.createRuleTemplate', async () => {
      const template = `{
  "$schema": "https://github.com/resetroot99/The-FAIL-Kit/blob/main/schemas/rulepack.json",
  "name": "My Custom Rulepack",
  "version": "1.0.0",
  "description": "Custom rules for my project",
  "author": "Your Name",
  "rules": [
    {
      "id": "CUSTOM001",
      "name": "example-rule",
      "description": "Example custom rule",
      "pattern": "console\\\\.log\\\\(",
      "category": "audit_gap",
      "severity": "low",
      "message": "console.log detected - remove before production",
      "fixHint": "Remove console.log statement"
    }
  ]
}`;

      const doc = await vscode.workspace.openTextDocument({
        content: template,
        language: 'json',
      });
      await vscode.window.showTextDocument(doc);
      
      vscode.window.showInformationMessage('Created rulepack template. Save as .json and install with "F.A.I.L. Kit: Install Rulepack"');
    })
  );

  // Uninstall Custom Rule
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.uninstallRule', async () => {
      const rules = getCustomRules();
      
      if (rules.length === 0) {
        vscode.window.showInformationMessage('No custom rules to uninstall');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        rules.map(r => ({
          label: r.id,
          description: r.name,
        })),
        { title: 'Select Rule to Uninstall' }
      );

      if (selected) {
        const removed = unregisterRule(selected.label);
        if (removed) {
          vscode.window.showInformationMessage(`Uninstalled rule: ${selected.label}`);
        }
      }
    })
  );
}

// Re-export rulepack types
export * from './rulepack';
