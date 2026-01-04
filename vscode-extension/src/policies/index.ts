/**
 * F.A.I.L. Kit Policy Templates
 *
 * Compliance framework mappings and pre-built policy packs
 * for finance, healthcare, and internal tools.
 */

import * as vscode from 'vscode';

// ============================================
// Compliance Framework Mappings
// ============================================

export interface ComplianceMapping {
  soc2?: string[];
  pciDss?: string[];
  hipaa?: string[];
  gdpr?: string[];
  iso27001?: string[];
  nist?: string[];
}

export interface RemediationPlaybook {
  ruleId: string;
  steps: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedTime: string;
  resources: string[];
}

export interface PolicyPack {
  name: string;
  description: string;
  industry: string;
  rules: string[];
  severityOverrides: Record<string, 'error' | 'warning' | 'info'>;
  requiredCompliance: string[];
  playbooks: RemediationPlaybook[];
}

/**
 * Compliance mappings for each rule
 */
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
 * Remediation playbooks for each rule
 */
export const REMEDIATION_PLAYBOOKS: Record<string, RemediationPlaybook> = {
  FK001: {
    ruleId: 'FK001',
    steps: [
      '1. Identify the tool call that requires a receipt',
      '2. Import { createReceipt } from "@fail-kit/core"',
      '3. Generate receipt after successful operation with action_id, timestamp, and hashes',
      '4. Store receipt in audit log or append to response',
      '5. Verify receipt generation in unit tests',
    ],
    priority: 'high',
    estimatedTime: '15 minutes',
    resources: [
      'https://github.com/resetroot99/The-FAIL-Kit/blob/main/receipt-standard/README.md',
      'https://github.com/resetroot99/The-FAIL-Kit/blob/main/RECEIPT_SCHEMA.json',
    ],
  },
  FK002: {
    ruleId: 'FK002',
    steps: [
      '1. Wrap LLM call in try/catch block',
      '2. Log error with context (request ID, user ID if available)',
      '3. Set policy.escalate = true on error',
      '4. Return safe fallback response or re-throw with context',
      '5. Add retry logic for transient failures',
    ],
    priority: 'high',
    estimatedTime: '10 minutes',
    resources: [
      'https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/SECURITY_TESTING.md',
    ],
  },
  FK003: {
    ruleId: 'FK003',
    steps: [
      '1. Identify the exposed secret in source code',
      '2. Create environment variable in .env file (never commit .env)',
      '3. Update code to use process.env.VARIABLE_NAME',
      '4. Rotate the exposed secret in the service provider',
      '5. Update CI/CD to inject secret from secure storage',
      '6. Add .env to .gitignore if not present',
    ],
    priority: 'critical',
    estimatedTime: '20 minutes',
    resources: [
      'https://docs.github.com/en/actions/security-guides/encrypted-secrets',
      'https://12factor.net/config',
    ],
  },
  FK004: {
    ruleId: 'FK004',
    steps: [
      '1. Identify destructive operation (delete, publish, send)',
      '2. Add confirmation dialog for user-facing operations',
      '3. For automated systems, implement policy-based approval',
      '4. Log confirmation decision with timestamp',
      '5. Add undo capability where possible',
    ],
    priority: 'high',
    estimatedTime: '20 minutes',
    resources: [
      'https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/SECURITY_TESTING.md#side-effects',
    ],
  },
  FK005: {
    ruleId: 'FK005',
    steps: [
      '1. Add timeout configuration to LLM call (recommended: 30s)',
      '2. Implement retry logic with exponential backoff',
      '3. Add circuit breaker for repeated failures',
      '4. Provide fallback response for degraded operation',
      '5. Monitor and alert on timeout/retry patterns',
    ],
    priority: 'medium',
    estimatedTime: '30 minutes',
    resources: [
      'https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/SECURITY_TESTING.md#resilience',
    ],
  },
  FK006: {
    ruleId: 'FK006',
    steps: [
      '1. Generate unique action_id for each agent action',
      '2. Add timestamp in ISO 8601 format',
      '3. Include trace_id for distributed tracing',
      '4. Add user context (user_id, session_id)',
      '5. Store provenance with action result',
    ],
    priority: 'medium',
    estimatedTime: '10 minutes',
    resources: [
      'https://github.com/resetroot99/The-FAIL-Kit/blob/main/RECEIPT_SCHEMA.json',
    ],
  },
  FK007: {
    ruleId: 'FK007',
    steps: [
      '1. Remove hardcoded credential from source code',
      '2. Store credential in environment variable',
      '3. Use secrets manager for production (AWS Secrets Manager, HashiCorp Vault)',
      '4. Rotate the exposed credential immediately',
      '5. Review git history for other exposed secrets',
      '6. Consider using git-secrets or similar pre-commit hook',
    ],
    priority: 'critical',
    estimatedTime: '30 minutes',
    resources: [
      'https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html',
      'https://www.vaultproject.io/',
    ],
  },
};

