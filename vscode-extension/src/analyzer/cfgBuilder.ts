/**
 * F.A.I.L. Kit Control Flow Graph Builder
 *
 * Constructs a Control Flow Graph (CFG) from TypeScript AST.
 * Used for precise data flow analysis and error handling verification.
 */

import * as ts from 'typescript';

/**
 * CFG Node representing a basic block
 */
export interface CFGNode {
  id: string;
  type: CFGNodeType;
  statements: ts.Statement[];
  expressions?: ts.Expression[];
  // Line range
  startLine: number;
  endLine: number;
  // Connections
  predecessors: Set<string>;
  successors: Set<string>;
  // Exception handling
  throwsException: boolean;
  catchBlock?: string;
  finallyBlock?: string;
  // Loop/branch info
  loopHead?: string;
  loopExit?: string;
  condition?: ts.Expression;
}

export type CFGNodeType = 
  | 'entry'
  | 'exit'
  | 'block'
  | 'branch'
  | 'loop-head'
  | 'loop-body'
  | 'loop-exit'
  | 'try'
  | 'catch'
  | 'finally'
  | 'throw'
  | 'return'
  | 'call';

/**
 * Control Flow Graph
 */
export interface CFG {
  entry: CFGNode;
  exit: CFGNode;
  nodes: Map<string, CFGNode>;
  // Function info
  functionName?: string;
  isAsync: boolean;
  // Source file
  sourceFile: ts.SourceFile;
}

/**
 * Build CFG from a function or source file
 */
export function buildCFG(node: ts.Node, sourceFile: ts.SourceFile): CFG {
  const builder = new CFGBuilder(sourceFile);
  return builder.build(node);
}

/**
 * CFG Builder class
 */
class CFGBuilder {
  private sourceFile: ts.SourceFile;
  private nodes: Map<string, CFGNode> = new Map();
  private nodeIdCounter = 0;
  private currentBlock: CFGNode | null = null;
  private entryNode: CFGNode;
  private exitNode: CFGNode;
  private tryStack: { tryNode: string; catchNode?: string; finallyNode?: string }[] = [];
  private loopStack: { headNode: string; exitNode: string }[] = [];

  constructor(sourceFile: ts.SourceFile) {
    this.sourceFile = sourceFile;
    
    // Create entry and exit nodes
    this.entryNode = this.createNode('entry', 0, 0);
    this.exitNode = this.createNode('exit', 0, 0);
  }

  build(node: ts.Node): CFG {
    let functionName: string | undefined;
    let isAsync = false;
    
    // Determine function info
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
      functionName = node.name?.getText(this.sourceFile);
      isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    } else if (ts.isArrowFunction(node)) {
      isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    } else if (ts.isMethodDeclaration(node)) {
      functionName = node.name?.getText(this.sourceFile);
      isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    }
    
    // Start from entry
    this.currentBlock = this.entryNode;
    
