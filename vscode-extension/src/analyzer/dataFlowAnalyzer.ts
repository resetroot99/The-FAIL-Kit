/**
 * F.A.I.L. Kit Data Flow Analyzer
 *
 * Tracks variable assignments and usages through the CFG.
 * Used to verify that receipt generation uses the actual call result.
 */

import * as ts from 'typescript';
import { CFG, CFGNode } from './cfgBuilder';

/**
 * Variable definition info
 */
export interface VarDef {
  name: string;
  line: number;
  column: number;
  type: 'let' | 'const' | 'var' | 'parameter' | 'import';
  initializer?: ts.Expression;
  isToolResult: boolean;
  isLLMResult: boolean;
  nodeId: string;
}

/**
 * Variable usage info
 */
export interface VarUse {
  name: string;
  line: number;
  column: number;
  context: 'read' | 'write' | 'call' | 'property-access';
  expression?: ts.Expression;
  nodeId: string;
}

/**
 * Data flow facts for a CFG node
 */
export interface DataFlowFacts {
  // Variables defined at this node
  definitions: Map<string, VarDef>;
  // Variables used at this node
  uses: Map<string, VarUse[]>;
  // Variables reaching this node (from predecessors)
  reachingDefs: Map<string, Set<VarDef>>;
  // Variables that are live after this node
  liveVars: Set<string>;
}

/**
 * Data flow analysis result
 */
export interface DataFlowResult {
  cfg: CFG;
  facts: Map<string, DataFlowFacts>;
  // Quick lookups
  allDefinitions: Map<string, VarDef[]>;
  allUses: Map<string, VarUse[]>;
  toolResults: VarDef[];
  llmResults: VarDef[];
}

/**
 * Perform data flow analysis on a CFG
 */
export function analyzeDataFlow(cfg: CFG): DataFlowResult {
  const facts = new Map<string, DataFlowFacts>();
  const allDefinitions = new Map<string, VarDef[]>();
  const allUses = new Map<string, VarUse[]>();
  const toolResults: VarDef[] = [];
  const llmResults: VarDef[] = [];

  // Initialize facts for each node
  for (const [nodeId, node] of cfg.nodes) {
    const nodeFacts: DataFlowFacts = {
      definitions: new Map(),
      uses: new Map(),
      reachingDefs: new Map(),
      liveVars: new Set(),
    };

    // Extract definitions and uses from statements
    for (const statement of node.statements) {
      extractDefsAndUses(statement, nodeId, nodeFacts, cfg.sourceFile);
    }

    // Extract from expressions
    if (node.expressions) {
      for (const expr of node.expressions) {
        extractExprDefsAndUses(expr, nodeId, nodeFacts, cfg.sourceFile);
      }
    }

    facts.set(nodeId, nodeFacts);

    // Aggregate all definitions and uses
    for (const [name, def] of nodeFacts.definitions) {
      if (!allDefinitions.has(name)) {
        allDefinitions.set(name, []);
      }
      allDefinitions.get(name)!.push(def);

      if (def.isToolResult) toolResults.push(def);
      if (def.isLLMResult) llmResults.push(def);
    }

    for (const [name, uses] of nodeFacts.uses) {
      if (!allUses.has(name)) {
        allUses.set(name, []);
      }
      allUses.get(name)!.push(...uses);
    }
  }

  // Compute reaching definitions (forward analysis)
  computeReachingDefs(cfg, facts);

  // Compute live variables (backward analysis)
  computeLiveVars(cfg, facts);

  return {
    cfg,
    facts,
    allDefinitions,
    allUses,
    toolResults,
    llmResults,
  };
}

/**
 * Extract variable definitions and uses from a statement
 */
function extractDefsAndUses(
  statement: ts.Statement,
  nodeId: string,
  facts: DataFlowFacts,
  sourceFile: ts.SourceFile
): void {
  const visitor = (node: ts.Node): void => {
    // Variable declarations
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const name = node.name.getText(sourceFile);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
      const column = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).character;

      const def: VarDef = {
        name,
        line,
        column,
        type: getVariableType(node),
        initializer: node.initializer,
        isToolResult: isToolCallResult(node.initializer, sourceFile),
        isLLMResult: isLLMCallResult(node.initializer, sourceFile),
        nodeId,
      };

      facts.definitions.set(name, def);

      // Also check uses in the initializer
      if (node.initializer) {
        extractExprUses(node.initializer, nodeId, facts, sourceFile);
      }
    }

    // Assignment expressions
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (ts.isIdentifier(node.left)) {
        const name = node.left.getText(sourceFile);
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
        const column = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).character;

        const def: VarDef = {
          name,
          line,
          column,
          type: 'var', // Reassignment
          initializer: node.right,
          isToolResult: isToolCallResult(node.right, sourceFile),
          isLLMResult: isLLMCallResult(node.right, sourceFile),
          nodeId,
        };

        facts.definitions.set(name, def);
      }

      // Extract uses from the right side
      extractExprUses(node.right, nodeId, facts, sourceFile);
    }

    ts.forEachChild(node, visitor);
  };

  visitor(statement);
}

