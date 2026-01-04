/**
 * F.A.I.L. Kit Scope Analyzer
 *
 * Analyzes scope relationships to verify error handling
 * wraps specific calls, not just nearby code.
 */

import * as ts from 'typescript';
import { CFG, CFGNode, isInsideTryBlock, getAllPredecessors } from './cfgBuilder';

/**
 * Scope information for a code region
 */
export interface ScopeInfo {
  id: string;
  type: 'function' | 'block' | 'try' | 'catch' | 'finally' | 'loop' | 'if' | 'class' | 'module';
  startLine: number;
  endLine: number;
  parent?: ScopeInfo;
  children: ScopeInfo[];
  // For try scopes
  catchScope?: ScopeInfo;
  finallyScope?: ScopeInfo;
}

/**
 * Error handling context
 */
export interface ErrorHandlingContext {
  isInTryCatch: boolean;
  tryScope?: ScopeInfo;
  catchScope?: ScopeInfo;
  finallyScope?: ScopeInfo;
  catchesAllErrors: boolean;
  catchPattern?: string; // e.g., 'Error', 'TypeError', 'any'
}

/**
 * Analyze scope hierarchy from a source file
 */
export function analyzeScopes(sourceFile: ts.SourceFile): ScopeInfo[] {
  const scopes: ScopeInfo[] = [];
  let scopeIdCounter = 0;

  const visit = (node: ts.Node, parent?: ScopeInfo): void => {
    let currentScope: ScopeInfo | undefined;

    // Function scopes
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || 
        ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) {
      currentScope = createScope('function', node, sourceFile, parent, scopeIdCounter++);
      scopes.push(currentScope);
    }

    // Class scopes
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      currentScope = createScope('class', node, sourceFile, parent, scopeIdCounter++);
      scopes.push(currentScope);
    }

    // Block scopes
    if (ts.isBlock(node) && !isFunctionBody(node)) {
      currentScope = createScope('block', node, sourceFile, parent, scopeIdCounter++);
      scopes.push(currentScope);
    }

    // Try-catch-finally scopes
    if (ts.isTryStatement(node)) {
      const tryScope = createScope('try', node.tryBlock, sourceFile, parent, scopeIdCounter++);
      scopes.push(tryScope);

      if (node.catchClause) {
        const catchScope = createScope('catch', node.catchClause.block, sourceFile, parent, scopeIdCounter++);
        catchScope.parent = tryScope;
        tryScope.catchScope = catchScope;
        scopes.push(catchScope);

        // Visit catch block with catchScope as parent
        ts.forEachChild(node.catchClause.block, child => visit(child, catchScope));
      }

      if (node.finallyBlock) {
        const finallyScope = createScope('finally', node.finallyBlock, sourceFile, parent, scopeIdCounter++);
        finallyScope.parent = tryScope;
        tryScope.finallyScope = finallyScope;
        scopes.push(finallyScope);

        // Visit finally block
        ts.forEachChild(node.finallyBlock, child => visit(child, finallyScope));
      }

      // Visit try block with tryScope as parent
      ts.forEachChild(node.tryBlock, child => visit(child, tryScope));
      return; // Don't visit children again
    }

    // Loop scopes
    if (ts.isForStatement(node) || ts.isForOfStatement(node) || 
        ts.isForInStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) {
      currentScope = createScope('loop', node, sourceFile, parent, scopeIdCounter++);
      scopes.push(currentScope);
    }

    // If scopes
    if (ts.isIfStatement(node)) {
      currentScope = createScope('if', node, sourceFile, parent, scopeIdCounter++);
      scopes.push(currentScope);
    }

    ts.forEachChild(node, child => visit(child, currentScope || parent));
  };

  ts.forEachChild(sourceFile, child => visit(child, undefined));

  return scopes;
}

function createScope(
  type: ScopeInfo['type'],
  node: ts.Node,
  sourceFile: ts.SourceFile,
  parent: ScopeInfo | undefined,
  id: number
): ScopeInfo {
  const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
  const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;

  const scope: ScopeInfo = {
    id: `scope_${id}`,
    type,
    startLine,
    endLine,
    parent,
    children: [],
  };

  if (parent) {
    parent.children.push(scope);
  }

  return scope;
}

