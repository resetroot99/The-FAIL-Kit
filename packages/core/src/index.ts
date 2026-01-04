/**
 * @fail-kit/core v1.6.0
 *
 * Core library for F.A.I.L. Kit - Receipt generation, validation, compliance, and utilities.
 *
 * @example
 * ```typescript
 * import { 
 *   receipt, 
 *   createReceipt, 
 *   ReceiptValidator,
 *   generateEvidencePackage,
 *   getComplianceBadges,
 *   withRetry,
 * } from '@fail-kit/core';
 *
 * // Fluent API
 * const r = receipt()
 *   .tool('payment_processor')
 *   .input({ amount: 100, currency: 'USD' })
 *   .output({ transactionId: 'txn_123' })
 *   .proof('Payment processed successfully')
 *   .success()
 *   .build();
 *
 * // With retry for resilience
 * const result = await withRetry(
 *   () => llm.invoke(prompt),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 *
 * // Generate evidence package for audit
 * const evidence = generateEvidencePackage([r], { gitHash: 'abc123' });
 *
 * // Get compliance badges
 * const badges = getComplianceBadges('FK001'); // ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR']
 * ```
 */

// Receipt generation
export {
  ActionReceipt,
  ActionStatus,
  ReceiptOptions,
  ReceiptGenerator,
  createReceipt,
  receipt,
  hashData,
  generateActionId,
  withReceipt,
  ReceiptGenerating,
  // v1.6.0 additions
  signReceipt,
  verifyReceiptSignature,
  createSignedReceipt,
  SignedReceiptGenerator,
  signedReceipt,
  ProvenanceContext,
  generateProvenanceContext,
  addProvenanceToReceipt,
} from './receipt';

// Validation
export {
  ValidationResult,
  ValidationError,
  ValidationOptions,
  CustomValidator,
  ReceiptValidator,
  validateReceipt,
  isValidReceipt,
  assertValidReceipt,
  // v1.6.0 additions
  ComplianceValidationOptions,
  validateForCompliance,
  ComplianceValidator,
} from './validator';

// Re-export types for convenience
export type { ActionReceipt as Receipt } from './receipt';

// ============================================
// NEW v1.6.0: Compliance Mappings
// ============================================

export interface ComplianceMapping {
  soc2?: string[];
  pciDss?: string[];
  hipaa?: string[];
  gdpr?: string[];
  iso27001?: string[];
  nist?: string[];
}

export const COMPLIANCE_MAPPINGS: Record<string, ComplianceMapping> = {
  FK001: {
    soc2: ['CC6.1', 'CC7.2', 'CC7.3'],
    pciDss: ['10.2.2', '10.3', '10.3.1'],
    hipaa: ['164.312(b)', '164.308(a)(1)(ii)(D)'],
    gdpr: ['Art. 30', 'Art. 5(2)'],
    iso27001: ['A.12.4.1', 'A.12.4.3'],
    nist: ['AU-2', 'AU-3', 'AU-12'],
  },
  FK002: {
    soc2: ['CC7.4', 'CC7.5'],
    pciDss: ['6.5.5', '6.5.6'],
    hipaa: ['164.308(a)(1)', '164.306(a)(2)'],
    iso27001: ['A.14.2.1'],
    nist: ['SI-11', 'SI-17'],
  },
  FK003: {
    soc2: ['CC6.7', 'CC6.8', 'CC6.1'],
    pciDss: ['3.4', '6.5.3', '8.2.1'],
    hipaa: ['164.312(a)(1)', '164.312(e)(1)'],
    gdpr: ['Art. 32', 'Art. 25'],
    iso27001: ['A.9.2.3', 'A.10.1.2'],
    nist: ['IA-5', 'SC-12', 'SC-13'],
  },
  FK004: {
    soc2: ['CC6.1', 'CC7.1', 'CC7.2'],
    pciDss: ['7.1', '7.2', '10.2.5'],
    hipaa: ['164.312(d)', '164.308(a)(4)'],
    gdpr: ['Art. 6', 'Art. 7'],
    iso27001: ['A.9.4.1', 'A.9.4.4'],
    nist: ['AC-3', 'AC-6'],
  },
  FK005: {
    soc2: ['A1.2', 'CC7.4'],
    pciDss: ['6.5.6', '12.10.1'],
    hipaa: ['164.308(a)(7)'],
    iso27001: ['A.17.1.1', 'A.17.1.2'],
    nist: ['CP-10', 'SI-13'],
  },
  FK006: {
    soc2: ['CC5.2', 'CC7.2', 'CC7.3'],
    pciDss: ['10.1', '10.2', '10.3.6'],
    hipaa: ['164.312(b)', '164.308(a)(1)(ii)(D)'],
    gdpr: ['Art. 30', 'Art. 5(2)'],
    iso27001: ['A.12.4.1', 'A.12.4.2'],
    nist: ['AU-3', 'AU-6', 'AU-11'],
  },
  FK007: {
    soc2: ['CC6.7', 'CC6.8'],
    pciDss: ['2.3', '8.2.1', '8.2.3'],
    hipaa: ['164.312(a)(1)', '164.312(d)'],
    gdpr: ['Art. 32'],
    iso27001: ['A.9.2.4', 'A.10.1.1'],
    nist: ['IA-5', 'SC-28'],
  },
};

/**
 * Get compliance badges for a rule
 */