/**
 * Extract uses from an expression
 */
function extractExprDefsAndUses(
  expression: ts.Expression,
  nodeId: string,
  facts: DataFlowFacts,
  sourceFile: ts.SourceFile
): void {
  extractExprUses(expression, nodeId, facts, sourceFile);
}

function extractExprUses(
  expression: ts.Expression,
  nodeId: string,
  facts: DataFlowFacts,
  sourceFile: ts.SourceFile
): void {
  const visitor = (node: ts.Node): void => {
    // Identifier uses (except left side of assignments)
    if (ts.isIdentifier(node)) {
      const parent = node.parent;
      
      // Skip if this is a definition
      if (ts.isVariableDeclaration(parent) && parent.name === node) {
        return;
      }
      if (ts.isBinaryExpression(parent) && 
          parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && 
          parent.left === node) {
        return;
      }
      
      // Skip property names
      if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
        return;
      }

      const name = node.getText(sourceFile);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
      const column = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).character;

      let context: VarUse['context'] = 'read';
      if (ts.isCallExpression(parent) && parent.expression === node) {
        context = 'call';
      } else if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
        context = 'property-access';
      }

      const use: VarUse = {
        name,
        line,
        column,
        context,
        expression: node,
        nodeId,
      };

      if (!facts.uses.has(name)) {
        facts.uses.set(name, []);
      }
      facts.uses.get(name)!.push(use);
    }

    ts.forEachChild(node, visitor);
  };

  visitor(expression);
}

/**
 * Get variable declaration type
 */
function getVariableType(node: ts.VariableDeclaration): VarDef['type'] {
  const varDeclList = node.parent;
  if (!ts.isVariableDeclarationList(varDeclList)) return 'var';

  if (varDeclList.flags & ts.NodeFlags.Const) return 'const';
  if (varDeclList.flags & ts.NodeFlags.Let) return 'let';
  return 'var';
}

/**
 * Check if expression is a tool call result
 */
