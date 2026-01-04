/**
 * F.A.I.L. Kit Core - Receipt Generator
 *
 * Generates action receipts for audit trails.
 * Follows the Action Receipt Schema specification.
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Action status enum
 */
export type ActionStatus = 'success' | 'failure' | 'partial' | 'pending' | 'timeout';

/**
 * Action Receipt following the F.A.I.L. Kit schema
 */
export interface ActionReceipt {
  /** Unique identifier for the action */
  action_id: string;
  /** Name of the tool that performed the action */
  tool_name: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Result status */
  status: ActionStatus;
  /** SHA-256 hash of input data (prefixed with 'sha256:') */
  input_hash: string;
  /** SHA-256 hash of output data (prefixed with 'sha256:') */
  output_hash: string;
  /** Optional human-readable proof description */
  proof?: string;
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
  /** Optional error information */
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  /** Optional duration in milliseconds */
  duration_ms?: number;
  /** Optional cryptographic signature */
  signature?: string;
}

/**
 * Options for receipt generation
 */
export interface ReceiptOptions {
  /** Tool name performing the action */
  toolName: string;
  /** Input data to hash */
  input: unknown;
  /** Output/result data to hash */
  output?: unknown;
  /** Action status */
  status?: ActionStatus;
  /** Optional proof description */
  proof?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Optional error */
  error?: Error | null;
  /** Optional start time (for duration calculation) */
  startTime?: number;
  /** Optional private key for signing */
  privateKey?: string;
}

/**
 * Hash data using SHA-256
 */
export function hashData(data: unknown): string {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  const hash = createHash('sha256').update(json).digest('hex');
  return `sha256:${hash}`;
}

/**
 * Generate a unique action ID
 */
export function generateActionId(prefix: string = 'act'): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Create an action receipt
 */
export function createReceipt(options: ReceiptOptions): ActionReceipt {
  const {
    toolName,
    input,
    output,
    status = 'success',
    proof,
    metadata,
    error,
    startTime,
  } = options;

  const receipt: ActionReceipt = {
    action_id: generateActionId(),
    tool_name: toolName,
    timestamp: new Date().toISOString(),
    status,
    input_hash: hashData(input),
    output_hash: hashData(output ?? null),
  };

  if (proof) {
    receipt.proof = proof;
  }

  if (metadata) {
    receipt.metadata = metadata;
  }

  if (error) {
    receipt.error = {
      code: error.name || 'ERROR',
      message: error.message,
      stack: error.stack,
    };
  }

  if (startTime) {
    receipt.duration_ms = Date.now() - startTime;
  }

  return receipt;
}

/**
 * Receipt Builder for fluent API
 */
export class ReceiptGenerator {
  private options: Partial<ReceiptOptions> = {};

  /**
   * Set the tool name
   */
  tool(name: string): this {
    this.options.toolName = name;
    return this;
  }

  /**
   * Set the action name (alias for tool)
   */
  action(name: string): this {
    return this.tool(name);
  }

  /**
   * Set the input data
   */
  input(data: unknown): this {
    this.options.input = data;
    return this;
  }

  /**
   * Set the output data
   */
  output(data: unknown): this {
    this.options.output = data;
    return this;
  }

  /**
   * Set the status
   */
  status(status: ActionStatus): this {
    this.options.status = status;
    return this;
  }

  /**
   * Mark as successful
   */
  success(): this {
    return this.status('success');
  }

  /**
   * Mark as failed
   */
  failure(error?: Error): this {
    this.options.status = 'failure';
    if (error) {
      this.options.error = error;
    }
    return this;
  }

  /**
   * Add proof description
   */
  proof(description: string): this {
    this.options.proof = description;
    return this;
  }

  /**
   * Add metadata
   */
  metadata(data: Record<string, unknown>): this {
    this.options.metadata = { ...this.options.metadata, ...data };
    return this;
  }

  /**
   * Set start time for duration calculation
   */
  startedAt(time: number): this {
    this.options.startTime = time;
    return this;
  }

  /**
   * Start timing now
   */
  startTimer(): this {
    return this.startedAt(Date.now());
  }

  /**
   * Build the receipt
   */
  build(): ActionReceipt {
    if (!this.options.toolName) {
      throw new Error('Tool name is required');
    }
    if (this.options.input === undefined) {
      throw new Error('Input data is required');
    }

    return createReceipt(this.options as ReceiptOptions);
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.options = {};
    return this;
  }
}

/**
 * Create a new receipt generator
 */
export function receipt(): ReceiptGenerator {
  return new ReceiptGenerator();
}

/**
 * Higher-order function to wrap any function with receipt generation
 */