function isFunctionBody(node: ts.Block): boolean {
  const parent = node.parent;
  return ts.isFunctionDeclaration(parent) || 
         ts.isFunctionExpression(parent) || 
         ts.isArrowFunction(parent) || 
         ts.isMethodDeclaration(parent);
}

/**
 * Find the scope containing a specific line
 */
export function findScopeAtLine(scopes: ScopeInfo[], line: number): ScopeInfo | null {
  // Find the most specific (innermost) scope
  let bestMatch: ScopeInfo | null = null;

  for (const scope of scopes) {
    if (line >= scope.startLine && line <= scope.endLine) {
      if (!bestMatch || 
          (scope.endLine - scope.startLine) < (bestMatch.endLine - bestMatch.startLine)) {
        bestMatch = scope;
      }
    }
  }

  return bestMatch;
}

/**
 * Get the error handling context for a specific line
 */
export function getErrorHandlingContext(
  scopes: ScopeInfo[],
  line: number
): ErrorHandlingContext {
  const scope = findScopeAtLine(scopes, line);
  
  if (!scope) {
    return {
      isInTryCatch: false,
      catchesAllErrors: false,
    };
  }

  // Walk up the scope chain to find try-catch
  let current: ScopeInfo | undefined = scope;
  while (current) {
    if (current.type === 'try') {
      return {
        isInTryCatch: true,
        tryScope: current,
        catchScope: current.catchScope,
        finallyScope: current.finallyScope,
        catchesAllErrors: current.catchScope !== undefined,
        catchPattern: current.catchScope ? 'any' : undefined,
      };
    }
    current = current.parent;
  }

  return {
    isInTryCatch: false,
    catchesAllErrors: false,
  };
}

/**
 * Check if a specific call is wrapped in try-catch
 */
export function isCallWrappedInTryCatch(
  scopes: ScopeInfo[],
  callLine: number
): boolean {
  const context = getErrorHandlingContext(scopes, callLine);
  return context.isInTryCatch;
}

/**
 * Check if error handling at one line catches errors from another line
 */
export function doesErrorHandlingCover(
  scopes: ScopeInfo[],
  errorHandlingLine: number,
  callLine: number
): boolean {
  const callScope = findScopeAtLine(scopes, callLine);
  const handlerScope = findScopeAtLine(scopes, errorHandlingLine);

  if (!callScope || !handlerScope) {
    return false;
  }

  // The call should be inside a try block that has the handler as its catch
  if (callScope.type === 'try' || isChildOfTry(callScope)) {
    const tryScope = callScope.type === 'try' ? callScope : findParentTry(callScope);
    if (tryScope?.catchScope) {
      return errorHandlingLine >= tryScope.catchScope.startLine &&
             errorHandlingLine <= tryScope.catchScope.endLine;
    }
  }

  return false;
}

function isChildOfTry(scope: ScopeInfo): boolean {
  let current: ScopeInfo | undefined = scope.parent;
  while (current) {
    if (current.type === 'try') return true;
    current = current.parent;
  }
  return false;
}

function findParentTry(scope: ScopeInfo): ScopeInfo | null {
  let current: ScopeInfo | undefined = scope.parent;
  while (current) {
    if (current.type === 'try') return current;
    current = current.parent;
  }
  return null;
}

/**
 * Verify error handling wraps a specific call using CFG
 */