function isToolCallResult(expression: ts.Expression | undefined, sourceFile: ts.SourceFile): boolean {
  if (!expression) return false;

  const text = expression.getText(sourceFile);
  
  // Common tool call patterns
  const toolPatterns = [
    /execute\s*\(/i,
    /run\s*\(/i,
    /invoke\s*\(/i,
    /call\s*\(/i,
    /tool\s*\.\s*\w+\s*\(/i,
    /prisma\.\w+\./i,
    /db\.\w+/i,
    /stripe\.\w+/i,
    /sendEmail/i,
    /sendMessage/i,
    /fetch\s*\(/i,
    /axios\.\w+/i,
    /fs\.\w+/i,
    /s3\.\w+/i,
  ];

  return toolPatterns.some(p => p.test(text));
}

/**
 * Check if expression is an LLM call result
 */
function isLLMCallResult(expression: ts.Expression | undefined, sourceFile: ts.SourceFile): boolean {
  if (!expression) return false;

  const text = expression.getText(sourceFile);
  
  // Common LLM call patterns
  const llmPatterns = [
    /openai\./i,
    /anthropic\./i,
    /chat\.completions/i,
    /messages\.create/i,
    /generateText/i,
    /streamText/i,
    /llm\.\w+/i,
    /model\.(call|invoke|generate)/i,
    /completion/i,
  ];

  return llmPatterns.some(p => p.test(text));
}

/**
 * Compute reaching definitions using iterative algorithm
 */
function computeReachingDefs(cfg: CFG, facts: Map<string, DataFlowFacts>): void {
  let changed = true;

  while (changed) {
    changed = false;

    for (const [nodeId, node] of cfg.nodes) {
      const nodeFacts = facts.get(nodeId)!;
      const newReaching = new Map<string, Set<VarDef>>();

      // Union of reaching defs from predecessors
      for (const predId of node.predecessors) {
        const predFacts = facts.get(predId);
        if (!predFacts) continue;

        for (const [name, defs] of predFacts.reachingDefs) {
          if (!newReaching.has(name)) {
            newReaching.set(name, new Set());
          }
          for (const def of defs) {
            newReaching.get(name)!.add(def);
          }
        }

        // Add definitions from predecessor
        for (const [name, def] of predFacts.definitions) {
          if (!newReaching.has(name)) {
            newReaching.set(name, new Set());
          }
          // Kill previous definitions of this variable
          newReaching.get(name)!.clear();
          newReaching.get(name)!.add(def);
        }
      }

      // Check if changed
      if (!mapsEqual(nodeFacts.reachingDefs, newReaching)) {
        nodeFacts.reachingDefs = newReaching;
        changed = true;
      }
    }
  }
}

/**
 * Compute live variables using backward analysis
 */
function computeLiveVars(cfg: CFG, facts: Map<string, DataFlowFacts>): void {
  let changed = true;

  while (changed) {
    changed = false;

    // Process in reverse order
    const nodes = Array.from(cfg.nodes.entries()).reverse();

    for (const [nodeId, node] of nodes) {
      const nodeFacts = facts.get(nodeId)!;
      const newLive = new Set<string>();

      // Union of live vars from successors
      for (const succId of node.successors) {
        const succFacts = facts.get(succId);
        if (!succFacts) continue;

        for (const name of succFacts.liveVars) {
          newLive.add(name);
        }
      }

      // Add uses from this node
      for (const name of nodeFacts.uses.keys()) {
        newLive.add(name);
      }

      // Remove definitions from this node
      for (const name of nodeFacts.definitions.keys()) {
        newLive.delete(name);
      }

      // Check if changed
      if (!setsEqual(nodeFacts.liveVars, newLive)) {
        nodeFacts.liveVars = newLive;
        changed = true;
      }
    }
  }
}

function mapsEqual<K, V>(a: Map<K, Set<V>>, b: Map<K, Set<V>>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, aSet] of a) {
    const bSet = b.get(key);
    if (!bSet || !setsEqual(aSet, bSet)) return false;
  }
  return true;
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

/**
 * Check if a variable is used after a specific line
 */
export function isVarUsedAfterLine(
  dataFlow: DataFlowResult,
  varName: string,
  line: number
): boolean {
  const uses = dataFlow.allUses.get(varName) || [];
  return uses.some(use => use.line > line);
}

/**
 * Get the definition reaching a use
 */
export function getReachingDefForUse(
  dataFlow: DataFlowResult,
  varName: string,
  useLine: number
): VarDef | null {
  // Find the node containing this use
  for (const [nodeId, node] of dataFlow.cfg.nodes) {
    if (useLine >= node.startLine && useLine <= node.endLine) {
      const nodeFacts = dataFlow.facts.get(nodeId);
      if (!nodeFacts) continue;

      const reachingDefs = nodeFacts.reachingDefs.get(varName);
      if (reachingDefs && reachingDefs.size > 0) {
        // Return the most recent definition
        return Array.from(reachingDefs).sort((a, b) => b.line - a.line)[0];
      }
    }
  }
  return null;
}

/**
 * Check if receipt uses the actual tool result variable
 */
export function doesReceiptUseToolResult(
  dataFlow: DataFlowResult,
  receiptLine: number,
  toolCallLine: number
): boolean {
  // Find tool result definition
  const toolDefs = dataFlow.toolResults.filter(d => d.line === toolCallLine);
  if (toolDefs.length === 0) return false;

  const toolDef = toolDefs[0];

  // Check if any use of this variable appears at the receipt line
  const uses = dataFlow.allUses.get(toolDef.name) || [];
  return uses.some(use => use.line === receiptLine);
}

/**
 * Variable state for tracking initialization
 */
export interface VariableState {
  name: string;
  initialized: boolean;
  possiblyUninitialized: boolean;
  definitionLine?: number;
}

/**
 * Definition-use chain entry
 */
export interface DefinitionUseChain {
  definition: VarDef;
  uses: VarUse[];
  isComplete: boolean;
}

/**
 * Uninitialized variable use info
 */
export interface UninitializedUse {
  variableName: string;
  line: number;
  column: number;
  message: string;
}

/**
 * Class-based Data Flow Analyzer for CFG integration
 */
export class DataFlowAnalyzer {
  private sourceFile: ts.SourceFile;
  private checker: ts.TypeChecker;
  private cfg: CFG;
  private dataFlowResult: DataFlowResult | null = null;

  constructor(sourceFile: ts.SourceFile, checker: ts.TypeChecker, cfg: CFG) {
    this.sourceFile = sourceFile;
    this.checker = checker;
    this.cfg = cfg;
  }

  /**
   * Run data flow analysis
   */
  analyze(): DataFlowResult {
    if (!this.dataFlowResult) {
      this.dataFlowResult = analyzeDataFlow(this.cfg);
    }
    return this.dataFlowResult;
  }

  /**
   * Find variables that may be used before initialization
   */
  findUninitializedVariableUses(): UninitializedUse[] {
    const result = this.analyze();
    const uninitializedUses: UninitializedUse[] = [];

    // For each variable use, check if there's a reaching definition
    for (const [nodeId, nodeFacts] of result.facts) {
      for (const [varName, uses] of nodeFacts.uses) {
        for (const use of uses) {
          // Check reaching definitions for this use
          const reachingDefs = nodeFacts.reachingDefs.get(varName);
          
          // If no reaching definitions, the variable may be uninitialized
          if (!reachingDefs || reachingDefs.size === 0) {
            // Check if it's a global or parameter (those are okay)
            if (!this.isGlobalOrParameter(varName)) {
              uninitializedUses.push({
                variableName: varName,
                line: use.line,
                column: use.column,
                message: `Variable '${varName}' may be used before initialization`,
              });
            }
          }

          // Check for possibly uninitialized (some paths don't initialize)
          if (reachingDefs && reachingDefs.size > 0) {
            const hasPossiblyUninitPath = this.hasPossiblyUninitializedPath(nodeId, varName);
            if (hasPossiblyUninitPath) {
              uninitializedUses.push({
                variableName: varName,
                line: use.line,
                column: use.column,
                message: `Variable '${varName}' may be uninitialized on some execution paths`,
              });
            }
          }
        }
      }
    }

    return uninitializedUses;
  }

  /**
   * Check if a variable is a global or function parameter
   */
  private isGlobalOrParameter(varName: string): boolean {
    // Check common globals
    const commonGlobals = ['console', 'process', 'require', 'module', 'exports', 
                           'window', 'document', 'global', 'Buffer', 'Promise',
                           'Array', 'Object', 'String', 'Number', 'Boolean',
                           'JSON', 'Math', 'Date', 'RegExp', 'Error', 'Map', 'Set'];
    if (commonGlobals.includes(varName)) return true;

    // Check if it's a parameter (would need to check function signature)
    const result = this.analyze();
    const allDefs = result.allDefinitions.get(varName) || [];
    return allDefs.some(def => def.type === 'parameter' || def.type === 'import');
  }

  /**
   * Check if there's a path where the variable might not be initialized
   */
  private hasPossiblyUninitializedPath(targetNodeId: string, varName: string): boolean {
    // Check if all paths from entry to this node have a definition
    const visited = new Set<string>();
    const queue: string[] = [this.cfg.entry.id];
    let hasUninitPath = false;

    // BFS to find paths to target
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      if (nodeId === targetNodeId) {
        // Check if we passed through a definition
        const nodeFacts = this.dataFlowResult?.facts.get(nodeId);
        const reachingDefs = nodeFacts?.reachingDefs.get(varName);
        if (!reachingDefs || reachingDefs.size === 0) {
          hasUninitPath = true;
          break;
        }
        continue;
      }

      const node = this.cfg.nodes.get(nodeId);
      if (node) {
        for (const successor of node.successors) {
          queue.push(successor);
        }
      }
    }

    return hasUninitPath;
  }

  /**
   * Get definition-use chains for a variable
   */
  getDefinitionUseChains(varName: string): DefinitionUseChain[] {
    const result = this.analyze();
    const chains: DefinitionUseChain[] = [];

    const defs = result.allDefinitions.get(varName) || [];
    const allUses = result.allUses.get(varName) || [];

    for (const def of defs) {
      const usesForDef = allUses.filter(use => {
        // A use is associated with a def if the def reaches the use
        const nodeFacts = result.facts.get(use.nodeId);
        const reachingDefs = nodeFacts?.reachingDefs.get(varName);
        return reachingDefs?.has(def);
      });

      chains.push({
        definition: def,
        uses: usesForDef,
        isComplete: usesForDef.length > 0,
      });
    }

    return chains;
  }

  /**
   * Check if a variable is used after a definition
   */
  isVariableUsedAfterDefinition(def: VarDef): boolean {
    const result = this.analyze();
    const uses = result.allUses.get(def.name) || [];
    return uses.some(use => use.line > def.line);
  }

  /**
   * Find dead stores (definitions that are never used)
   */
  findDeadStores(): VarDef[] {
    const result = this.analyze();
    const deadStores: VarDef[] = [];

    for (const [varName, defs] of result.allDefinitions) {
      for (const def of defs) {
        if (!this.isVariableUsedAfterDefinition(def)) {
          // Check if it's not the last definition (reassigned before use)
          const laterDefs = defs.filter(d => d.line > def.line);
          if (laterDefs.length > 0) {
            deadStores.push(def);
          }
        }
      }
    }

    return deadStores;
  }
}
