/**
 * F.A.I.L. Kit Core - Receipt Validator
 *
 * Validates action receipts against the F.A.I.L. Kit schema.
 */

import { ActionReceipt, ActionStatus } from './receipt';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  missingFields: string[];
  warnings: string[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Require all optional fields */
  strict?: boolean;
  /** Custom validators */
  customValidators?: CustomValidator[];
}

/**
 * Custom validator function
 */
export type CustomValidator = (receipt: ActionReceipt) => ValidationError | null;

/**
 * Required fields for a valid receipt
 */
const REQUIRED_FIELDS = [
  'action_id',
  'tool_name',
  'timestamp',
  'status',
  'input_hash',
  'output_hash',
] as const;

/**
 * Valid status values
 */
const VALID_STATUSES: ActionStatus[] = ['success', 'failure', 'partial', 'pending', 'timeout'];

/**
 * Hash pattern: sha256:<64 hex chars>
 */
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

/**
 * ISO 8601 timestamp pattern
 */
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/**
 * Action ID pattern: prefix_timestamp_random
 */
const ACTION_ID_PATTERN = /^[a-z]+_[a-z0-9]+_[a-f0-9]+$/;

/**
 * Validate an action receipt
 */
export function validateReceipt(
  receipt: unknown,
  options: ValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Check if receipt is an object
  if (!receipt || typeof receipt !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'receipt', message: 'Receipt must be an object' }],
      missingFields: [...REQUIRED_FIELDS],
      warnings: [],
    };
  }

  const r = receipt as Record<string, unknown>;

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (r[field] === undefined || r[field] === null) {
      missingFields.push(field);
      errors.push({
        field,
        message: `Missing required field: ${field}`,
      });
    }
  }

  // Validate action_id format
  if (r.action_id !== undefined) {
    if (typeof r.action_id !== 'string') {
      errors.push({
        field: 'action_id',
        message: 'action_id must be a string',
        value: r.action_id,
      });
    } else if (!ACTION_ID_PATTERN.test(r.action_id)) {
      warnings.push(`action_id '${r.action_id}' does not match recommended format`);
    }
  }

  // Validate tool_name
  if (r.tool_name !== undefined) {
    if (typeof r.tool_name !== 'string') {
      errors.push({
        field: 'tool_name',
        message: 'tool_name must be a string',
        value: r.tool_name,
      });
    } else if (r.tool_name.length === 0) {
      errors.push({
        field: 'tool_name',
        message: 'tool_name cannot be empty',
      });
    }
  }

  // Validate timestamp format
  if (r.timestamp !== undefined) {
    if (typeof r.timestamp !== 'string') {
      errors.push({
        field: 'timestamp',
        message: 'timestamp must be a string',
        value: r.timestamp,
      });
    } else if (!TIMESTAMP_PATTERN.test(r.timestamp)) {
      errors.push({
        field: 'timestamp',
        message: 'timestamp must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        value: r.timestamp,
      });
    } else {
      // Check if timestamp is valid date
      const date = new Date(r.timestamp);
      if (isNaN(date.getTime())) {
        errors.push({
          field: 'timestamp',
          message: 'timestamp is not a valid date',
          value: r.timestamp,
        });
      }
    }
  }

  // Validate status
  if (r.status !== undefined) {
    if (typeof r.status !== 'string') {
      errors.push({
        field: 'status',
        message: 'status must be a string',
        value: r.status,
      });
    } else if (!VALID_STATUSES.includes(r.status as ActionStatus)) {
      errors.push({
        field: 'status',
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        value: r.status,
      });
    }
  }

  // Validate input_hash format
  if (r.input_hash !== undefined) {
    if (typeof r.input_hash !== 'string') {
      errors.push({
        field: 'input_hash',
        message: 'input_hash must be a string',
        value: r.input_hash,
      });
    } else if (!HASH_PATTERN.test(r.input_hash)) {
      errors.push({
        field: 'input_hash',
        message: 'input_hash must be a SHA-256 hash prefixed with "sha256:"',
        value: r.input_hash,
      });
    }
  }

  // Validate output_hash format
  if (r.output_hash !== undefined) {
    if (typeof r.output_hash !== 'string') {
      errors.push({
        field: 'output_hash',
        message: 'output_hash must be a string',
        value: r.output_hash,
      });
    } else if (!HASH_PATTERN.test(r.output_hash)) {
      errors.push({
        field: 'output_hash',
        message: 'output_hash must be a SHA-256 hash prefixed with "sha256:"',
        value: r.output_hash,
      });
    }
  }

  // Validate optional fields
  if (r.proof !== undefined && typeof r.proof !== 'string') {
    errors.push({
      field: 'proof',
      message: 'proof must be a string',
      value: r.proof,
    });
  }

  if (r.metadata !== undefined && (typeof r.metadata !== 'object' || r.metadata === null)) {
    errors.push({
      field: 'metadata',
      message: 'metadata must be an object',
      value: r.metadata,
    });
  }

  if (r.duration_ms !== undefined) {
    if (typeof r.duration_ms !== 'number') {
      errors.push({
        field: 'duration_ms',
        message: 'duration_ms must be a number',
        value: r.duration_ms,
      });
    } else if (r.duration_ms < 0) {
      errors.push({
        field: 'duration_ms',
        message: 'duration_ms cannot be negative',
        value: r.duration_ms,
      });
    }
  }

  // Validate error object
  if (r.error !== undefined) {
    if (typeof r.error !== 'object' || r.error === null) {
      errors.push({
        field: 'error',
        message: 'error must be an object',
        value: r.error,
      });
    } else {
      const err = r.error as Record<string, unknown>;
      if (typeof err.code !== 'string') {
        errors.push({
          field: 'error.code',
          message: 'error.code must be a string',
        });
      }
      if (typeof err.message !== 'string') {
        errors.push({
          field: 'error.message',
          message: 'error.message must be a string',
        });
      }
    }
  }

  // Run custom validators
  if (options.customValidators) {
    for (const validator of options.customValidators) {
      const error = validator(r as unknown as ActionReceipt);
      if (error) {
        errors.push(error);
      }
    }
  }

  // Strict mode: check for recommended fields
  if (options.strict) {
    if (!r.proof) {
      warnings.push('Missing recommended field: proof');
    }
    if (!r.duration_ms) {
      warnings.push('Missing recommended field: duration_ms');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    missingFields,
    warnings,
  };
}

