/**
 * F.A.I.L. Kit Context Extractor
 *
 * Extracts context from AST for blueprint generation.
 */

import * as ts from 'typescript';
import * as vscode from 'vscode';
import { Issue } from '../../analyzer';
import { BlueprintContext } from './types';

/**
 * Tool category detection patterns
 */
const TOOL_CATEGORY_PATTERNS: Array<{
  pattern: RegExp;
  category: BlueprintContext['toolCategory'];
  operationType: BlueprintContext['operationType'];
  isDestructive: boolean;
}> = [
  // Database
  { pattern: /prisma\.(create|insert|upsert)/i, category: 'database', operationType: 'write', isDestructive: true },
  { pattern: /prisma\.(update|updateMany)/i, category: 'database', operationType: 'write', isDestructive: true },
  { pattern: /prisma\.(delete|deleteMany)/i, category: 'database', operationType: 'delete', isDestructive: true },
  { pattern: /prisma\.(find|findMany|findUnique|findFirst)/i, category: 'database', operationType: 'read', isDestructive: false },
  { pattern: /db\.(query|execute)/i, category: 'database', operationType: 'execute', isDestructive: true },
  { pattern: /knex.*\.(insert|update)/i, category: 'database', operationType: 'write', isDestructive: true },
  { pattern: /knex.*\.(del|delete)/i, category: 'database', operationType: 'delete', isDestructive: true },
  
  // Payment
  { pattern: /stripe\.(charges|paymentIntents)\.create/i, category: 'payment', operationType: 'execute', isDestructive: true },
  { pattern: /stripe\.refunds\.create/i, category: 'payment', operationType: 'execute', isDestructive: true },
  { pattern: /\.(charge|pay|refund|transfer)\s*\(/i, category: 'payment', operationType: 'execute', isDestructive: true },
  
  // Email/Messaging
  { pattern: /sendEmail|sendMail|mail\.send/i, category: 'email', operationType: 'send', isDestructive: true },
  { pattern: /sendMessage|sendSMS|twilio/i, category: 'email', operationType: 'send', isDestructive: true },
  { pattern: /sendNotification|pushNotification/i, category: 'email', operationType: 'send', isDestructive: true },
  
  // File System
  { pattern: /fs\.(writeFile|appendFile)/i, category: 'file', operationType: 'write', isDestructive: true },
  { pattern: /fs\.(unlink|rm|rmdir)/i, category: 'file', operationType: 'delete', isDestructive: true },
  { pattern: /fs\.(readFile|readdir|stat)/i, category: 'file', operationType: 'read', isDestructive: false },
  { pattern: /s3\.(putObject|upload)/i, category: 'file', operationType: 'write', isDestructive: true },
  { pattern: /s3\.deleteObject/i, category: 'file', operationType: 'delete', isDestructive: true },
  
  // HTTP
  { pattern: /axios\.(post|put|patch)/i, category: 'http', operationType: 'write', isDestructive: true },
  { pattern: /axios\.delete/i, category: 'http', operationType: 'delete', isDestructive: true },
  { pattern: /axios\.get/i, category: 'http', operationType: 'read', isDestructive: false },
  { pattern: /fetch\s*\(/i, category: 'http', operationType: 'execute', isDestructive: false },
  
  // LLM
  { pattern: /openai\.(chat|completions)\.create/i, category: 'llm', operationType: 'execute', isDestructive: false },
  { pattern: /anthropic\.(messages|completions)\.create/i, category: 'llm', operationType: 'execute', isDestructive: false },
  { pattern: /generateText|streamText/i, category: 'llm', operationType: 'execute', isDestructive: false },
  { pattern: /llm\.(call|invoke|generate)/i, category: 'llm', operationType: 'execute', isDestructive: false },
  
  // Agent
  { pattern: /agent\.(call|invoke|run)/i, category: 'agent', operationType: 'execute', isDestructive: true },
  { pattern: /agentExecutor\.(call|invoke|run)/i, category: 'agent', operationType: 'execute', isDestructive: true },
  { pattern: /crew\.kickoff/i, category: 'agent', operationType: 'execute', isDestructive: true },
  { pattern: /executor\.(run|execute)/i, category: 'agent', operationType: 'execute', isDestructive: true },
];

/**
 * Provider detection for LLM calls
 */
const PROVIDER_PATTERNS: Array<{ pattern: RegExp; provider: string }> = [
  { pattern: /openai/i, provider: 'openai' },
  { pattern: /anthropic/i, provider: 'anthropic' },
  { pattern: /cohere/i, provider: 'cohere' },
  { pattern: /google|gemini|palm/i, provider: 'google' },
  { pattern: /azure/i, provider: 'azure' },
  { pattern: /bedrock/i, provider: 'aws-bedrock' },
  { pattern: /langchain/i, provider: 'langchain' },
  { pattern: /vercel.*ai/i, provider: 'vercel-ai' },
];

/**
 * Extract blueprint context from an issue and document
 */
export function extractBlueprintContext(
  issue: Issue,
  document: vscode.TextDocument
): BlueprintContext {
  const line = document.lineAt(issue.line);
  const lineText = line.text;
  const code = issue.code || lineText.trim();
  
  // Extract indentation
  const indentMatch = lineText.match(/^(\s*)/);
  const indent = indentMatch?.[1] || '';
  const innerIndent = indent + '  ';
  
  // Detect tool category and operation type
  let toolCategory: BlueprintContext['toolCategory'] = 'generic';
  let operationType: BlueprintContext['operationType'] = 'unknown';
  let isDestructive = false;
  
  for (const pattern of TOOL_CATEGORY_PATTERNS) {
    if (pattern.pattern.test(code)) {
      toolCategory = pattern.category;
      operationType = pattern.operationType;
      isDestructive = pattern.isDestructive;
      break;
    }
  }
  
  // Extract tool name from pattern
  const toolName = extractToolName(code, toolCategory);
  
  // Detect provider for LLM calls
  let provider: string | undefined;
  if (toolCategory === 'llm') {
    for (const p of PROVIDER_PATTERNS) {
      if (p.pattern.test(code)) {
        provider = p.provider;
        break;
      }
    }
  }
  
  // Extract variable names
  const { variableName, resultVariableName, functionName, className } = extractVariableNames(
    document,
    issue.line
  );
  
  // Check if async
  const isAsync = /await\s/.test(code) || /async\s/.test(getContainingFunction(document, issue.line));
  
  // Get full code for multi-line statements
  let originalCode = code;
  if (issue.endLine > issue.line) {
    const lines: string[] = [];
    for (let i = issue.line; i <= issue.endLine; i++) {
      lines.push(document.lineAt(i).text);
    }
    originalCode = lines.join('\n');
  }
  
  return {
    toolName,
    toolCategory,
    operationType,
    isDestructive,
    variableName,
    resultVariableName,
    functionName,
    className,
    isAsync,
    indent,
    innerIndent,
    provider,
    originalCode: originalCode.trim(),
    line: issue.line,
    endLine: issue.endLine,
  };
}

/**
 * Extract tool name from code pattern
 */
function extractToolName(code: string, category: BlueprintContext['toolCategory']): string {
  // Try to extract specific tool name
  const patterns: Record<string, RegExp> = {
    database: /(?:prisma|db|knex)\.(\w+)/i,
    payment: /(?:stripe)\.(\w+\.\w+)/i,
    email: /(sendEmail|sendMail|sendMessage|sendSMS|sendNotification)/i,
    file: /(?:fs|s3)\.(\w+)/i,
    http: /(axios|fetch)\.?(\w*)/i,
    llm: /(?:openai|anthropic|llm)\.?(\w*\.?\w*)/i,
    agent: /(agent|agentExecutor|crew|executor)\.(\w+)/i,
    generic: /(\w+)\s*\(/,
  };
  
  const pattern = patterns[category] || patterns.generic;
  const match = code.match(pattern);
  
  if (match) {
    return match[1] + (match[2] ? `.${match[2]}` : '');
  }
  
  return category;
}

/**
 * Extract variable names from the context around a line
 */
function extractVariableNames(
  document: vscode.TextDocument,
  line: number
): {
  variableName?: string;
  resultVariableName?: string;
  functionName?: string;
  className?: string;
} {
  const lineText = document.lineAt(line).text;
  
  // Check for result assignment: const result = await ...
  const resultMatch = lineText.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?/);
  const resultVariableName = resultMatch?.[1];
  
  // Check for input variable in the call
  const inputMatch = lineText.match(/\(\s*(\w+)(?:\s*,|\s*\))/);
  const variableName = inputMatch?.[1];
  
  // Find containing function
  let functionName: string | undefined;
  let className: string | undefined;
  
  for (let i = line - 1; i >= 0 && i > line - 50; i--) {
    const prevLine = document.lineAt(i).text;
    
    // Check for function declaration
    if (!functionName) {
      const funcMatch = prevLine.match(/(?:async\s+)?function\s+(\w+)/);
      const arrowMatch = prevLine.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/);
      const methodMatch = prevLine.match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/);
      
      functionName = funcMatch?.[1] || arrowMatch?.[1] || methodMatch?.[1];
    }
    
    // Check for class declaration
    if (!className) {
      const classMatch = prevLine.match(/class\s+(\w+)/);
      className = classMatch?.[1];
    }
    
    if (functionName && className) break;
  }
  
  return {
    variableName,
    resultVariableName,
    functionName,
    className,
  };
}

/**
 * Get the containing function text for async detection
 */
function getContainingFunction(document: vscode.TextDocument, line: number): string {
  const lines: string[] = [];
  
  for (let i = line - 1; i >= 0 && i > line - 20; i--) {
    const text = document.lineAt(i).text;
    lines.unshift(text);
    
    if (/(?:function|=>|\{)/.test(text)) {
      break;
    }
  }
  
  return lines.join('\n');
}

/**
 * Detect if code needs specific blueprint type
 */
export function detectBlueprintType(
  issue: Issue,
  context: BlueprintContext
): 'receipt' | 'error-handler' | 'confirmation' | 'provenance' | 'secret' | 'resilience' {
  switch (issue.ruleId) {
    case 'FK001':
      return 'receipt';
    case 'FK002':
      return 'error-handler';
    case 'FK003':
    case 'FK007':
      return 'secret';
    case 'FK004':
      return 'confirmation';
    case 'FK005':
      return 'resilience';
    case 'FK006':
      return 'provenance';
    default:
      return 'receipt';
  }
}
