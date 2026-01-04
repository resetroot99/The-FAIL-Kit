/**
 * F.A.I.L. Kit Audit Logger Blueprint Generator
 *
 * Generates AuditLogger scaffolding and utility code.
 */

import { Issue } from '../../analyzer';
import { Blueprint, BlueprintContext, BlueprintGenerator } from './types';

/**
 * Generate the AuditLogger utility class
 */
export function generateAuditLoggerClass(indent: string = ''): string {
  return `
${indent}/**
${indent} * F.A.I.L. Kit Audit Logger
${indent} * 
${indent} * Centralized logging for all agent actions with cryptographic receipts.
${indent} * Import this in your agent code: import { AuditLogger } from './audit-logger';
${indent} */
${indent}import crypto from 'crypto';
${indent}
${indent}export interface ActionReceipt {
${indent}  action_id: string;
${indent}  tool_name: string;
${indent}  tool_category?: string;
${indent}  operation?: string;
${indent}  timestamp: string;
${indent}  status: 'success' | 'failure' | 'timeout' | 'degraded';
${indent}  input_hash?: string;
${indent}  output_hash?: string;
${indent}  error_type?: string;
${indent}  error_message?: string;
${indent}  stack_trace?: string;
${indent}  metadata?: Record<string, unknown>;
${indent}  provenance?: {
${indent}    trace_id?: string;
${indent}    parent_action_id?: string;
${indent}    user_id?: string;
${indent}  };
${indent}  compliance?: {
${indent}    pci_logged?: boolean;
${indent}    audit_required?: boolean;
${indent}    gdpr_relevant?: boolean;
${indent}  };
${indent}}
${indent}
${indent}export interface RetryLog {
${indent}  action_id: string;
${indent}  tool_name: string;
${indent}  attempt: number;
${indent}  error_message: string;
${indent}  timestamp: string;
${indent}}
${indent}
${indent}type LogDestination = 'console' | 'file' | 'remote' | 'custom';
${indent}
${indent}interface AuditLoggerConfig {
${indent}  destination: LogDestination;
${indent}  customHandler?: (receipt: ActionReceipt) => void | Promise<void>;
${indent}  remoteEndpoint?: string;
${indent}  filePath?: string;
${indent}  includeStackTrace?: boolean;
${indent}  minSeverity?: 'debug' | 'info' | 'warn' | 'error';
${indent}}
${indent}
${indent}class AuditLoggerImpl {
${indent}  private config: AuditLoggerConfig = {
${indent}    destination: 'console',
${indent}    includeStackTrace: true,
${indent}    minSeverity: 'info',
${indent}  };
${indent}
${indent}  private receipts: ActionReceipt[] = [];
${indent}  private retryLogs: RetryLog[] = [];
${indent}
${indent}  configure(config: Partial<AuditLoggerConfig>): void {
${indent}    this.config = { ...this.config, ...config };
${indent}  }
${indent}
${indent}  /**
${indent}   * Log a successful action with receipt
${indent}   */
${indent}  logAction(receipt: ActionReceipt): void {
${indent}    this.receipts.push(receipt);
${indent}    this.emit(receipt);
${indent}  }
${indent}
${indent}  /**
${indent}   * Log a failed action with error details
${indent}   */
${indent}  logFailure(receipt: ActionReceipt): void {
${indent}    if (!receipt.status) {
${indent}      receipt.status = 'failure';
${indent}    }
${indent}    this.receipts.push(receipt);
${indent}    this.emit(receipt, 'error');
${indent}  }
${indent}
${indent}  /**
${indent}   * Log a retry attempt
${indent}   */
${indent}  logRetry(log: RetryLog): void {
${indent}    this.retryLogs.push(log);
${indent}    this.emit({ ...log, status: 'failure' } as ActionReceipt, 'warn');
${indent}  }
${indent}
${indent}  /**
${indent}   * Get all receipts for the current session
${indent}   */
${indent}  getReceipts(): ActionReceipt[] {
${indent}    return [...this.receipts];
${indent}  }
${indent}
${indent}  /**
${indent}   * Get receipts filtered by status
${indent}   */
${indent}  getReceiptsByStatus(status: ActionReceipt['status']): ActionReceipt[] {
${indent}    return this.receipts.filter(r => r.status === status);
${indent}  }
${indent}
${indent}  /**
${indent}   * Clear all receipts (useful for testing)
${indent}   */
${indent}  clearReceipts(): void {
${indent}    this.receipts = [];
${indent}    this.retryLogs = [];
${indent}  }
${indent}
${indent}  /**
${indent}   * Generate hash for data
${indent}   */
${indent}  static hash(data: unknown): string {
${indent}    return 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
${indent}  }
${indent}
${indent}  /**
${indent}   * Generate unique action ID
${indent}   */
${indent}  static generateActionId(prefix: string = 'act'): string {
${indent}    return \`\${prefix}_\${Date.now().toString(36)}_\${Math.random().toString(36).substr(2, 9)}\`;
${indent}  }
${indent}
${indent}  /**
${indent}   * Create a receipt builder for fluent API
${indent}   */
${indent}  createReceipt(toolName: string): ReceiptBuilder {
${indent}    return new ReceiptBuilder(toolName, this);
${indent}  }
${indent}
${indent}  private emit(receipt: ActionReceipt | RetryLog, level: 'info' | 'warn' | 'error' = 'info'): void {
${indent}    const formatted = JSON.stringify(receipt, null, 2);
${indent}    
${indent}    switch (this.config.destination) {
${indent}      case 'console':
${indent}        if (level === 'error') {
${indent}          console.error('[F.A.I.L. Kit]', formatted);
${indent}        } else if (level === 'warn') {
${indent}          console.warn('[F.A.I.L. Kit]', formatted);
${indent}        } else {
${indent}          console.log('[F.A.I.L. Kit]', formatted);
${indent}        }
${indent}        break;
${indent}      
${indent}      case 'custom':
${indent}        if (this.config.customHandler) {
${indent}          this.config.customHandler(receipt as ActionReceipt);
${indent}        }
${indent}        break;
${indent}      
${indent}      case 'remote':
${indent}        if (this.config.remoteEndpoint) {
${indent}          fetch(this.config.remoteEndpoint, {
${indent}            method: 'POST',
${indent}            headers: { 'Content-Type': 'application/json' },
${indent}            body: formatted,
${indent}          }).catch(err => console.error('[F.A.I.L. Kit] Remote logging failed:', err));
${indent}        }
${indent}        break;
${indent}      
${indent}      case 'file':
${indent}        // File logging would be implemented here
${indent}        console.log('[F.A.I.L. Kit]', formatted);
${indent}        break;
${indent}    }
${indent}  }
${indent}}
${indent}
${indent}/**
${indent} * Fluent receipt builder
${indent} */
${indent}class ReceiptBuilder {
${indent}  private receipt: Partial<ActionReceipt>;
${indent}  private logger: AuditLoggerImpl;
${indent}
${indent}  constructor(toolName: string, logger: AuditLoggerImpl) {
${indent}    this.logger = logger;
${indent}    this.receipt = {
${indent}      action_id: AuditLoggerImpl.generateActionId(),
${indent}      tool_name: toolName,
${indent}      timestamp: new Date().toISOString(),
${indent}      status: 'success',
${indent}    };
${indent}  }
${indent}
${indent}  category(category: string): this {
${indent}    this.receipt.tool_category = category;
${indent}    return this;
${indent}  }
${indent}
${indent}  operation(op: string): this {
${indent}    this.receipt.operation = op;
${indent}    return this;
${indent}  }
${indent}
${indent}  input(data: unknown): this {
${indent}    this.receipt.input_hash = AuditLoggerImpl.hash(data);
${indent}    return this;
${indent}  }
${indent}
${indent}  output(data: unknown): this {
${indent}    this.receipt.output_hash = AuditLoggerImpl.hash(data);
${indent}    return this;
${indent}  }
${indent}
${indent}  metadata(meta: Record<string, unknown>): this {
${indent}    this.receipt.metadata = meta;
${indent}    return this;
${indent}  }
${indent}
${indent}  provenance(prov: ActionReceipt['provenance']): this {
${indent}    this.receipt.provenance = prov;
${indent}    return this;
${indent}  }
${indent}
${indent}  success(): void {
${indent}    this.receipt.status = 'success';
${indent}    this.logger.logAction(this.receipt as ActionReceipt);
${indent}  }
${indent}
${indent}  failure(error: Error | string): void {
${indent}    this.receipt.status = 'failure';
${indent}    if (error instanceof Error) {
${indent}      this.receipt.error_type = error.name;
${indent}      this.receipt.error_message = error.message;
${indent}      this.receipt.stack_trace = error.stack;
${indent}    } else {
${indent}      this.receipt.error_message = error;
${indent}    }
${indent}    this.logger.logFailure(this.receipt as ActionReceipt);
${indent}  }
${indent}}
${indent}
${indent}// Export singleton instance
${indent}export const AuditLogger = new AuditLoggerImpl();
${indent}
${indent}// Export for advanced usage
${indent}export { AuditLoggerImpl, ReceiptBuilder };
`;
}

