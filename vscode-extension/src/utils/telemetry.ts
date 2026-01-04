/**
 * F.A.I.L. Kit Telemetry (Optional)
 *
 * Error tracking with user consent. Disabled by default.
 */

import * as vscode from 'vscode';

export interface ErrorReport {
  error: string;
  stack?: string;
  context: {
    fileType?: string;
    codeLength?: number;
    action?: string;
  };
  timestamp: string;
  extensionVersion: string;
  platform: string;
}

let telemetryEnabled = false;
const errorQueue: ErrorReport[] = [];
const MAX_QUEUE_SIZE = 10;

/**
 * Initialize telemetry based on user settings
 */
export function initTelemetry(): void {
  const config = vscode.workspace.getConfiguration('fail-kit');
  telemetryEnabled = config.get<boolean>('telemetry.enabled', false);

  // Listen for config changes
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('fail-kit.telemetry.enabled')) {
      telemetryEnabled = config.get<boolean>('telemetry.enabled', false);
    }
  });
}

/**
 * Report an error (only if telemetry is enabled)
 */
export function reportError(
  error: Error | string,
  context: ErrorReport['context'] = {}
): void {
  if (!telemetryEnabled) {
    // Just log locally
    console.error('[F.A.I.L. Kit Error]', error);
    return;
  }

  const report: ErrorReport = {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
    extensionVersion: '1.0.1',
    platform: process.platform,
  };

  // Add to queue (for batch sending if we implement a backend)
  errorQueue.push(report);
  if (errorQueue.length > MAX_QUEUE_SIZE) {
    errorQueue.shift(); // Remove oldest
  }

  // Log to output channel for now
  console.error('[F.A.I.L. Kit Telemetry]', JSON.stringify(report, null, 2));
}

/**
 * Get queued error reports
 */
export function getErrorQueue(): ErrorReport[] {
  return [...errorQueue];
}

/**
 * Clear error queue
 */
export function clearErrorQueue(): void {
  errorQueue.length = 0;
}

/**
 * Check if telemetry is enabled
 */
export function isTelemetryEnabled(): boolean {
  return telemetryEnabled;
}