    // Process the body
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node)) {
      if (node.body) {
        this.visitBlock(node.body);
      }
    } else if (ts.isArrowFunction(node)) {
      if (ts.isBlock(node.body)) {
        this.visitBlock(node.body);
      } else {
        // Expression body (arrow function)
        this.visitExpression(node.body);
      }
    } else if (ts.isSourceFile(node)) {
      // Process top-level statements
      for (const statement of node.statements) {
        this.visitStatement(statement);
      }
    }
    
    // Connect last block to exit if not already connected
    if (this.currentBlock && !this.currentBlock.successors.has(this.exitNode.id)) {
      this.connect(this.currentBlock, this.exitNode);
    }
    
    return {
      entry: this.entryNode,
      exit: this.exitNode,
      nodes: this.nodes,
      functionName,
      isAsync,
      sourceFile: this.sourceFile,
    };
  }

  private createNode(
    type: CFGNodeType,
    startLine: number,
    endLine: number
  ): CFGNode {
    const id = `node_${this.nodeIdCounter++}`;
    const node: CFGNode = {
      id,
      type,
      statements: [],
      startLine,
      endLine,
      predecessors: new Set(),
      successors: new Set(),
      throwsException: false,
    };
    this.nodes.set(id, node);
    return node;
  }

  private connect(from: CFGNode, to: CFGNode): void {
    from.successors.add(to.id);
    to.predecessors.add(from.id);
  }

  private getLineNumber(node: ts.Node): number {
    return this.sourceFile.getLineAndCharacterOfPosition(node.getStart(this.sourceFile)).line;
  }

  private getEndLineNumber(node: ts.Node): number {
    return this.sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;
  }

  private visitBlock(block: ts.Block): void {
    for (const statement of block.statements) {
      this.visitStatement(statement);
    }
  }

  private visitStatement(statement: ts.Statement): void {
    if (!this.currentBlock) {
      this.currentBlock = this.createNode('block', this.getLineNumber(statement), this.getEndLineNumber(statement));
    }

    // Handle different statement types
    if (ts.isIfStatement(statement)) {
      this.visitIfStatement(statement);
    } else if (ts.isWhileStatement(statement) || ts.isForStatement(statement) || ts.isForOfStatement(statement) || ts.isForInStatement(statement)) {
      this.visitLoopStatement(statement);
    } else if (ts.isDoStatement(statement)) {
      this.visitDoWhileStatement(statement);
    } else if (ts.isTryStatement(statement)) {
      this.visitTryStatement(statement);
    } else if (ts.isThrowStatement(statement)) {
      this.visitThrowStatement(statement);
    } else if (ts.isReturnStatement(statement)) {
      this.visitReturnStatement(statement);
    } else if (ts.isBreakStatement(statement)) {
      this.visitBreakStatement(statement);
    } else if (ts.isContinueStatement(statement)) {
      this.visitContinueStatement(statement);
    } else if (ts.isSwitchStatement(statement)) {
      this.visitSwitchStatement(statement);
    } else if (ts.isBlock(statement)) {
      this.visitBlock(statement);
    } else {
      // Regular statement - add to current block
      this.currentBlock.statements.push(statement);
      this.currentBlock.endLine = this.getEndLineNumber(statement);
      
      // Check for function calls that might throw
      if (this.containsThrowingCall(statement)) {
        this.currentBlock.throwsException = true;
        if (this.tryStack.length > 0) {
          const tryContext = this.tryStack[this.tryStack.length - 1];
          this.currentBlock.catchBlock = tryContext.catchNode;
          this.currentBlock.finallyBlock = tryContext.finallyNode;
        }
      }
    }
  }

  private visitIfStatement(statement: ts.IfStatement): void {
    const startLine = this.getLineNumber(statement);
    
    // Create branch node
    const branchNode = this.createNode('branch', startLine, startLine);
    branchNode.condition = statement.expression;
    
    if (this.currentBlock) {
      this.connect(this.currentBlock, branchNode);
    }
    
    // Create then block
    const thenBlock = this.createNode('block', this.getLineNumber(statement.thenStatement), this.getEndLineNumber(statement.thenStatement));
    this.connect(branchNode, thenBlock);
    
    // Visit then branch
    this.currentBlock = thenBlock;
    if (ts.isBlock(statement.thenStatement)) {
      this.visitBlock(statement.thenStatement);
    } else {
      this.visitStatement(statement.thenStatement);
    }
    const thenExit = this.currentBlock;
    
    // Handle else branch
    let elseExit: CFGNode | null = null;
    if (statement.elseStatement) {
      const elseBlock = this.createNode('block', this.getLineNumber(statement.elseStatement), this.getEndLineNumber(statement.elseStatement));
      this.connect(branchNode, elseBlock);
      
      this.currentBlock = elseBlock;
      if (ts.isBlock(statement.elseStatement)) {
        this.visitBlock(statement.elseStatement);
      } else {
        this.visitStatement(statement.elseStatement);
      }
      elseExit = this.currentBlock;
    }
    
    // Create merge block
    const mergeBlock = this.createNode('block', this.getEndLineNumber(statement), this.getEndLineNumber(statement));
    if (thenExit) {
      this.connect(thenExit, mergeBlock);
    }
    if (elseExit) {
      this.connect(elseExit, mergeBlock);
    } else {
      // No else - connect branch directly to merge
      this.connect(branchNode, mergeBlock);
    }
    
    this.currentBlock = mergeBlock;
  }

  private visitLoopStatement(statement: ts.WhileStatement | ts.ForStatement | ts.ForOfStatement | ts.ForInStatement): void {
    const startLine = this.getLineNumber(statement);
    
    // Create loop head
    const loopHead = this.createNode('loop-head', startLine, startLine);
    if (this.currentBlock) {
      this.connect(this.currentBlock, loopHead);
    }
    
    // Create loop exit
    const loopExit = this.createNode('loop-exit', this.getEndLineNumber(statement), this.getEndLineNumber(statement));
    
    // Push to loop stack
    this.loopStack.push({ headNode: loopHead.id, exitNode: loopExit.id });
    
    // Condition
    if ('expression' in statement && statement.expression) {
      loopHead.condition = statement.expression;
    }
    
    // Create loop body
    const loopBody = this.createNode('loop-body', this.getLineNumber(statement.statement), this.getEndLineNumber(statement.statement));
    loopBody.loopHead = loopHead.id;
    loopBody.loopExit = loopExit.id;
    this.connect(loopHead, loopBody);
    this.connect(loopHead, loopExit); // Exit condition
    
    // Visit loop body
    this.currentBlock = loopBody;
    if (ts.isBlock(statement.statement)) {
      this.visitBlock(statement.statement);
    } else {
      this.visitStatement(statement.statement);
    }
    
    // Connect back to loop head
    if (this.currentBlock) {
      this.connect(this.currentBlock, loopHead);
    }
    
    this.loopStack.pop();
    this.currentBlock = loopExit;
  }

  private visitDoWhileStatement(statement: ts.DoStatement): void {
    const startLine = this.getLineNumber(statement);
    
    // Create loop body first
    const loopBody = this.createNode('loop-body', startLine, this.getEndLineNumber(statement.statement));
    if (this.currentBlock) {
      this.connect(this.currentBlock, loopBody);
    }
    
    // Create loop head (condition check at end)
    const loopHead = this.createNode('loop-head', this.getLineNumber(statement.expression), this.getLineNumber(statement.expression));
    loopHead.condition = statement.expression;
    
    // Create loop exit
    const loopExit = this.createNode('loop-exit', this.getEndLineNumber(statement), this.getEndLineNumber(statement));
    
    this.loopStack.push({ headNode: loopHead.id, exitNode: loopExit.id });
    
    loopBody.loopHead = loopHead.id;
    loopBody.loopExit = loopExit.id;
    
    // Visit body
    this.currentBlock = loopBody;
    if (ts.isBlock(statement.statement)) {
      this.visitBlock(statement.statement);
    } else {
      this.visitStatement(statement.statement);
    }
    
    // Connect to condition check
    if (this.currentBlock) {
      this.connect(this.currentBlock, loopHead);
    }
    
    // Condition: continue or exit
    this.connect(loopHead, loopBody);
    this.connect(loopHead, loopExit);
    
    this.loopStack.pop();
    this.currentBlock = loopExit;
  }

  private visitTryStatement(statement: ts.TryStatement): void {
    const startLine = this.getLineNumber(statement);
    
    // Create try node
    const tryNode = this.createNode('try', startLine, this.getEndLineNumber(statement.tryBlock));
    if (this.currentBlock) {
      this.connect(this.currentBlock, tryNode);
    }
    
    // Create catch and finally nodes if present
    let catchNode: CFGNode | undefined;
    let finallyNode: CFGNode | undefined;
    
    if (statement.catchClause) {
      catchNode = this.createNode('catch', this.getLineNumber(statement.catchClause), this.getEndLineNumber(statement.catchClause));
      this.connect(tryNode, catchNode); // Exception path
    }
    
    if (statement.finallyBlock) {
      finallyNode = this.createNode('finally', this.getLineNumber(statement.finallyBlock), this.getEndLineNumber(statement.finallyBlock));
    }
    
    // Push try context
    this.tryStack.push({
      tryNode: tryNode.id,
      catchNode: catchNode?.id,
      finallyNode: finallyNode?.id,
    });
    
    // Visit try block
    this.currentBlock = tryNode;
    this.visitBlock(statement.tryBlock);
    const tryExit = this.currentBlock;
    
    this.tryStack.pop();
    
    // Visit catch block if present
    let catchExit: CFGNode | undefined;
    if (catchNode && statement.catchClause) {
      this.currentBlock = catchNode;
      this.visitBlock(statement.catchClause.block);
      catchExit = this.currentBlock || undefined;
    }
    
    // Visit finally block if present
    let finallyExit: CFGNode | undefined;
    if (finallyNode && statement.finallyBlock) {
      // Connect try and catch exits to finally
      if (tryExit) this.connect(tryExit, finallyNode);
      if (catchExit) this.connect(catchExit, finallyNode);
      
      this.currentBlock = finallyNode;
      this.visitBlock(statement.finallyBlock);
      finallyExit = this.currentBlock || undefined;
      
      this.currentBlock = finallyExit || finallyNode;
    } else {
      // No finally - create merge point
      const mergeBlock = this.createNode('block', this.getEndLineNumber(statement), this.getEndLineNumber(statement));
      if (tryExit) this.connect(tryExit, mergeBlock);
      if (catchExit) this.connect(catchExit, mergeBlock);
      this.currentBlock = mergeBlock;
    }
  }

  private visitThrowStatement(statement: ts.ThrowStatement): void {
    const throwNode = this.createNode('throw', this.getLineNumber(statement), this.getEndLineNumber(statement));
    throwNode.throwsException = true;
    
    if (this.currentBlock) {
      this.currentBlock.statements.push(statement);
      this.connect(this.currentBlock, throwNode);
    }
    
    // Connect to catch or exit
    if (this.tryStack.length > 0) {
      const tryContext = this.tryStack[this.tryStack.length - 1];
      if (tryContext.catchNode) {
        const catchNode = this.nodes.get(tryContext.catchNode);
        if (catchNode) {
          this.connect(throwNode, catchNode);
        }
      } else if (tryContext.finallyNode) {
        const finallyNode = this.nodes.get(tryContext.finallyNode);
        if (finallyNode) {
          this.connect(throwNode, finallyNode);
        }
      }
    } else {
      // Unhandled throw - connect to exit
      this.connect(throwNode, this.exitNode);
    }
    
    this.currentBlock = null;
  }

  private visitReturnStatement(statement: ts.ReturnStatement): void {
    const returnNode = this.createNode('return', this.getLineNumber(statement), this.getEndLineNumber(statement));
    returnNode.statements.push(statement);
    
    if (this.currentBlock) {
      this.connect(this.currentBlock, returnNode);
    }
    
    // Check for finally blocks
    if (this.tryStack.length > 0) {
      for (const tryContext of this.tryStack) {
        if (tryContext.finallyNode) {
          const finallyNode = this.nodes.get(tryContext.finallyNode);
          if (finallyNode) {
            this.connect(returnNode, finallyNode);
          }
        }
      }
    }
    
    this.connect(returnNode, this.exitNode);
    this.currentBlock = null;
  }

  private visitBreakStatement(statement: ts.BreakStatement): void {
    if (this.currentBlock && this.loopStack.length > 0) {
      const loopContext = this.loopStack[this.loopStack.length - 1];
      const exitNode = this.nodes.get(loopContext.exitNode);
      if (exitNode) {
        this.connect(this.currentBlock, exitNode);
      }
    }
    this.currentBlock = null;
  }

  private visitContinueStatement(statement: ts.ContinueStatement): void {
    if (this.currentBlock && this.loopStack.length > 0) {
      const loopContext = this.loopStack[this.loopStack.length - 1];
      const headNode = this.nodes.get(loopContext.headNode);
      if (headNode) {
        this.connect(this.currentBlock, headNode);
      }
    }
    this.currentBlock = null;
  }

  private visitSwitchStatement(statement: ts.SwitchStatement): void {
    const startLine = this.getLineNumber(statement);
    
    const switchNode = this.createNode('branch', startLine, startLine);
    switchNode.condition = statement.expression;
    
    if (this.currentBlock) {
      this.connect(this.currentBlock, switchNode);
    }
    
    const exitBlock = this.createNode('block', this.getEndLineNumber(statement), this.getEndLineNumber(statement));
    let prevCaseExit: CFGNode | null = null;
    
    for (const clause of statement.caseBlock.clauses) {
      const caseBlock = this.createNode('block', this.getLineNumber(clause), this.getEndLineNumber(clause));
      this.connect(switchNode, caseBlock);
      
      // Fall-through from previous case
      if (prevCaseExit) {
        this.connect(prevCaseExit, caseBlock);
      }
      
      this.currentBlock = caseBlock;
      for (const stmt of clause.statements) {
        this.visitStatement(stmt);
      }
      
      prevCaseExit = this.currentBlock;
      
      // Check for break
      const hasBreak = clause.statements.some(s => ts.isBreakStatement(s));
      if (hasBreak && this.currentBlock) {
        this.connect(this.currentBlock, exitBlock);
        prevCaseExit = null;
      }
    }
    
    // Connect last case to exit
    if (prevCaseExit) {
      this.connect(prevCaseExit, exitBlock);
    }
    
    this.currentBlock = exitBlock;
  }

  private visitExpression(expression: ts.Expression): void {
    if (!this.currentBlock) {
      this.currentBlock = this.createNode('block', this.getLineNumber(expression), this.getEndLineNumber(expression));
    }
    
    if (!this.currentBlock.expressions) {
      this.currentBlock.expressions = [];
    }
    this.currentBlock.expressions.push(expression);
  }

  private containsThrowingCall(node: ts.Node): boolean {
    let hasCall = false;
    
    const visitor = (n: ts.Node): void => {
      if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
        hasCall = true;
      }
      if (ts.isAwaitExpression(n)) {
        hasCall = true;
      }
      ts.forEachChild(n, visitor);
    };
    
    visitor(node);
    return hasCall;
  }
}

