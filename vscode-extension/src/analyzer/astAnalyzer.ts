/**
 * F.A.I.L. Kit AST Analyzer
 *
 * Uses TypeScript Compiler API for accurate detection of:
 * - Tool calls without receipt generation
 * - LLM calls without error handling
 * - Agent invocations
 */

import * as ts from 'typescript';
import {
  TOOL_PATTERNS,
  LLM_PATTERNS,
  AGENT_PATTERNS,
  hasReceiptNearby,
  hasErrorHandlingNearby,
  hasDisableComment,
  isTestFile,
  ToolPattern,
  LLMPattern,
} from './patterns';

export type IssueSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface Issue {
  ruleId: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: IssueSeverity;
  code: string;
  suggestion?: string;
}

export interface AnalysisResult {
  issues: Issue[];
  toolCalls: ToolCallInfo[];
  llmCalls: LLMCallInfo[];
  agentCalls: AgentCallInfo[];
}

export interface ToolCallInfo {
  tool: string;
  line: number;
  column: number;
  code: string;
  destructive: boolean;
  hasReceipt: boolean;
}

export interface LLMCallInfo {
  provider: string;
  line: number;
  column: number;
  code: string;
  hasErrorHandling: boolean;
}

export interface AgentCallInfo {
  framework: string;
  line: number;
  column: number;
  code: string;
  methodType: string;
}

/**
 * Analyze a TypeScript/JavaScript document for agent code issues
 */
export function analyzeDocument(
  code: string,
  filePath: string = 'temp.ts'
): AnalysisResult {
  const issues: Issue[] = [];
  const toolCalls: ToolCallInfo[] = [];
  const llmCalls: LLMCallInfo[] = [];
  const agentCalls: AgentCallInfo[] = [];

  // Skip test files
  if (isTestFile(filePath)) {
    return { issues, toolCalls, llmCalls, agentCalls };
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );

  const lines = code.split('\n');

  function getLineAndColumn(pos: number): { line: number; column: number } {
    const lineAndChar = sourceFile.getLineAndCharacterOfPosition(pos);
    return { line: lineAndChar.line, column: lineAndChar.character };
  }

  function visit(node: ts.Node) {
    // Check for call expressions
    if (ts.isCallExpression(node) || ts.isAwaitExpression(node)) {
      const callNode = ts.isAwaitExpression(node)
        ? (node.expression as ts.CallExpression)
        : node;

      if (!ts.isCallExpression(callNode)) {
        ts.forEachChild(node, visit);
        return;
      }

      const nodeText = node.getText(sourceFile);
      const { line, column } = getLineAndColumn(node.getStart(sourceFile));
      const endPos = getLineAndColumn(node.getEnd());

      // Check disable comments
      const currentLine = lines[line] || '';
      const previousLine = line > 0 ? lines[line - 1] : undefined;
      if (hasDisableComment(currentLine, previousLine)) {
        ts.forEachChild(node, visit);
        return;
      }

      // Check tool patterns
      for (const pattern of TOOL_PATTERNS) {
        // Reset regex lastIndex
        pattern.pattern.lastIndex = 0;
        if (pattern.pattern.test(nodeText)) {
          const hasReceipt = hasReceiptNearby(code, node.getEnd());

          toolCalls.push({
            tool: pattern.tool,
            line,
            column,
            code: nodeText.substring(0, 100),
            destructive: pattern.destructive,
            hasReceipt,
          });

          if (pattern.requiresReceipt && !hasReceipt) {
            issues.push({
              ruleId: 'FK001',
              line,
              column,
              endLine: endPos.line,
              endColumn: endPos.column,
              message: `${pattern.tool} operation without receipt generation. Destructive operations should generate audit receipts.`,
              severity: 'warning',
              code: nodeText.substring(0, 80),
              suggestion: 'Add receipt generation using createReceipt() or wrap with ReceiptGeneratingTool',
            });
          }
          break;
        }
      }

      // Check LLM patterns
      for (const pattern of LLM_PATTERNS) {
        pattern.pattern.lastIndex = 0;
        if (pattern.pattern.test(nodeText)) {
          const hasErrorHandling = hasErrorHandlingNearby(code, node.getStart(sourceFile));

          llmCalls.push({
            provider: pattern.provider,
            line,
            column,
            code: nodeText.substring(0, 100),
            hasErrorHandling,
          });

          if (pattern.requiresErrorHandling && !hasErrorHandling) {
            issues.push({
              ruleId: 'FK002',
              line,
              column,
              endLine: endPos.line,
              endColumn: endPos.column,
              message: `${pattern.provider} LLM call without error handling. LLM calls can fail and should be wrapped in try/catch.`,
              severity: 'warning',
              code: nodeText.substring(0, 80),
              suggestion: 'Wrap LLM call in try/catch block or add .catch() handler',
            });
          }
          break;
        }
      }

      // Check agent patterns
      for (const pattern of AGENT_PATTERNS) {
        pattern.pattern.lastIndex = 0;
        if (pattern.pattern.test(nodeText)) {
          const hasReceipt = hasReceiptNearby(code, node.getEnd());
          const hasErrorHandling = hasErrorHandlingNearby(code, node.getStart(sourceFile));

          agentCalls.push({
            framework: pattern.framework,
            line,
            column,
            code: nodeText.substring(0, 100),
            methodType: pattern.methodType,
          });

          if (!hasReceipt) {
            issues.push({
              ruleId: 'FK001',
              line,
              column,
              endLine: endPos.line,
              endColumn: endPos.column,
              message: `${pattern.framework} agent ${pattern.methodType}() without receipt generation. Agent actions should be auditable.`,
              severity: 'warning',
              code: nodeText.substring(0, 80),
              suggestion: 'Use extractReceiptsFromAgentExecutor() or wrap tools with ReceiptGeneratingTool',
            });
          }

          if (!hasErrorHandling) {
            issues.push({
              ruleId: 'FK002',
              line,
              column,
              endLine: endPos.line,
              endColumn: endPos.column,
              message: `${pattern.framework} agent call without error handling. Agent executions can fail unpredictably.`,
              severity: 'warning',
              code: nodeText.substring(0, 80),
              suggestion: 'Wrap agent call in try/catch block',
            });
          }
          break;
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Deduplicate issues by line and ruleId
  const uniqueIssues = deduplicateIssues(issues);

  return {
    issues: uniqueIssues,
    toolCalls,
    llmCalls,
    agentCalls,
  };
}

/**
 * Remove duplicate issues on the same line with the same rule
 */
function deduplicateIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter(issue => {
    const key = `${issue.ruleId}:${issue.line}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Quick pattern-based analysis (faster, less accurate)
 * Used for initial pass before full AST analysis
 */
export function quickAnalyze(code: string): { hasAgentCode: boolean; patternMatches: number } {
  let patternMatches = 0;

  for (const pattern of [...TOOL_PATTERNS, ...LLM_PATTERNS, ...AGENT_PATTERNS]) {
    pattern.pattern.lastIndex = 0;
    const matches = code.match(pattern.pattern);
    if (matches) {
      patternMatches += matches.length;
    }
  }

  return {
    hasAgentCode: patternMatches > 0,
    patternMatches,
  };
}
