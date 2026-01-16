/**
 * F.A.I.L. Kit Utilities
 */

export * from './debounce';
export * from './cache';
export * from './telemetry';

import * as vscode from 'vscode';

/**
 * Debug output channel for F.A.I.L. Kit
 */
export const debugChannel = vscode.window.createOutputChannel('F.A.I.L. Kit Debug', { log: true });

/**
 * Debug logging utility
 */
export function debugLog(message: string, ...args: any[]): void {
  const config = vscode.workspace.getConfiguration('fail-kit');
  if (config.get<boolean>('debug', false)) {
    const timestamp = new Date().toISOString();
    debugChannel.appendLine(`[${timestamp}] ${message}`);
    if (args.length > 0) {
      debugChannel.appendLine(JSON.stringify(args, null, 2));
    }
  }
}

/**
 * Show debug channel
 */
export function showDebugChannel(): void {
  debugChannel.show();
}