/**
 * Find CFG node containing a specific line
 */
export function findNodeAtLine(cfg: CFG, line: number): CFGNode | null {
  for (const [, node] of cfg.nodes) {
    if (line >= node.startLine && line <= node.endLine) {
      return node;
    }
  }
  return null;
}

/**
 * Get all predecessors of a node (transitive)
 */
export function getAllPredecessors(cfg: CFG, nodeId: string): Set<string> {
  const visited = new Set<string>();
  const queue = [nodeId];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = cfg.nodes.get(current);
    if (!node) continue;
    
    for (const predId of node.predecessors) {
      if (!visited.has(predId)) {
        visited.add(predId);
        queue.push(predId);
      }
    }
  }
  
  return visited;
}

/**
 * Get all successors of a node (transitive)
 */
export function getAllSuccessors(cfg: CFG, nodeId: string): Set<string> {
  const visited = new Set<string>();
  const queue = [nodeId];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = cfg.nodes.get(current);
    if (!node) continue;
    
    for (const succId of node.successors) {
      if (!visited.has(succId)) {
        visited.add(succId);
        queue.push(succId);
      }
    }
  }
  
  return visited;
}

/**
 * Check if a path exists between two nodes
 */
export function hasPath(cfg: CFG, fromId: string, toId: string): boolean {
  const successors = getAllSuccessors(cfg, fromId);
  return successors.has(toId);
}

/**
 * Check if node is inside try block
 */
export function isInsideTryBlock(cfg: CFG, nodeId: string): boolean {
  const node = cfg.nodes.get(nodeId);
  return node?.catchBlock !== undefined || node?.finallyBlock !== undefined;
}