/**
 * Generate withRetry utility function
 */
export function generateWithRetryUtility(indent: string = ''): string {
  return `
${indent}/**
${indent} * F.A.I.L. Kit Retry Utility
${indent} * 
${indent} * Wraps async functions with retry logic and exponential backoff.
${indent} */
${indent}
${indent}interface RetryOptions {
${indent}  maxRetries?: number;
${indent}  initialDelayMs?: number;
${indent}  backoffMultiplier?: number;
${indent}  maxDelayMs?: number;
${indent}  onRetry?: (error: Error, attempt: number) => void;
${indent}  onFinalFailure?: (error: Error) => void;
${indent}  retryIf?: (error: Error) => boolean;
${indent}}
${indent}
${indent}const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'onFinalFailure' | 'retryIf'>> = {
${indent}  maxRetries: 3,
${indent}  initialDelayMs: 1000,
${indent}  backoffMultiplier: 2,
${indent}  maxDelayMs: 30000,
${indent}};
${indent}
${indent}export async function withRetry<T>(
${indent}  fn: () => Promise<T>,
${indent}  options: RetryOptions = {}
${indent}): Promise<T> {
${indent}  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
${indent}  let lastError: Error | undefined;
${indent}  let delay = opts.initialDelayMs;
${indent}
${indent}  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
${indent}    try {
${indent}      return await fn();
${indent}    } catch (error) {
${indent}      lastError = error instanceof Error ? error : new Error(String(error));
${indent}      
${indent}      // Check if we should retry
${indent}      if (opts.retryIf && !opts.retryIf(lastError)) {
${indent}        throw lastError;
${indent}      }
${indent}      
${indent}      // If this was the last attempt, don't retry
${indent}      if (attempt > opts.maxRetries) {
${indent}        break;
${indent}      }
${indent}      
${indent}      // Call onRetry callback
${indent}      if (opts.onRetry) {
${indent}        opts.onRetry(lastError, attempt);
${indent}      }
${indent}      
${indent}      // Wait before retrying
${indent}      await new Promise(resolve => setTimeout(resolve, delay));
${indent}      
${indent}      // Increase delay with backoff
${indent}      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
${indent}    }
${indent}  }
${indent}
${indent}  // All retries exhausted
${indent}  if (opts.onFinalFailure && lastError) {
${indent}    opts.onFinalFailure(lastError);
${indent}  }
${indent}  
${indent}  throw lastError;
${indent}}
${indent}
${indent}/**
${indent} * Create a timeout promise race
${indent} */
${indent}export async function withTimeout<T>(
${indent}  fn: () => Promise<T>,
${indent}  timeoutMs: number,
${indent}  timeoutError?: Error
${indent}): Promise<T> {
${indent}  return Promise.race([
${indent}    fn(),
${indent}    new Promise<never>((_, reject) => 
${indent}      setTimeout(
${indent}        () => reject(timeoutError || new Error(\`Operation timed out after \${timeoutMs}ms\`)),
${indent}        timeoutMs
${indent}      )
${indent}    ),
${indent}  ]);
${indent}}
`;
}