// ============================================
// Pre-built Policy Packs
// ============================================

export const POLICY_PACKS: PolicyPack[] = [
  {
    name: 'Finance',
    description: 'Strict audit and compliance for financial applications',
    industry: 'finance',
    rules: ['FK001', 'FK002', 'FK003', 'FK004', 'FK006', 'FK007'],
    severityOverrides: {
      FK001: 'error',  // Receipts are mandatory for financial transactions
      FK003: 'error',  // No secrets in code
      FK004: 'error',  // All destructive ops need confirmation
      FK007: 'error',  // No hardcoded credentials
    },
    requiredCompliance: ['SOC2', 'PCI-DSS'],
    playbooks: [
      REMEDIATION_PLAYBOOKS.FK001,
      REMEDIATION_PLAYBOOKS.FK003,
      REMEDIATION_PLAYBOOKS.FK004,
      REMEDIATION_PLAYBOOKS.FK007,
    ],
  },
  {
    name: 'Healthcare',
    description: 'HIPAA-compliant configuration for healthcare applications',
    industry: 'healthcare',
    rules: ['FK001', 'FK002', 'FK003', 'FK004', 'FK006', 'FK007'],
    severityOverrides: {
      FK001: 'error',  // All PHI access must be logged
      FK003: 'error',  // No secrets
      FK006: 'error',  // Provenance required for audit
      FK007: 'error',  // No credentials
    },
    requiredCompliance: ['HIPAA', 'SOC2'],
    playbooks: [
      REMEDIATION_PLAYBOOKS.FK001,
      REMEDIATION_PLAYBOOKS.FK003,
      REMEDIATION_PLAYBOOKS.FK006,
      REMEDIATION_PLAYBOOKS.FK007,
    ],
  },
  {
    name: 'Internal Tools',
    description: 'Relaxed configuration for internal/dev tools',
    industry: 'internal',
    rules: ['FK001', 'FK002', 'FK003', 'FK007'],
    severityOverrides: {
      FK001: 'warning',
      FK004: 'info',    // Side-effects less critical for internal tools
      FK005: 'info',    // Resilience less critical
      FK006: 'info',    // Provenance optional
    },
    requiredCompliance: [],
    playbooks: [
      REMEDIATION_PLAYBOOKS.FK003,
      REMEDIATION_PLAYBOOKS.FK007,
    ],
  },
  {
    name: 'E-Commerce',
    description: 'Payment and customer data protection',
    industry: 'ecommerce',
    rules: ['FK001', 'FK002', 'FK003', 'FK004', 'FK005', 'FK006', 'FK007'],
    severityOverrides: {
      FK001: 'error',  // All transactions must have receipts
      FK003: 'error',  // No payment secrets in code
      FK004: 'error',  // Order modifications need confirmation
      FK007: 'error',  // No credentials
    },
    requiredCompliance: ['PCI-DSS', 'GDPR'],
    playbooks: [
      REMEDIATION_PLAYBOOKS.FK001,
      REMEDIATION_PLAYBOOKS.FK003,
      REMEDIATION_PLAYBOOKS.FK004,
      REMEDIATION_PLAYBOOKS.FK007,
    ],
  },
];

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
export function getComplianceDetails(ruleId: string, framework: keyof ComplianceMapping): string[] {
  const mapping = COMPLIANCE_MAPPINGS[ruleId];
  if (!mapping) return [];
  return mapping[framework] || [];
}

/**
 * Get remediation playbook for a rule
 */
export function getPlaybook(ruleId: string): RemediationPlaybook | null {
  return REMEDIATION_PLAYBOOKS[ruleId] || null;
}

/**
 * Apply policy pack to workspace configuration
 */