/**
 * Receipt Validator class
 */
export class ReceiptValidator {
  private receipt: unknown;
  private options: ValidationOptions;
  private result?: ValidationResult;

  constructor(receipt: unknown, options: ValidationOptions = {}) {
    this.receipt = receipt;
    this.options = options;
  }

  /**
   * Validate the receipt
   */
  validate(): ValidationResult {
    this.result = validateReceipt(this.receipt, this.options);
    return this.result;
  }

  /**
   * Check if valid (validates if not already done)
   */
  isValid(): boolean {
    if (!this.result) {
      this.validate();
    }
    return this.result!.valid;
  }

  /**
   * Get errors
   */
  getErrors(): ValidationError[] {
    if (!this.result) {
      this.validate();
    }
    return this.result!.errors;
  }

  /**
   * Get missing fields
   */
  getMissingFields(): string[] {
    if (!this.result) {
      this.validate();
    }
    return this.result!.missingFields;
  }

  /**
   * Throw if invalid
   */
  assertValid(): void {
    if (!this.isValid()) {
      const errors = this.getErrors()
        .map(e => `${e.field}: ${e.message}`)
        .join('; ');
      throw new Error(`Invalid receipt: ${errors}`);
    }
  }
}

/**
 * Quick validation check
 */
export function isValidReceipt(receipt: unknown): boolean {
  return validateReceipt(receipt).valid;
}

/**
 * Validate and throw if invalid
 */
export function assertValidReceipt(receipt: unknown): asserts receipt is ActionReceipt {
  const result = validateReceipt(receipt);
  if (!result.valid) {
    const errors = result.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    throw new Error(`Invalid receipt: ${errors}`);
  }
}

// ============================================
// NEW v1.6.0: Compliance-Aware Validation
// ============================================

export interface ComplianceValidationOptions extends ValidationOptions {
  /** Required compliance frameworks */
  requiredFrameworks?: ('soc2' | 'pciDss' | 'hipaa' | 'gdpr')[];
  /** Require proof field for audit trail */
  requireProof?: boolean;
  /** Require duration tracking */
  requireDuration?: boolean;
  /** Require signature for tamper detection */
  requireSignature?: boolean;
}

/**
 * Validate receipt against compliance requirements
 */