/**
 * Generate blueprint for creating AuditLogger file
 */
export const generateAuditLoggerFileBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  const code = generateAuditLoggerClass(context.indent);

  return {
    id: `audit-logger-file-${Date.now()}`,
    name: 'Create AuditLogger Utility',
    description: 'Generate the complete AuditLogger class with receipt building capabilities',
    code,
    insertPosition: 'after',
    confidence: 100,
    impact: 'safe',
    requiredImports: [],
    tags: ['audit-logger', 'utility', 'scaffolding'],
  };
};

/**
 * Generate side-effect confirmation blueprint (FK004)
 */
export const generateSideEffectConfirmationBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  if (issue.ruleId !== 'FK004') {
    return null;
  }

  const code = `
${context.indent}// F.A.I.L. Kit: Require confirmation for destructive operation
${context.indent}const actionDescription = {
${context.indent}  type: '${context.operationType}',
${context.indent}  tool: '${context.toolName}',
${context.indent}  isDestructive: true,
${context.indent}  requiresApproval: true,
${context.indent}};
${context.indent}
${context.indent}const confirmed = await confirmAction?.(actionDescription) ?? 
${context.indent}  (typeof policy !== 'undefined' && policy.autoApprove?.includes('${context.toolName}'));
${context.indent}
${context.indent}if (!confirmed) {
${context.indent}  AuditLogger.logAction({
${context.indent}    action_id: \`blocked_\${Date.now().toString(36)}\`,
${context.indent}    tool_name: '${context.toolName}',
${context.indent}    operation: '${context.operationType}',
${context.indent}    timestamp: new Date().toISOString(),
${context.indent}    status: 'failure',
${context.indent}    error_type: 'ConfirmationDenied',
${context.indent}    error_message: 'Destructive operation blocked - user confirmation required',
${context.indent}  });
${context.indent}  
${context.indent}  throw new Error('Operation cancelled: User confirmation required for ${context.operationType}');
${context.indent}}
${context.indent}
${context.indent}// Proceed with confirmed operation
${context.indent}${context.originalCode.trim()}
`;

  return {
    id: `side-effect-confirm-${context.toolName}-${Date.now()}`,
    name: `Confirmation Gate: ${context.toolName}`,
    description: `Require user confirmation before ${context.operationType} operation`,
    code,
    insertPosition: 'replace',
    confidence: 85,
    impact: 'moderate',
    requiredImports: [
      { module: '@fail-kit/core', named: ['AuditLogger'] },
    ],
    tags: ['confirmation', 'side-effect', 'destructive', context.toolCategory],
  };
};

