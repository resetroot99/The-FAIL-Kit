/**
 * F.A.I.L. Kit Rulepack Loader
 *
 * Handles loading and validation of rulepack JSON files.
 */

import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { IssueCategory, IssueSeverity } from '../analyzer';

// ============================================
// Rulepack Schema
// ============================================

export interface RulepackRule {
  id: string;
  name: string;
  description: string;
  pattern: string;  // Stored as string, converted to RegExp on load
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  fixHint: string;
  exampleFix?: string;
  docLink?: string;
  tags?: string[];
}

export interface Rulepack {
  $schema?: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  rules: RulepackRule[];
  metadata?: Record<string, unknown>;
}

export interface RulepackValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// Rulepack Loading
// ============================================

/**
 * Load rulepack from file path or URL
 */
export async function loadRulepack(source: string): Promise<Rulepack | null> {
  try {
    let content: string;

    if (source.startsWith('http://') || source.startsWith('https://')) {
      content = await fetchFromUrl(source);
    } else {
      content = fs.readFileSync(source, 'utf-8');
    }

    const rulepack = JSON.parse(content) as Rulepack;
    return rulepack;
  } catch (error) {
    console.error('Failed to load rulepack:', error);
    return null;
  }
}

/**
 * Fetch content from URL
 */
function fetchFromUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ============================================
// Rulepack Validation
// ============================================

const VALID_CATEGORIES: IssueCategory[] = [
  'receipt_missing',
  'error_handling',
  'policy_failed',
  'tool_error',
  'validation_failed',
  'audit_gap',
  'secret_exposure',
  'side_effect_unconfirmed',
  'llm_resilience',
  'provenance_missing',
  'hardcoded_credential',
];

const VALID_SEVERITIES: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];

/**
 * Validate rulepack structure and content
 */
export function validateRulepack(rulepack: Rulepack): RulepackValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!rulepack.name) {
    errors.push('Missing required field: name');
  }
  if (!rulepack.version) {
    errors.push('Missing required field: version');
  }
  if (!rulepack.rules || !Array.isArray(rulepack.rules)) {
    errors.push('Missing or invalid: rules array');
    return { valid: false, errors, warnings };
  }

  // Validate each rule
  const ruleIds = new Set<string>();

  for (let i = 0; i < rulepack.rules.length; i++) {
    const rule = rulepack.rules[i];
    const prefix = `Rule ${i + 1}`;

    // Required fields
    if (!rule.id) {
      errors.push(`${prefix}: Missing id`);
    } else if (ruleIds.has(rule.id)) {
      errors.push(`${prefix}: Duplicate id '${rule.id}'`);
    } else {
      ruleIds.add(rule.id);
    }

    if (!rule.name) {
      errors.push(`${prefix}: Missing name`);
    }

    if (!rule.pattern) {
      errors.push(`${prefix}: Missing pattern`);
    } else {
      // Validate pattern is valid regex
      try {
        new RegExp(rule.pattern);
      } catch (e) {
        errors.push(`${prefix}: Invalid regex pattern: ${rule.pattern}`);
      }
    }

    if (!rule.message) {
      errors.push(`${prefix}: Missing message`);
    }

    if (!rule.fixHint) {
      warnings.push(`${prefix}: Missing fixHint (recommended)`);
    }

    // Validate category
    if (rule.category && !VALID_CATEGORIES.includes(rule.category)) {
      warnings.push(`${prefix}: Unknown category '${rule.category}', defaulting to 'audit_gap'`);
    }

    // Validate severity
    if (rule.severity && !VALID_SEVERITIES.includes(rule.severity)) {
      warnings.push(`${prefix}: Unknown severity '${rule.severity}', defaulting to 'medium'`);
    }
  }

  // Check for empty rules
  if (rulepack.rules.length === 0) {
    warnings.push('Rulepack contains no rules');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// Rulepack Creation
// ============================================

/**
 * Create a new empty rulepack
 */
export function createRulepack(name: string, description: string): Rulepack {
  return {
    $schema: 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/schemas/rulepack.json',
    name,
    version: '1.0.0',
    description,
    rules: [],
  };
}

/**
 * Add rule to rulepack
 */
export function addRule(rulepack: Rulepack, rule: RulepackRule): Rulepack {
  return {
    ...rulepack,
    rules: [...rulepack.rules, rule],
  };
}

/**
 * Remove rule from rulepack
 */
export function removeRule(rulepack: Rulepack, ruleId: string): Rulepack {
  return {
    ...rulepack,
    rules: rulepack.rules.filter(r => r.id !== ruleId),
  };
}

/**
 * Export rulepack to JSON string
 */
export function exportRulepack(rulepack: Rulepack): string {
  return JSON.stringify(rulepack, null, 2);
}

// ============================================
// Rulepack JSON Schema
// ============================================

export const RULEPACK_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'F.A.I.L. Kit Rulepack',
  type: 'object',
  required: ['name', 'version', 'rules'],
  properties: {
    $schema: {
      type: 'string',
      description: 'JSON Schema reference',
    },
    name: {
      type: 'string',
      description: 'Name of the rulepack',
    },
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+',
      description: 'Semantic version',
    },
    description: {
      type: 'string',
      description: 'Description of the rulepack',
    },
    author: {
      type: 'string',
      description: 'Author name or organization',
    },
    license: {
      type: 'string',
      description: 'License identifier (e.g., MIT, Apache-2.0)',
    },
    homepage: {
      type: 'string',
      format: 'uri',
      description: 'URL to rulepack documentation',
    },
    repository: {
      type: 'string',
      format: 'uri',
      description: 'URL to source repository',
    },
    rules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'pattern', 'message'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[A-Z_][A-Z0-9_]*$',
            description: 'Unique rule identifier',
          },
          name: {
            type: 'string',
            description: 'Human-readable rule name',
          },
          description: {
            type: 'string',
            description: 'Detailed description of what the rule detects',
          },
          pattern: {
            type: 'string',
            description: 'JavaScript regular expression pattern',
          },
          category: {
            type: 'string',
            enum: VALID_CATEGORIES,
            description: 'Issue category',
          },
          severity: {
            type: 'string',
            enum: VALID_SEVERITIES,
            description: 'Issue severity',
          },
          message: {
            type: 'string',
            description: 'Message shown to user',
          },
          fixHint: {
            type: 'string',
            description: 'Hint for how to fix the issue',
          },
          exampleFix: {
            type: 'string',
            description: 'Example code showing the fix',
          },
          docLink: {
            type: 'string',
            format: 'uri',
            description: 'Link to documentation',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags for filtering and categorization',
          },
        },
      },
    },
    metadata: {
      type: 'object',
      description: 'Additional metadata',
    },
  },
};

/**
 * Get rulepack JSON schema as string
 */
export function getRulepackSchemaString(): string {
  return JSON.stringify(RULEPACK_SCHEMA, null, 2);
}
