/**
 * F.A.I.L. Kit Receipt Validator
 *
 * Validates receipt patterns against RECEIPT_SCHEMA.json requirements.
 * Checks that tool calls produce receipts with required fields.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * RECEIPT_SCHEMA.json embedded for standalone operation
 * This matches the schema at the root of the repository
 */
const RECEIPT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Action Receipt Schema',
  type: 'object',
  required: [
    'action_id',
    'tool_name',
    'timestamp',
    'status',
    'input_hash',
    'output_hash',
  ],
  properties: {
    action_id: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_-]+$',
    },
    tool_name: {
      type: 'string',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
    status: {
      type: 'string',
      enum: ['success', 'failed'],
    },
    input_hash: {
      type: 'string',
      pattern: '^sha256:[a-f0-9]{64}$',
    },
    output_hash: {
      type: 'string',
      pattern: '^sha256:[a-f0-9]{64}$',
    },
    trace_id: {
      type: 'string',
    },
    latency_ms: {
      type: 'integer',
      minimum: 0,
    },
    error_message: {
      type: 'string',
    },
    metadata: {
      type: 'object',
      additionalProperties: true,
    },
  },
  additionalProperties: false,
};

export interface ReceiptValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingFields: string[];
}

export interface ReceiptCheck {
  found: boolean;
  location?: number;
  line?: number;
  hasRequiredFields: boolean;
  missingFields: string[];
}

// Initialize AJV validator
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateReceipt = ajv.compile(RECEIPT_SCHEMA);

/**
 * Required fields for a valid receipt
 */
export const REQUIRED_RECEIPT_FIELDS = [
  'action_id',
  'tool_name',
  'timestamp',
  'status',
  'input_hash',
  'output_hash',
];

/**
 * Patterns that indicate receipt generation
 */
const RECEIPT_GENERATION_PATTERNS = [
  // Function calls
  /createReceipt\s*\(/,
  /generateReceipt\s*\(/,
  /buildReceipt\s*\(/,
  /makeReceipt\s*\(/,

  // Hash generation (part of receipt)
  /hashData\s*\(/,
  /createHash\s*\(\s*['"]sha256['"]\s*\)/,

  // Receipt object literals
  /\{\s*action_id\s*:/,
  /\{\s*tool_name\s*:/,

  // Type annotations
  /:\s*ActionReceipt\b/,
  /as\s+ActionReceipt\b/,
  /<ActionReceipt>/,

  // Class usage
  /ReceiptGeneratingTool/,
  /extends\s+ReceiptGeneratingTool/,
  /wrapToolWithReceipts\s*\(/,

  // F.A.I.L. Kit specific
  /extractReceiptsFromAgentExecutor\s*\(/,
  /FailKitResponse/,
];

/**
 * Patterns that indicate receipt fields are present
 */
const FIELD_PATTERNS: Record<string, RegExp[]> = {
  action_id: [/action_id\s*:/, /actionId\s*:/, /"action_id"\s*:/],
  tool_name: [/tool_name\s*:/, /toolName\s*:/, /"tool_name"\s*:/],
  timestamp: [/timestamp\s*:/, /"timestamp"\s*:/, /new\s+Date\(\)\.toISOString\(\)/],
  status: [/status\s*:\s*['"]?(success|failed)['"]?/, /"status"\s*:/],
  input_hash: [/input_hash\s*:/, /inputHash\s*:/, /"input_hash"\s*:/],
  output_hash: [/output_hash\s*:/, /outputHash\s*:/, /"output_hash"\s*:/],
};

/**
 * Check if code contains receipt generation near a position
 */
export function findReceiptPattern(
  code: string,
  startLine: number,
  lookAheadLines: number = 15
): ReceiptCheck {
  const lines = code.split('\n');
  const endLine = Math.min(startLine + lookAheadLines, lines.length);
  const codeSlice = lines.slice(startLine, endLine).join('\n');

  // Check for receipt generation patterns
  let found = false;
  let location: number | undefined;
  let line: number | undefined;

  for (const pattern of RECEIPT_GENERATION_PATTERNS) {
    const match = codeSlice.match(pattern);
    if (match && match.index !== undefined) {
      found = true;
      location = match.index;
      // Calculate actual line number
      const beforeMatch = codeSlice.substring(0, match.index);
      const lineOffset = (beforeMatch.match(/\n/g) || []).length;
      line = startLine + lineOffset;
      break;
    }
  }

  // Check which required fields are present
  const missingFields: string[] = [];
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
    const fieldFound = patterns.some((p) => p.test(codeSlice));
    if (!fieldFound) {
      missingFields.push(field);
    }
  }

  const hasRequiredFields = missingFields.length === 0;

  return {
    found,
    location,
    line,
    hasRequiredFields,
    missingFields,
  };
}

/**
 * Validate a receipt object against the schema
 */
export function validateReceiptObject(receipt: unknown): ReceiptValidationResult {
  const valid = validateReceipt(receipt);
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFields: string[] = [];

  if (!valid && validateReceipt.errors) {
    for (const error of validateReceipt.errors) {
      if (error.keyword === 'required') {
        const field = error.params.missingProperty as string;
        missingFields.push(field);
        errors.push(`Missing required field: ${field}`);
      } else if (error.keyword === 'pattern') {
        errors.push(`Invalid format for ${error.instancePath}: ${error.message}`);
      } else if (error.keyword === 'enum') {
        errors.push(`Invalid value for ${error.instancePath}: ${error.message}`);
      } else {
        errors.push(`${error.instancePath}: ${error.message}`);
      }
    }
  }

  // Check for best practices (warnings)
  if (typeof receipt === 'object' && receipt !== null) {
    const r = receipt as Record<string, unknown>;

    if (!r.trace_id) {
      warnings.push('Consider adding trace_id for request correlation');
    }
    if (!r.latency_ms) {
      warnings.push('Consider adding latency_ms for performance tracking');
    }
  }

  return {
    valid: valid as boolean,
    errors,
    warnings,
    missingFields,
  };
}

/**
 * Check if a function/class appears to generate receipts correctly
 */
export function analyzeReceiptGeneration(code: string): {
  generatesReceipts: boolean;
  hasAllRequiredFields: boolean;
  missingFields: string[];
  suggestions: string[];
} {
  const suggestions: string[] = [];
  const missingFields: string[] = [];

  // Check if any receipt patterns are present
  const generatesReceipts = RECEIPT_GENERATION_PATTERNS.some((p) => p.test(code));

  if (!generatesReceipts) {
    suggestions.push(
      'No receipt generation detected. Consider using ReceiptGeneratingTool or createReceipt()'
    );
    return {
      generatesReceipts: false,
      hasAllRequiredFields: false,
      missingFields: REQUIRED_RECEIPT_FIELDS,
      suggestions,
    };
  }

  // Check which fields are present
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
    const fieldFound = patterns.some((p) => p.test(code));
    if (!fieldFound) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    suggestions.push(
      `Receipt missing required fields: ${missingFields.join(', ')}`
    );
  }

  // Check hash format
  if (!missingFields.includes('input_hash')) {
    if (!/sha256:/.test(code)) {
      suggestions.push(
        'Hash values should use format "sha256:<64-char-hex>". Use hashData() helper.'
      );
    }
  }

  return {
    generatesReceipts,
    hasAllRequiredFields: missingFields.length === 0,
    missingFields,
    suggestions,
  };
}

/**
 * Get the schema for external use
 */
export function getReceiptSchema(): typeof RECEIPT_SCHEMA {
  return RECEIPT_SCHEMA;
}