export async function applyPolicyPack(pack: PolicyPack): Promise<void> {
  const config = vscode.workspace.getConfiguration('fail-kit');

  // Apply severity overrides
  for (const [ruleId, severity] of Object.entries(pack.severityOverrides)) {
    const configKey = ruleIdToConfigKey(ruleId);
    if (configKey) {
      await config.update(`severity.${configKey}`, severity, vscode.ConfigurationTarget.Workspace);
    }
  }

  vscode.window.showInformationMessage(`Applied ${pack.name} policy pack`);
}

/**
 * Map rule ID to config key
 */
function ruleIdToConfigKey(ruleId: string): string | null {
  const mapping: Record<string, string> = {
    FK001: 'missingReceipt',
    FK002: 'missingErrorHandling',
    FK003: 'secretExposure',
    FK004: 'sideEffect',
    FK005: 'llmResilience',
    FK006: 'missingProvenance',
    FK007: 'secretExposure',
  };
  return mapping[ruleId] || null;
}

/**
 * Register policy commands
 */
export function registerPolicyCommands(context: vscode.ExtensionContext): void {
  // Apply Policy Pack
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.applyPolicyPack', async () => {
      const selected = await vscode.window.showQuickPick(
        POLICY_PACKS.map(p => ({
          label: p.name,
          description: `${p.industry} - ${p.requiredCompliance.join(', ') || 'No specific compliance'}`,
          detail: p.description,
          pack: p,
        })),
        { title: 'Select Policy Pack' }
      );

      if (selected) {
        await applyPolicyPack(selected.pack);
      }
    })
  );

  // Show Compliance Mapping
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.showCompliance', async () => {
      const ruleIds = Object.keys(COMPLIANCE_MAPPINGS);
      
      const selected = await vscode.window.showQuickPick(
        ruleIds.map(id => ({
          label: id,
          description: getComplianceBadges(id).join(', '),
        })),
        { title: 'Select Rule to View Compliance Mapping' }
      );

      if (selected) {
        const mapping = COMPLIANCE_MAPPINGS[selected.label];
        const playbook = REMEDIATION_PLAYBOOKS[selected.label];
        
        const details = [
          `# ${selected.label} Compliance Mapping\n`,
          mapping.soc2?.length ? `**SOC2:** ${mapping.soc2.join(', ')}` : '',
          mapping.pciDss?.length ? `**PCI-DSS:** ${mapping.pciDss.join(', ')}` : '',
          mapping.hipaa?.length ? `**HIPAA:** ${mapping.hipaa.join(', ')}` : '',
          mapping.gdpr?.length ? `**GDPR:** ${mapping.gdpr.join(', ')}` : '',
          mapping.iso27001?.length ? `**ISO27001:** ${mapping.iso27001.join(', ')}` : '',
          mapping.nist?.length ? `**NIST:** ${mapping.nist.join(', ')}` : '',
          '',
          '## Remediation Steps',
          ...(playbook?.steps || ['No playbook available']),
        ].filter(Boolean).join('\n');

        // Show in output channel
        const channel = vscode.window.createOutputChannel('F.A.I.L. Kit Compliance');
        channel.clear();
        channel.appendLine(details);
        channel.show();
      }
    })
  );

  // Show Playbook
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.showPlaybook', async (ruleId?: string) => {
      let targetRule = ruleId;
      
      if (!targetRule) {
        const selected = await vscode.window.showQuickPick(
          Object.keys(REMEDIATION_PLAYBOOKS).map(id => ({
            label: id,
            description: REMEDIATION_PLAYBOOKS[id].priority,
          })),
          { title: 'Select Rule for Playbook' }
        );
        targetRule = selected?.label;
      }

      if (!targetRule) return;

      const playbook = REMEDIATION_PLAYBOOKS[targetRule];
      if (!playbook) {
        vscode.window.showWarningMessage('No playbook available for this rule');
        return;
      }

      const channel = vscode.window.createOutputChannel('F.A.I.L. Kit Playbook');
      channel.clear();
      channel.appendLine(`# ${playbook.ruleId} Remediation Playbook`);
      channel.appendLine(`Priority: ${playbook.priority.toUpperCase()}`);
      channel.appendLine(`Estimated Time: ${playbook.estimatedTime}`);
      channel.appendLine('');
      channel.appendLine('## Steps');
      playbook.steps.forEach(step => channel.appendLine(step));
      channel.appendLine('');
      channel.appendLine('## Resources');
      playbook.resources.forEach(res => channel.appendLine(`- ${res}`));
      channel.show();
    })
  );
}