export function verifyErrorHandlingWithCFG(
  cfg: CFG,
  callLine: number
): {
  isHandled: boolean;
  handlerType?: 'try-catch' | 'try-finally' | 'promise-catch';
  handlerLine?: number;
} {
  // Find the CFG node containing the call
  let callNode: CFGNode | null = null;
  for (const [, node] of cfg.nodes) {
    if (callLine >= node.startLine && callLine <= node.endLine) {
      callNode = node;
      break;
    }
  }

  if (!callNode) {
    return { isHandled: false };
  }

  // Check if the node is inside a try block
  if (isInsideTryBlock(cfg, callNode.id)) {
    if (callNode.catchBlock) {
      const catchNode = cfg.nodes.get(callNode.catchBlock);
      return {
        isHandled: true,
        handlerType: 'try-catch',
        handlerLine: catchNode?.startLine,
      };
    }
    if (callNode.finallyBlock) {
      const finallyNode = cfg.nodes.get(callNode.finallyBlock);
      return {
        isHandled: true,
        handlerType: 'try-finally',
        handlerLine: finallyNode?.startLine,
      };
    }
  }

  // Check for .catch() in the path
  const successors = getAllPredecessors(cfg, cfg.exit.id);
  for (const nodeId of successors) {
    const node = cfg.nodes.get(nodeId);
    if (node && node.type === 'catch') {
      // Check if there's a path from the call to this catch
      if (hasPathThroughCatch(cfg, callNode.id, nodeId)) {
        return {
          isHandled: true,
          handlerType: 'promise-catch',
          handlerLine: node.startLine,
        };
      }
    }
  }

  return { isHandled: false };
}

function hasPathThroughCatch(cfg: CFG, fromId: string, catchId: string): boolean {
  const visited = new Set<string>();
  const queue = [fromId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current === catchId) return true;

    const node = cfg.nodes.get(current);
    if (!node) continue;

    // If this node can throw, check exception path
    if (node.throwsException && node.catchBlock === catchId) {
      return true;
    }

    for (const succId of node.successors) {
      queue.push(succId);
    }
  }

  return false;
}

/**
 * Get all try-catch scopes that cover a range of lines
 */
export function getTryCatchScopesInRange(
  scopes: ScopeInfo[],
  startLine: number,
  endLine: number
): ScopeInfo[] {
  return scopes.filter(scope => 
    scope.type === 'try' &&
    scope.startLine <= startLine &&
    scope.endLine >= endLine
  );
}

/**
 * Analyze if error handling pattern is comprehensive
 */
export function analyzeErrorHandlingCompleteness(
  scopes: ScopeInfo[],
  cfg: CFG,
  callLine: number
): {
  hasBasicHandler: boolean;
  hasPolicyEscalation: boolean;
  hasLogging: boolean;
  hasRetry: boolean;
  suggestions: string[];
} {
  const context = getErrorHandlingContext(scopes, callLine);
  const cfgResult = verifyErrorHandlingWithCFG(cfg, callLine);

  const result = {
    hasBasicHandler: context.isInTryCatch || cfgResult.isHandled,
    hasPolicyEscalation: false,
    hasLogging: false,
    hasRetry: false,
    suggestions: [] as string[],
  };

  if (!result.hasBasicHandler) {
    result.suggestions.push('Wrap call in try-catch block');
  }

  // Check catch block content if available
  if (context.catchScope) {
    const catchStartLine = context.catchScope.startLine;
    const catchEndLine = context.catchScope.endLine;

    // Look for patterns in the catch block
    for (const [, node] of cfg.nodes) {
      if (node.startLine >= catchStartLine && node.endLine <= catchEndLine) {
        for (const stmt of node.statements) {
          const text = stmt.getText(cfg.sourceFile);
          
          if (/policy\s*\.\s*escalate/i.test(text) || /escalate\s*=\s*true/i.test(text)) {
            result.hasPolicyEscalation = true;
          }
          
          if (/console\s*\.(log|error|warn)/i.test(text) || 
              /logger\s*\.\w+/i.test(text) ||
              /AuditLogger/i.test(text)) {
            result.hasLogging = true;
          }
          
          if (/retry/i.test(text) || /attempt/i.test(text) || /withRetry/i.test(text)) {
            result.hasRetry = true;
          }
        }
      }
    }
  }

  if (result.hasBasicHandler && !result.hasPolicyEscalation) {
    result.suggestions.push('Add policy escalation for critical failures');
  }

  if (result.hasBasicHandler && !result.hasLogging) {
    result.suggestions.push('Add error logging with AuditLogger.logFailure()');
  }

  return result;
}
