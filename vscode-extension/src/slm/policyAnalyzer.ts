/**
 * F.A.I.L. Kit Policy Analyzer
 *
 * Semantic analysis for policy violations using SLM.
 */

import { OnnxRunner } from './onnxRunner';
import { RiskAnalysis, PolicyViolation } from './index';

/**
 * Policy definitions
 */
export const POLICIES = {
  NO_PII_LEAKAGE: {
    id: 'NO_PII_LEAKAGE',
    name: 'No PII Leakage',
    description: 'Sensitive personal information must not be exposed in outputs',
    severity: 'critical' as const,
  },
  NO_PROMPT_INJECTION: {
    id: 'NO_PROMPT_INJECTION',
    name: 'No Prompt Injection',
    description: 'User input must be sanitized before inclusion in prompts',
    severity: 'critical' as const,
  },
  REQUIRE_ERROR_HANDLING: {
    id: 'REQUIRE_ERROR_HANDLING',
    name: 'Require Error Handling',
    description: 'All external calls must have error handling',
    severity: 'high' as const,
  },
  REQUIRE_CONFIRMATION: {
    id: 'REQUIRE_CONFIRMATION',
    name: 'Require Confirmation',
    description: 'Destructive operations must require user confirmation',
    severity: 'high' as const,
  },
  REQUIRE_AUDIT_LOG: {
    id: 'REQUIRE_AUDIT_LOG',
    name: 'Require Audit Logging',
    description: 'All actions must generate audit receipts',
    severity: 'medium' as const,
  },
  NO_HARDCODED_SECRETS: {
    id: 'NO_HARDCODED_SECRETS',
    name: 'No Hardcoded Secrets',
    description: 'API keys and secrets must not be hardcoded',
    severity: 'critical' as const,
  },
};

/**
 * Policy Analyzer using semantic understanding
 */
export class PolicyAnalyzer {
  /**
   * Check for PII leakage risks
   */
  async checkPIILeakage(
    code: string,
    runner: OnnxRunner
  ): Promise<RiskAnalysis | null> {
    const result = await runner.checkConcept(
      code,
      'leak PII or expose sensitive personal information like SSN, passwords, or credit cards',
      'Check if this code could expose sensitive data in outputs or logs'
    );

    if (result.matches) {
      return {
        detected: true,
        confidence: result.confidence,
        reason: result.explanation,
        recommendation: 'Sanitize PII before output. Use data masking for sensitive fields.',
      };
    }

    return null;
  }

  /**
   * Check for prompt injection vulnerabilities
   */
  async checkInjectionVulnerability(
    code: string,
    runner: OnnxRunner
  ): Promise<RiskAnalysis | null> {
    const result = await runner.checkConcept(
      code,
      'allow prompt injection by concatenating user input directly into prompts without sanitization',
      'Check if user input could manipulate LLM behavior'
    );

    if (result.matches) {
      return {
        detected: true,
        confidence: result.confidence,
        reason: result.explanation,
        recommendation: 'Validate and sanitize user input. Use parameterized prompts.',
      };
    }

    return null;
  }

  /**
   * Check all policy violations
   */
  async checkPolicyViolations(
    code: string,
    runner: OnnxRunner
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];

    // Check each policy
    const checks = [
      this.checkPolicyWithRunner(code, runner, POLICIES.NO_HARDCODED_SECRETS, 
        'contain hardcoded API keys, passwords, or secrets'),
      this.checkPolicyWithRunner(code, runner, POLICIES.REQUIRE_ERROR_HANDLING,
        'make external calls without error handling'),
      this.checkPolicyWithRunner(code, runner, POLICIES.REQUIRE_CONFIRMATION,
        'perform destructive operations without user confirmation'),
      this.checkPolicyWithRunner(code, runner, POLICIES.REQUIRE_AUDIT_LOG,
        'perform actions without generating audit logs or receipts'),
    ];

