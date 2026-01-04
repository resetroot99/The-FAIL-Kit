/**
 * F.A.I.L. Kit Auto-Fix History
 *
 * Manages undo stack for rollback of applied fixes.
 */

import * as vscode from 'vscode';

export interface FixHistoryEntry {
  id: string;
  filePath: string;
  timestamp: Date;
  ruleId: string;
  description: string;
  beforeContent: string;
  afterContent: string;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

/**
 * Fix History Manager for rollback support
 */
export class FixHistory {
  private undoStack: FixHistoryEntry[] = [];
  private maxStackSize: number;

  constructor(maxStackSize: number = 50) {
    this.maxStackSize = maxStackSize;
  }

  /**
   * Record a fix for potential rollback
   */
  record(entry: Omit<FixHistoryEntry, 'id' | 'timestamp'>): string {
    const id = `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEntry: FixHistoryEntry = {
      ...entry,
      id,
      timestamp: new Date(),
    };

    this.undoStack.push(fullEntry);

    // Trim stack if too large
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    return id;
  }

  /**
   * Rollback the last fix
   */
  async rollbackLast(): Promise<{ success: boolean; entry?: FixHistoryEntry; error?: string }> {
    const entry = this.undoStack.pop();
    if (!entry) {
      return { success: false, error: 'No fixes to rollback' };
    }

    try {
      const document = await vscode.workspace.openTextDocument(entry.filePath);
      const edit = new vscode.WorkspaceEdit();

      // Get current content to verify the fix was applied
      const currentContent = document.getText();
      
      // Replace the entire file with the before content
      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        document.positionAt(currentContent.length)
      );
      
      edit.replace(document.uri, fullRange, entry.beforeContent);
      
      const success = await vscode.workspace.applyEdit(edit);
      
      return { success, entry };
    } catch (error) {
      return { 
        success: false, 
        entry,
        error: error instanceof Error ? error.message : 'Unknown error during rollback',
      };
    }
  }

  /**
   * Rollback a specific fix by ID
   */
  async rollbackById(id: string): Promise<{ success: boolean; entry?: FixHistoryEntry; error?: string }> {
    const index = this.undoStack.findIndex(e => e.id === id);
    if (index === -1) {
      return { success: false, error: `Fix with ID ${id} not found` };
    }

    // Rollback this and all subsequent fixes (in reverse order)
    const entriesToRollback = this.undoStack.splice(index);
    
    for (const entry of entriesToRollback.reverse()) {
      try {
        const document = await vscode.workspace.openTextDocument(entry.filePath);
        const edit = new vscode.WorkspaceEdit();
        
        const currentContent = document.getText();
        const fullRange = new vscode.Range(
          new vscode.Position(0, 0),
          document.positionAt(currentContent.length)
        );
        
        edit.replace(document.uri, fullRange, entry.beforeContent);
        await vscode.workspace.applyEdit(edit);
      } catch (error) {
        // Continue rolling back other entries
        console.error(`Failed to rollback ${entry.id}:`, error);
      }
    }

    return { success: true, entry: entriesToRollback[entriesToRollback.length - 1] };
  }

  /**
   * Get recent fix history
   */
  getHistory(limit: number = 10): FixHistoryEntry[] {
    return [...this.undoStack].reverse().slice(0, limit);
  }

  /**
   * Get the last fix entry
   */
  getLastEntry(): FixHistoryEntry | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  /**
   * Check if rollback is available
   */
  canRollback(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
  }

  /**
   * Get history count
   */
  get count(): number {
    return this.undoStack.length;
  }
}

/**
 * Generate unified diff between two strings
 */
export function generateUnifiedDiff(before: string, after: string, filePath: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  
  let diff = `--- a/${filePath}\n+++ b/${filePath}\n`;
  
  // Simple line-by-line diff
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  let contextBuffer: string[] = [];
  let changes: Array<{ type: 'add' | 'remove' | 'context'; line: string; lineNum: number }> = [];
  
  for (let i = 0; i < maxLines; i++) {
    const beforeLine = beforeLines[i];
    const afterLine = afterLines[i];
    
    if (beforeLine === afterLine) {
      if (changes.length > 0) {
        changes.push({ type: 'context', line: beforeLine || '', lineNum: i + 1 });
      } else {
        contextBuffer.push(beforeLine || '');
      }
    } else {
      // Start of a change - include context
      if (contextBuffer.length > 0) {
        const context = contextBuffer.slice(-3);
        for (const line of context) {
          changes.push({ type: 'context', line, lineNum: i - contextBuffer.length + changes.length + 1 });
        }
        contextBuffer = [];
      }
      
      if (beforeLine !== undefined) {
        changes.push({ type: 'remove', line: beforeLine, lineNum: i + 1 });
      }
      if (afterLine !== undefined) {
        changes.push({ type: 'add', line: afterLine, lineNum: i + 1 });
      }
    }
  }
  
  // Format changes
  for (const change of changes) {
    if (change.type === 'add') {
      diff += `+${change.line}\n`;
    } else if (change.type === 'remove') {
      diff += `-${change.line}\n`;
    } else {
      diff += ` ${change.line}\n`;
    }
  }
  
  return diff;
}

/**
 * Parse a unified diff into hunks
 */
export function parseDiffHunks(diff: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = diff.split('\n');
  
  let currentHunk: DiffHunk | null = null;
  
  for (const line of lines) {
    const hunkMatch = line.match(/^@@\s+-(\d+),?(\d*)\s+\+(\d+),?(\d*)\s+@@/);
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: parseInt(hunkMatch[2] || '1', 10),
        newStart: parseInt(hunkMatch[3], 10),
        newLines: parseInt(hunkMatch[4] || '1', 10),
        lines: [],
      };
    } else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
      currentHunk.lines.push(line);
    }
  }
  
  if (currentHunk) {
    hunks.push(currentHunk);
  }
  
  return hunks;
}

// Global fix history instance
export const fixHistory = new FixHistory();