/**
 * Generate provenance metadata blueprint (FK006)
 */
export const generateProvenanceBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  if (issue.ruleId !== 'FK006') {
    return null;
  }

  const code = `
${context.indent}// F.A.I.L. Kit: Add provenance metadata for audit trail
${context.indent}const provenance = {
${context.indent}  action_id: AuditLogger.generateActionId('${context.toolCategory}'),
${context.indent}  timestamp: new Date().toISOString(),
${context.indent}  trace_id: context?.traceId ?? request?.headers?.['x-trace-id'],
${context.indent}  parent_action_id: context?.parentActionId,
${context.indent}  user_id: context?.userId ?? session?.userId,
${context.indent}  session_id: context?.sessionId ?? session?.id,
${context.indent}  source: {
${context.indent}    file: __filename,
${context.indent}    function: '${context.functionName || 'anonymous'}',
${context.indent}    line: ${context.line + 1},
${context.indent}  },
${context.indent}};
${context.indent}
${context.indent}// Attach provenance to the operation
${context.indent}const operationWithProvenance = {
${context.indent}  ...${context.variableName || 'input'},
${context.indent}  _provenance: provenance,
${context.indent}};
`;

  return {
    id: `provenance-${context.toolName}-${Date.now()}`,
    name: `Provenance Metadata: ${context.toolName}`,
    description: `Add action_id, timestamp, and trace_id for audit trail`,
    code,
    insertPosition: 'before',
    confidence: 90,
    impact: 'safe',
    requiredImports: [
      { module: '@fail-kit/core', named: ['AuditLogger'] },
    ],
    tags: ['provenance', 'tracing', 'audit', context.toolCategory],
  };
};

/**
 * Generate secret remediation blueprint (FK003/FK007)
 */
export const generateSecretRemediationBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  if (issue.ruleId !== 'FK003' && issue.ruleId !== 'FK007') {
    return null;
  }

  // Extract variable name from the code
  const varMatch = context.originalCode.match(/(?:const|let|var)\s+(\w+)\s*=/);
  const varName = varMatch?.[1] || 'secret';
  const envVarName = varName.toUpperCase().replace(/([a-z])([A-Z])/g, '$1_$2');

  const code = `
${context.indent}// F.A.I.L. Kit: Secret remediation - use environment variable
${context.indent}const ${varName} = process.env.${envVarName};
${context.indent}
${context.indent}if (!${varName}) {
${context.indent}  throw new Error(
${context.indent}    'Missing required environment variable: ${envVarName}. ' +
${context.indent}    'Add it to your .env file or environment configuration.'
${context.indent}  );
${context.indent}}
${context.indent}
${context.indent}// IMPORTANT: Add ${envVarName} to your .env file:
${context.indent}// ${envVarName}=your-secret-value-here
${context.indent}//
${context.indent}// And add to .gitignore:
${context.indent}// .env
${context.indent}// .env.local
`;

  return {
    id: `secret-remediation-${Date.now()}`,
    name: `Secret Remediation: ${varName}`,
    description: `Replace hardcoded secret with environment variable`,
    code,
    insertPosition: 'replace',
    confidence: 95,
    impact: 'moderate',
    requiredImports: [],
    tags: ['secret', 'security', 'environment-variable'],
  };
};