export function validateForCompliance(
  receipt: unknown,
  options: ComplianceValidationOptions = {}
): ValidationResult {
  // Start with standard validation
  const baseResult = validateReceipt(receipt, options);
  
  if (!baseResult.valid) {
    return baseResult;
  }

  const r = receipt as ActionReceipt;
  const errors: ValidationError[] = [...baseResult.errors];
  const warnings: string[] = [...baseResult.warnings];

  // SOC2 compliance: requires proof and duration
  if (options.requiredFrameworks?.includes('soc2')) {
    if (!r.proof) {
      if (options.requireProof !== false) {
        errors.push({
          field: 'proof',
          message: 'SOC2 compliance requires proof field for audit trail',
        });
      } else {
        warnings.push('SOC2: Missing proof field (recommended for CC7.2)');
      }
    }
    if (!r.duration_ms) {
      warnings.push('SOC2: Missing duration_ms (recommended for performance monitoring)');
    }
  }

  // PCI-DSS compliance: requires complete audit trail
  if (options.requiredFrameworks?.includes('pciDss')) {
    if (!r.proof) {
      warnings.push('PCI-DSS 10.3: Missing proof field for audit trail');
    }
    if (!r.metadata) {
      warnings.push('PCI-DSS 10.2.2: Missing metadata for transaction details');
    }
  }

  // HIPAA compliance: requires complete provenance
  if (options.requiredFrameworks?.includes('hipaa')) {
    if (!r.proof) {
      errors.push({
        field: 'proof',
        message: 'HIPAA 164.312(b) requires proof field for audit controls',
      });
    }
    if (!r.metadata?.user_id && !r.metadata?.session_id) {
      warnings.push('HIPAA: Missing user context in metadata');
    }
  }

  // GDPR compliance: data processing proof
  if (options.requiredFrameworks?.includes('gdpr')) {
    if (!r.proof) {
      warnings.push('GDPR Art. 30: Missing proof for processing records');
    }
  }

  // General compliance options
  if (options.requireProof && !r.proof) {
    errors.push({
      field: 'proof',
      message: 'Proof field is required for compliance',
    });
  }

  if (options.requireDuration && !r.duration_ms) {
    errors.push({
      field: 'duration_ms',
      message: 'Duration tracking is required for compliance',
    });
  }

  if (options.requireSignature && !r.signature) {
    errors.push({
      field: 'signature',
      message: 'Cryptographic signature is required for tamper detection',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    missingFields: baseResult.missingFields,
    warnings,
  };
}

/**
 * Compliance Validator class
 */
export class ComplianceValidator extends ReceiptValidator {
  private complianceOptions: ComplianceValidationOptions;

  constructor(receipt: unknown, options: ComplianceValidationOptions = {}) {
    super(receipt, options);
    this.complianceOptions = options;
  }

  /**
   * Validate for specific compliance framework
   */
  validateForFramework(framework: 'soc2' | 'pciDss' | 'hipaa' | 'gdpr'): ValidationResult {
    return validateForCompliance(this['receipt'], {
      ...this.complianceOptions,
      requiredFrameworks: [framework],
    });
  }

  /**
   * Check if receipt meets SOC2 requirements
   */
  isSOC2Compliant(): boolean {
    return this.validateForFramework('soc2').valid;
  }

  /**
   * Check if receipt meets PCI-DSS requirements
   */
  isPCIDSSCompliant(): boolean {
    return this.validateForFramework('pciDss').valid;
  }

  /**
   * Check if receipt meets HIPAA requirements
   */
  isHIPAACompliant(): boolean {
    return this.validateForFramework('hipaa').valid;
  }

  /**
   * Check if receipt meets GDPR requirements
   */
  isGDPRCompliant(): boolean {
    return this.validateForFramework('gdpr').valid;
  }

  /**
   * Get compliance status for all frameworks
   */
  getComplianceStatus(): Record<string, { compliant: boolean; warnings: string[] }> {
    const frameworks = ['soc2', 'pciDss', 'hipaa', 'gdpr'] as const;
    const status: Record<string, { compliant: boolean; warnings: string[] }> = {};

    for (const framework of frameworks) {
      const result = this.validateForFramework(framework);
      status[framework] = {
        compliant: result.valid,
        warnings: result.warnings,
      };
    }

    return status;
  }
}