    const results = await Promise.all(checks);
    
    for (const result of results) {
      if (result) {
        violations.push(result);
      }
    }

    return violations;
  }

  private async checkPolicyWithRunner(
    code: string,
    runner: OnnxRunner,
    policy: typeof POLICIES[keyof typeof POLICIES],
    concept: string
  ): Promise<PolicyViolation | null> {
    const result = await runner.checkConcept(code, concept);

    if (result.matches) {
      return {
        policy: policy.id,
        severity: policy.severity,
        description: `${policy.name}: ${result.explanation}`,
        confidence: result.confidence,
      };
    }

    return null;
  }

  /**
   * Analyze code intent
   */
  async analyzeIntent(
    code: string,
    runner: OnnxRunner
  ): Promise<{ intent: string; description: string; risk: 'low' | 'medium' | 'high' }[]> {
    const intents = [
      { concept: 'perform financial transactions', intent: 'financial', risk: 'high' as const },
      { concept: 'send emails or messages', intent: 'communication', risk: 'medium' as const },
      { concept: 'delete or modify data', intent: 'destructive', risk: 'high' as const },
      { concept: 'access external APIs', intent: 'external_access', risk: 'medium' as const },
      { concept: 'read or write files', intent: 'file_io', risk: 'medium' as const },
      { concept: 'authenticate users', intent: 'authentication', risk: 'high' as const },
    ];

    const results: { intent: string; description: string; risk: 'low' | 'medium' | 'high' }[] = [];

    for (const { concept, intent, risk } of intents) {
      const result = await runner.checkConcept(code, concept);
      if (result.matches && result.confidence > 0.5) {
        results.push({
          intent,
          description: result.explanation,
          risk,
        });
      }
    }

    return results;
  }
}

/**
 * Check code against all policies (pattern-based fallback)
 */
export function checkPoliciesPattern(code: string): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  // NO_HARDCODED_SECRETS
  const secretPatterns = [
    /(?:api|secret|auth|token)_?(?:key|secret|token)\s*[:=]\s*['"][^'"]{10,}['"]/i,
    /password\s*[:=]\s*['"][^'"]+['"]/i,
    /sk-[a-zA-Z0-9]{20,}/,
    /ghp_[a-zA-Z0-9]{36}/,
  ];

  for (const pattern of secretPatterns) {
    const match = code.match(pattern);
    if (match) {
      violations.push({
        policy: POLICIES.NO_HARDCODED_SECRETS.id,
        severity: 'critical',
        description: `Potential hardcoded secret detected: ${match[0].substring(0, 30)}...`,
        confidence: 0.9,
      });
      break;
    }
  }

  // NO_PII_LEAKAGE
  const piiOutputPatterns = [
    /(?:console\.log|print|return|res\.(?:send|json))\s*\([^)]*(?:ssn|password|credit.?card|social.?security)/i,
  ];

  for (const pattern of piiOutputPatterns) {
    if (pattern.test(code)) {
      violations.push({
        policy: POLICIES.NO_PII_LEAKAGE.id,
        severity: 'critical',
        description: 'Potential PII exposure in output',
        confidence: 0.8,
      });
      break;
    }
  }

  // REQUIRE_ERROR_HANDLING
  const externalCallPatterns = [
    /await\s+(?:fetch|axios|http\.(?:get|post))\s*\(/i,
    /await\s+\w+\.(?:query|execute|findMany|create)\s*\(/i,
  ];

  const hasErrorHandling = /try\s*\{[\s\S]*catch|\.catch\s*\(/.test(code);

  for (const pattern of externalCallPatterns) {
    if (pattern.test(code) && !hasErrorHandling) {
      violations.push({
        policy: POLICIES.REQUIRE_ERROR_HANDLING.id,
        severity: 'high',
        description: 'External call without error handling',
        confidence: 0.7,
      });
      break;
    }
  }

  return violations;
}