export function withReceipt<T extends (...args: unknown[]) => unknown>(
  toolName: string,
  fn: T,
  options?: { captureArgs?: boolean }
): (...args: Parameters<T>) => Promise<{ result: ReturnType<T>; receipt: ActionReceipt }> {
  return async (...args: Parameters<T>) => {
    const startTime = Date.now();
    let result: ReturnType<T>;
    let error: Error | null = null;

    try {
      result = (await fn(...args)) as ReturnType<T>;
    } catch (e) {
      error = e as Error;
      throw e;
    } finally {
      const receiptOptions: ReceiptOptions = {
        toolName,
        input: options?.captureArgs ? args : hashData(args),
        output: error ? null : result!,
        status: error ? 'failure' : 'success',
        error,
        startTime,
      };

      const receipt = createReceipt(receiptOptions);

      if (!error) {
        return { result: result!, receipt };
      }
    }

    // TypeScript needs this unreachable return for type checking
    throw error;
  };
}

/**
 * Decorator for class methods to generate receipts
 */
export function ReceiptGenerating(toolName: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const startTime = Date.now();
      let result: unknown;
      let error: Error | null = null;

      try {
        result = await originalMethod.apply(this, args);
        return result;
      } catch (e) {
        error = e as Error;
        throw e;
      } finally {
        const receipt = createReceipt({
          toolName,
          input: args,
          output: result,
          status: error ? 'failure' : 'success',
          error,
          startTime,
        });

        // Attach receipt to result if it's an object
        if (result && typeof result === 'object') {
          (result as Record<string, unknown>).__receipt = receipt;
        }
      }
    };

    return descriptor;
  };
}

// ============================================
// NEW v1.6.0: Signed Receipt Support
// ============================================

/**
 * Sign a receipt for tamper detection
 */
export function signReceipt(receipt: ActionReceipt, key: string = 'fail-kit'): ActionReceipt {
  const { createHmac } = require('crypto');
  const dataToSign = JSON.stringify({
    action_id: receipt.action_id,
    tool_name: receipt.tool_name,
    timestamp: receipt.timestamp,
    status: receipt.status,
    input_hash: receipt.input_hash,
    output_hash: receipt.output_hash,
  });
  
  const signature = createHmac('sha256', key).update(dataToSign).digest('hex');
  
  return {
    ...receipt,
    signature,
  };
}

/**
 * Verify a signed receipt
 */
export function verifyReceiptSignature(receipt: ActionReceipt, key: string = 'fail-kit'): boolean {
  if (!receipt.signature) {
    return false;
  }
  
  const { createHmac } = require('crypto');
  const dataToSign = JSON.stringify({
    action_id: receipt.action_id,
    tool_name: receipt.tool_name,
    timestamp: receipt.timestamp,
    status: receipt.status,
    input_hash: receipt.input_hash,
    output_hash: receipt.output_hash,
  });
  
  const expectedSignature = createHmac('sha256', key).update(dataToSign).digest('hex');
  
  return receipt.signature === expectedSignature;
}

/**
 * Create a signed receipt
 */
export function createSignedReceipt(options: ReceiptOptions & { signingKey?: string }): ActionReceipt {
  const receipt = createReceipt(options);
  return signReceipt(receipt, options.signingKey);
}

/**
 * Extended Receipt Generator with signing support
 */
export class SignedReceiptGenerator extends ReceiptGenerator {
  private signingKey?: string;

  /**
   * Set the signing key
   */
  withKey(key: string): this {
    this.signingKey = key;
    return this;
  }

  /**
   * Build a signed receipt
   */
  buildSigned(): ActionReceipt {
    const receipt = this.build();
    return signReceipt(receipt, this.signingKey);
  }
}

/**
 * Create a new signed receipt generator
 */
export function signedReceipt(): SignedReceiptGenerator {
  return new SignedReceiptGenerator();
}

// ============================================
// NEW v1.6.0: Provenance Helpers
// ============================================

export interface ProvenanceContext {
  action_id?: string;
  trace_id?: string;
  correlation_id?: string;
  user_id?: string;
  session_id?: string;
  timestamp?: string;
}

/**
 * Generate provenance context for agent actions
 */
export function generateProvenanceContext(options: {
  userId?: string;
  sessionId?: string;
  traceId?: string;
} = {}): ProvenanceContext {
  return {
    action_id: generateActionId(),
    timestamp: new Date().toISOString(),
    trace_id: options.traceId || generateActionId('trace'),
    correlation_id: generateActionId('corr'),
    user_id: options.userId,
    session_id: options.sessionId,
  };
}

/**
 * Add provenance to receipt metadata
 */
export function addProvenanceToReceipt(
  receipt: ActionReceipt,
  context: ProvenanceContext
): ActionReceipt {
  return {
    ...receipt,
    metadata: {
      ...receipt.metadata,
      provenance: context,
    },
  };
}
