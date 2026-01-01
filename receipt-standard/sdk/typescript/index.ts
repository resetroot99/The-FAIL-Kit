import crypto from 'crypto';

export interface ActionReceipt {
  action_id: string;
  tool_name: string;
  timestamp: string;
  status: 'success' | 'failed';
  input_hash: string;
  output_hash: string;
  trace_id?: string;
  latency_ms?: number;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Validate a receipt against the schema
 */
export function validateReceipt(receipt: any): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!receipt.action_id) errors.push('Missing action_id');
  if (!receipt.tool_name) errors.push('Missing tool_name');
  if (!receipt.timestamp) errors.push('Missing timestamp');
  if (!receipt.status) errors.push('Missing status');
  if (!receipt.input_hash) errors.push('Missing input_hash');
  if (!receipt.output_hash) errors.push('Missing output_hash');

  // Validate action_id format
  if (receipt.action_id && !/^[a-zA-Z0-9_-]+$/.test(receipt.action_id)) {
    errors.push('Invalid action_id format');
  }

  // Validate timestamp format (ISO-8601)
  if (receipt.timestamp && isNaN(Date.parse(receipt.timestamp))) {
    errors.push('Invalid timestamp format (must be ISO-8601)');
  }

  // Validate status enum
  if (receipt.status && !['success', 'failed'].includes(receipt.status)) {
    errors.push('Invalid status (must be "success" or "failed")');
  }

  // Validate hash format
  const hashPattern = /^sha256:[a-f0-9]{64}$/;
  if (receipt.input_hash && !hashPattern.test(receipt.input_hash)) {
    errors.push('Invalid input_hash format (must be sha256:...)');
  }
  if (receipt.output_hash && !hashPattern.test(receipt.output_hash)) {
    errors.push('Invalid output_hash format (must be sha256:...)');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Generate SHA256 hash of data
 */
function hashData(data: any): string {
  const json = JSON.stringify(data, Object.keys(data).sort());
  const hash = crypto.createHash('sha256').update(json).digest('hex');
  return `sha256:${hash}`;
}

/**
 * Generate a unique action ID
 */
function generateActionId(): string {
  return `act_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Generate a receipt from tool invocation data
 */
export function generateReceipt(params: {
  toolName: string;
  input: any;
  output: any;
  status: 'success' | 'failed';
  traceId?: string;
  latencyMs?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}): ActionReceipt {
  return {
    action_id: generateActionId(),
    tool_name: params.toolName,
    timestamp: new Date().toISOString(),
    status: params.status,
    input_hash: hashData(params.input),
    output_hash: hashData(params.output),
    trace_id: params.traceId,
    latency_ms: params.latencyMs,
    error_message: params.errorMessage,
    metadata: params.metadata
  };
}

/**
 * Verify that two receipts have the same input/output
 */
export function receiptsMatch(receipt1: ActionReceipt, receipt2: ActionReceipt): boolean {
  return (
    receipt1.input_hash === receipt2.input_hash &&
    receipt1.output_hash === receipt2.output_hash &&
    receipt1.tool_name === receipt2.tool_name
  );
}

/**
 * Check if receipt proves a specific action was taken
 */
export function provesAction(receipt: ActionReceipt, expectedToolName: string): boolean {
  return (
    receipt.tool_name === expectedToolName &&
    receipt.status === 'success' &&
    validateReceipt(receipt).valid
  );
}