export function getComplianceBadges(ruleId: string): string[] {
  const mapping = COMPLIANCE_MAPPINGS[ruleId];
  if (!mapping) return [];

  const badges: string[] = [];
  if (mapping.soc2?.length) badges.push('SOC2');
  if (mapping.pciDss?.length) badges.push('PCI-DSS');
  if (mapping.hipaa?.length) badges.push('HIPAA');
  if (mapping.gdpr?.length) badges.push('GDPR');
  if (mapping.iso27001?.length) badges.push('ISO27001');
  if (mapping.nist?.length) badges.push('NIST');

  return badges;
}

/**
 * Get detailed compliance controls for a rule
 */
export function getComplianceControls(
  ruleId: string,
  framework: keyof ComplianceMapping
): string[] {
  const mapping = COMPLIANCE_MAPPINGS[ruleId];
  return mapping?.[framework] || [];
}

// ============================================
// NEW v1.6.0: Resilience Utilities
// ============================================

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBase?: number;
  jitter?: boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBase = 2,
    jitter = true,
    onRetry,
  } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt < maxRetries) {
        let delay = Math.min(baseDelay * Math.pow(exponentialBase, attempt), maxDelay);

        if (jitter) {
          delay *= 0.5 + Math.random();
        }

        if (onRetry) {
          onRetry(error, attempt + 1);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Execute a function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// ============================================
// NEW v1.6.0: Evidence Generation
// ============================================

import { ActionReceipt } from './receipt';
import { createHmac } from 'crypto';

export interface EvidencePackage {
  version: string;
  generatedAt: string;
  receipts: ActionReceipt[];
  provenance: ProvenanceData;
  signature: string;
  signatureAlgorithm: string;
  complianceMappings: Record<string, string[]>;
}

export interface ProvenanceData {
  gitHash?: string;
  gitBranch?: string;
  gitDirty?: boolean;
  platform?: string;
  nodeVersion?: string;
  failKitVersion: string;
  timestamp: string;
}

/**
 * Generate HMAC signature for evidence integrity
 */
function signEvidence(data: string): string {
  return createHmac('sha256', 'fail-kit-evidence').update(data).digest('hex');
}

/**
 * Generate an evidence package for audit export
 */
export function generateEvidencePackage(
  receipts: ActionReceipt[],
  provenance: Partial<ProvenanceData> = {}
): EvidencePackage {
  const fullProvenance: ProvenanceData = {
    failKitVersion: '1.6.0',
    timestamp: new Date().toISOString(),
    platform: typeof process !== 'undefined' ? process.platform : 'unknown',
    nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
    ...provenance,
  };

  const dataToSign = JSON.stringify(receipts);

  // Map receipts to compliance frameworks
  const complianceMappings: Record<string, string[]> = {};
  for (const receipt of receipts) {
    const toolName = receipt.tool_name.toLowerCase();
    if (toolName.includes('payment') || toolName.includes('charge')) {
      complianceMappings['PCI-DSS'] = COMPLIANCE_MAPPINGS.FK001.pciDss || [];
    }
    if (toolName.includes('database') || toolName.includes('user')) {
      complianceMappings['SOC2'] = COMPLIANCE_MAPPINGS.FK001.soc2 || [];
    }
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    receipts,
    provenance: fullProvenance,
    signature: signEvidence(dataToSign),
    signatureAlgorithm: 'HMAC-SHA256',
    complianceMappings,
  };
}

/**
 * Verify evidence package signature
 */
export function verifyEvidenceSignature(evidence: EvidencePackage): boolean {
  const dataToSign = JSON.stringify(evidence.receipts);
  const expectedSignature = signEvidence(dataToSign);
  return evidence.signature === expectedSignature;
}

/**
 * Export evidence as CSV
 */
export function exportEvidenceAsCSV(receipts: ActionReceipt[]): string {
  const headers = [
    'action_id',
    'tool_name',
    'timestamp',
    'status',
    'input_hash',
    'output_hash',
    'duration_ms',
  ];
  const rows = receipts.map((r) =>
    headers.map((h) => String((r as any)[h] || '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// ============================================
// NEW v1.6.0: Secret Detection
// ============================================

export interface SecretFinding {
  type: string;
  masked: string;
  severity: 'critical' | 'high' | 'medium';
  line?: number;
}

const SECRET_PATTERNS: Array<{ pattern: RegExp; type: string; severity: 'critical' | 'high' | 'medium' }> = [
  { pattern: /sk[-_]live[-_][a-zA-Z0-9]{20,}/g, type: 'stripe_secret_key', severity: 'critical' },
  { pattern: /sk[-_]test[-_][a-zA-Z0-9]{20,}/g, type: 'stripe_test_key', severity: 'high' },
  { pattern: /AKIA[A-Z0-9]{16}/g, type: 'aws_access_key', severity: 'critical' },
  { pattern: /sk-[a-zA-Z0-9]{32,}/g, type: 'openai_api_key', severity: 'critical' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, type: 'github_pat', severity: 'critical' },
  { pattern: /github_pat_[a-zA-Z0-9_]{22,}/g, type: 'github_fine_grained', severity: 'critical' },
];

/**
 * Detect potential secrets in text
 */
export function detectSecrets(text: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  for (const { pattern, type, severity } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[0];
      findings.push({
        type,
        masked: value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '***',
        severity,
      });
    }
  }

  return findings;
}

/**
 * Check if text contains any secrets
 */
export function hasSecrets(text: string): boolean {
  return detectSecrets(text).length > 0;
}
