/**
 * F.A.I.L. Kit AST Analyzer
 *
 * Uses TypeScript Compiler API for accurate detection of:
 * - Tool calls without receipt generation
 * - LLM calls without error handling
 * - Agent invocations
 */

import * as ts from 'typescript';
import {
  TOOL_PATTERNS,
  LLM_PATTERNS,
  AGENT_PATTERNS,
  SECRET_PATTERNS,
  SIDE_EFFECT_PATTERNS,
  hasReceiptNearby,
  hasErrorHandlingNearby,
  hasDisableComment,
  isTestFile,
  isConfigFile,
  findSecrets,
  hasSideEffectConfirmation,
  hasLLMResilience,
  hasProvenanceMetadata,
  SecretPattern,
  SideEffectPattern,
} from './patterns';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * Enhanced Issue with severity classification, business impact, and root-cause diagnostics
 */
export interface Issue {
  ruleId: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: DiagnosticSeverity;
  code: string;
  suggestion?: string;
  
  // Enhanced fields
  issueSeverity: IssueSeverity;
  businessImpact: string;
  category: IssueCategory;
  fixHint: string;
  exampleFix?: string;
  docLink: string;
  estimatedFixTime: string;
  riskScore: number; // 0-100
  
  // Root-cause diagnostics
  rootCause: RootCause;
  reproductionSteps: string[];
}

/**
 * Root cause analysis for an issue
 */
export interface RootCause {
  type: 'missing_implementation' | 'incorrect_pattern' | 'missing_wrapper' | 'config_issue';
  description: string;
  affectedComponent: string;
  requiredAction: string;
  relatedFiles?: string[];
}

export type IssueCategory = 
  | 'receipt_missing'
  | 'error_handling'
  | 'policy_failed'
  | 'tool_error'
  | 'validation_failed'
  | 'audit_gap'
  | 'secret_exposure'
  | 'side_effect_unconfirmed'
  | 'llm_resilience'
  | 'provenance_missing'
  | 'hardcoded_credential';

export interface AnalysisResult {
  issues: Issue[];
  toolCalls: ToolCallInfo[];
  llmCalls: LLMCallInfo[];
  agentCalls: AgentCallInfo[];
  summary: AnalysisSummary;
}

export interface AnalysisSummary {
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  receiptMissing: number;
  errorHandlingMissing: number;
  riskScore: number;
  shipDecision: 'BLOCK' | 'NEEDS_REVIEW' | 'SHIP';
  shipReason: string;
}

export interface ToolCallInfo {
  tool: string;
  line: number;
  column: number;
  code: string;
  destructive: boolean;
  hasReceipt: boolean;
}

export interface LLMCallInfo {
  provider: string;
  line: number;
  column: number;
  code: string;
  hasErrorHandling: boolean;
}

export interface AgentCallInfo {
  framework: string;
  line: number;
  column: number;
  code: string;
  methodType: string;
}

/**
 * Get severity classification and business impact for an issue
 */
function classifyIssue(ruleId: string, tool: string): {
  issueSeverity: IssueSeverity;
  businessImpact: string;
  category: IssueCategory;
  riskScore: number;
  estimatedFixTime: string;
} {
  // Payment/financial operations are critical
  if (tool === 'payment' || tool.includes('stripe') || tool.includes('charge')) {
    return {
      issueSeverity: 'critical',
      businessImpact: 'Financial transactions without audit trail. Potential regulatory violations, customer disputes, and fraud risk.',
      category: 'receipt_missing',
      riskScore: 95,
      estimatedFixTime: '15 minutes',
    };
  }

  // Database mutations are high severity
  if (tool === 'database' || tool.includes('prisma') || tool.includes('db')) {
    return {
      issueSeverity: 'high',
      businessImpact: 'Data modifications without proof. Cannot audit who changed what or rollback accurately.',
      category: 'receipt_missing',
      riskScore: 80,
      estimatedFixTime: '10 minutes',
    };
  }

  // Email/messaging is high severity
  if (tool === 'email' || tool === 'messaging' || tool === 'sms') {
    return {
      issueSeverity: 'high',
      businessImpact: 'Communications sent without logging. Cannot prove what was sent to whom.',
      category: 'receipt_missing',
      riskScore: 75,
      estimatedFixTime: '10 minutes',
    };
  }

  // File operations are medium severity
  if (tool === 'file_system' || tool === 'file_upload' || tool === 'cloud_storage') {
    return {
      issueSeverity: 'medium',
      businessImpact: 'File changes without audit. May cause data loss or compliance issues.',
      category: 'receipt_missing',
      riskScore: 60,
      estimatedFixTime: '10 minutes',
    };
  }

  // LLM error handling is high severity
  if (ruleId === 'FK002') {
    return {
      issueSeverity: 'high',
      businessImpact: 'LLM failures may crash silently. Users see errors or wrong results without explanation.',
      category: 'error_handling',
      riskScore: 70,
      estimatedFixTime: '5 minutes',
    };
  }

  // Secret exposure is critical
  if (ruleId === 'FK003') {
    return {
      issueSeverity: 'critical',
      businessImpact: 'Exposed secrets can lead to unauthorized access, data breaches, and financial loss.',
      category: 'secret_exposure',
      riskScore: 100,
      estimatedFixTime: '5 minutes',
    };
  }

  // Side-effect without confirmation is high
  if (ruleId === 'FK004') {
    return {
      issueSeverity: 'high',
      businessImpact: 'Unconfirmed side-effects may execute destructive operations without user consent.',
      category: 'side_effect_unconfirmed',
      riskScore: 75,
      estimatedFixTime: '10 minutes',
    };
  }

  // LLM without resilience is medium
  if (ruleId === 'FK005') {
    return {
      issueSeverity: 'medium',
      businessImpact: 'LLM calls without timeout/retry may hang indefinitely or fail without recovery.',
      category: 'llm_resilience',
      riskScore: 55,
      estimatedFixTime: '15 minutes',
    };
  }

  // Missing provenance is medium
  if (ruleId === 'FK006') {
    return {
      issueSeverity: 'medium',
      businessImpact: 'Missing provenance metadata makes it difficult to trace and audit actions.',
      category: 'provenance_missing',
      riskScore: 50,
      estimatedFixTime: '5 minutes',
    };
  }

  // Hardcoded credentials is critical
  if (ruleId === 'FK007') {
    return {
      issueSeverity: 'critical',
      businessImpact: 'Hardcoded credentials in code can be extracted and misused by attackers.',
      category: 'hardcoded_credential',
      riskScore: 95,
      estimatedFixTime: '10 minutes',
    };
  }

  // Default to medium
  return {
    issueSeverity: 'medium',
    businessImpact: 'Operation without proper audit trail or error handling.',
    category: 'audit_gap',
    riskScore: 50,
    estimatedFixTime: '10 minutes',
  };
}

/**
 * Get fix hint and example for an issue
 */
function getFixInfo(ruleId: string, tool: string): { fixHint: string; exampleFix: string; docLink: string } {
  if (ruleId === 'FK001') {
    return {
      fixHint: `Add receipt generation after ${tool} operation. Include action_id, tool_name, timestamp, status, input_hash, and output_hash.`,
      exampleFix: `const receipt = {
  action_id: \`act_\${crypto.randomBytes(4).toString('hex')}\`,
  tool_name: '${tool}',
  timestamp: new Date().toISOString(),
  status: 'success',
  input_hash: hashData(input),
  output_hash: hashData(result),
};`,
      docLink: 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/RECEIPT_SCHEMA.json',
    };
  }

  if (ruleId === 'FK002') {
    return {
      fixHint: 'Wrap LLM call in try/catch block. Log errors and provide user-friendly fallback.',
      exampleFix: `try {
  const response = await llm.invoke(prompt);
  return response;
} catch (error) {
  console.error('LLM call failed:', error);
  policy.escalate = true;
  policy.reasons.push(error.message);
  throw error;
}`,
      docLink: 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/SECURITY_TESTING.md',
    };
  }

  if (ruleId === 'FK003' || ruleId === 'FK007') {
    return {
      fixHint: 'Move secret to environment variable. Use process.env.SECRET_NAME instead of hardcoded value.',
      exampleFix: `// Before (insecure):
const apiKey = 'sk-abc123...';

// After (secure):
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('API_KEY environment variable is required');`,
      docLink: 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/SECURITY_TESTING.md#secrets',
    };
  }

  if (ruleId === 'FK004') {
    return {
      fixHint: 'Add confirmation check before executing destructive operation. Require explicit user consent.',
      exampleFix: `// Add confirmation before destructive operations
const confirmed = await confirmAction({
  action: 'delete',
  resource: resourceId,
  message: 'Are you sure you want to delete this item?',
});

if (!confirmed) {
  throw new Error('Operation cancelled by user');
}

await resource.delete();`,
      docLink: 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/SECURITY_TESTING.md#side-effects',
    };
  }

  if (ruleId === 'FK005') {
    return {
      fixHint: 'Add timeout and retry configuration to LLM calls for resilience.',
      exampleFix: `// Add timeout and retry for resilience
const response = await retry(
  () => llm.invoke(prompt, { timeout: 30000 }),
  {
    maxRetries: 3,
    backoff: 'exponential',
    onRetry: (error, attempt) => console.log(\`Retry \${attempt}: \${error.message}\`),
  }
);`,
      docLink: 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/SECURITY_TESTING.md#resilience',
    };
  }

  if (ruleId === 'FK006') {
    return {
      fixHint: 'Add action_id and timestamp to track provenance of agent actions.',
      exampleFix: `// Add provenance metadata
const action = {
  action_id: \`act_\${crypto.randomBytes(8).toString('hex')}\`,
  timestamp: new Date().toISOString(),
  user_id: currentUser.id,
  trace_id: context.traceId,
  // ... rest of action data
};`,
      docLink: 'https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/SECURITY_TESTING.md#provenance',
    };
  }

  return {
    fixHint: 'Review the operation and add appropriate error handling or audit logging.',
    exampleFix: '',
    docLink: 'https://github.com/resetroot99/The-FAIL-Kit',
  };
}

/**
 * Generate root cause analysis for an issue
 */
function getRootCause(ruleId: string, tool: string, filePath: string): RootCause {
  if (ruleId === 'FK001') {
    return {
      type: 'missing_implementation',
      description: `The ${tool} operation executes without generating an audit receipt. This creates a gap in the audit trail where the action cannot be verified or replayed.`,
      affectedComponent: `${tool} integration layer`,
      requiredAction: `Import @fail-kit/core and wrap the ${tool} call with receipt generation using createReceipt() or the withReceipt() higher-order function.`,
      relatedFiles: [filePath],
    };
  }

  if (ruleId === 'FK002') {
    return {
      type: 'missing_wrapper',
      description: `The ${tool} LLM call is not wrapped in error handling. If the API fails, times out, or returns an invalid response, the error will propagate uncontrolled.`,
      affectedComponent: `${tool} LLM integration`,
      requiredAction: `Wrap the LLM call in a try/catch block. Log the error, set policy.escalate = true, and either throw or return a safe fallback response.`,
      relatedFiles: [filePath],
    };
  }

  if (ruleId === 'FK003' || ruleId === 'FK007') {
    return {
      type: 'incorrect_pattern',
      description: `Hardcoded secret detected: ${tool}. Secrets should never be committed to source code as they can be extracted from version control history.`,
      affectedComponent: 'Secret management',
      requiredAction: 'Move the secret to an environment variable and reference it via process.env. Rotate the exposed secret immediately.',
      relatedFiles: [filePath],
    };
  }

  if (ruleId === 'FK004') {
    return {
      type: 'missing_implementation',
      description: `The ${tool} operation executes without confirmation. Destructive or irreversible operations should require explicit user consent.`,
      affectedComponent: `${tool} operation handler`,
      requiredAction: 'Add a confirmation step before executing the operation. For automated systems, implement policy-based approval.',
      relatedFiles: [filePath],
    };
  }

  if (ruleId === 'FK005') {
    return {
      type: 'missing_wrapper',
      description: `The LLM call lacks timeout/retry configuration. Network issues or API overload can cause indefinite hangs or silent failures.`,
      affectedComponent: 'LLM integration layer',
      requiredAction: 'Add timeout configuration (e.g., 30s) and retry logic with exponential backoff. Consider circuit breaker pattern for high-traffic systems.',
      relatedFiles: [filePath],
    };
  }

  if (ruleId === 'FK006') {
    return {
      type: 'missing_implementation',
      description: `Agent action lacks provenance metadata. Without action_id and timestamp, actions cannot be traced or audited effectively.`,
      affectedComponent: 'Agent action logging',
      requiredAction: 'Add action_id (unique identifier) and timestamp to all agent actions. Consider adding trace_id for distributed tracing.',
      relatedFiles: [filePath],
    };
  }

  return {
    type: 'incorrect_pattern',
    description: `The operation does not follow F.A.I.L. Kit best practices for audit compliance.`,
    affectedComponent: 'Unknown',
    requiredAction: 'Review the F.A.I.L. Kit documentation for the correct pattern.',
    relatedFiles: [filePath],
  };
}

/**
 * Generate reproduction steps for an issue
 */
function getReproductionSteps(ruleId: string, tool: string, line: number, filePath: string): string[] {
  const baseSteps = [
    `1. Open file: ${filePath}`,
    `2. Navigate to line ${line + 1}`,
  ];

  if (ruleId === 'FK001') {
    return [
      ...baseSteps,
      `3. Find the ${tool} call that executes without receipt generation`,
      `4. Verify no receipt object is created after the call`,
      `5. Confirm no @fail-kit/core wrapper is used`,
      `6. Fix: Import { createReceipt } from '@fail-kit/core' and generate a receipt`,
    ];
  }

  if (ruleId === 'FK002') {
    return [
      ...baseSteps,
      `3. Find the ${tool} LLM call without try/catch`,
      `4. Verify the call is not inside any error handling block`,
      `5. Simulate a failure (e.g., invalid API key) to confirm error propagates`,
      `6. Fix: Wrap in try/catch, log error, and set policy.escalate = true`,
    ];
  }

  if (ruleId === 'FK003' || ruleId === 'FK007') {
    return [
      ...baseSteps,
      `3. Identify the hardcoded secret value`,
      `4. Create an environment variable in .env file`,
      `5. Replace hardcoded value with process.env.VARIABLE_NAME`,
      `6. Rotate the exposed secret in the service provider`,
      `7. Verify the application still works with the environment variable`,
    ];
  }

  if (ruleId === 'FK004') {
    return [
      ...baseSteps,
      `3. Identify the ${tool} operation that may have side effects`,
      `4. Determine if user confirmation is required`,
      `5. Add confirmation dialog or policy check before execution`,
      `6. Test with different permission levels`,
    ];
  }

  if (ruleId === 'FK005') {
    return [
      ...baseSteps,
      `3. Find the LLM call without timeout/retry`,
      `4. Add timeout configuration (recommended: 30 seconds)`,
      `5. Implement retry logic with exponential backoff`,
      `6. Test by simulating network failures`,
    ];
  }

  if (ruleId === 'FK006') {
    return [
      ...baseSteps,
      `3. Find the agent action without provenance metadata`,
      `4. Generate unique action_id (e.g., using crypto.randomBytes)`,
      `5. Add timestamp using new Date().toISOString()`,
      `6. Optionally add trace_id for distributed tracing`,
    ];
  }

  return [
    ...baseSteps,
    `3. Review the flagged code pattern`,
    `4. Apply the suggested fix`,
  ];
}

/**
 * Calculate ship decision based on issues
 */
function calculateShipDecision(issues: Issue[]): { decision: 'BLOCK' | 'NEEDS_REVIEW' | 'SHIP'; reason: string } {
  const criticalCount = issues.filter(i => i.issueSeverity === 'critical').length;
  const highCount = issues.filter(i => i.issueSeverity === 'high').length;
  const totalIssues = issues.length;

  if (criticalCount > 0) {
    return {
      decision: 'BLOCK',
      reason: `${criticalCount} critical issue(s) found. Fix before deploying to production.`,
    };
  }

  if (highCount >= 3 || totalIssues >= 5) {
    return {
      decision: 'NEEDS_REVIEW',
      reason: `${highCount} high-severity issues. Manual review required before deployment.`,
    };
  }

  if (totalIssues === 0) {
    return {
      decision: 'SHIP',
      reason: 'No issues detected. Safe to deploy.',
    };
  }

  return {
    decision: 'NEEDS_REVIEW',
    reason: `${totalIssues} issue(s) found. Review before deployment.`,
  };
}

/**
 * Analyze a TypeScript/JavaScript document for agent code issues
 */
export function analyzeDocument(
  code: string,
  filePath: string = 'temp.ts'
): AnalysisResult {
  const issues: Issue[] = [];
  const toolCalls: ToolCallInfo[] = [];
  const llmCalls: LLMCallInfo[] = [];
  const agentCalls: AgentCallInfo[] = [];

  // Skip test files
  if (isTestFile(filePath)) {
    return {
      issues,
      toolCalls,
      llmCalls,
      agentCalls,
      summary: {
        totalIssues: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        receiptMissing: 0,
        errorHandlingMissing: 0,
        riskScore: 0,
        shipDecision: 'SHIP',
        shipReason: 'Test file - not analyzed',
      },
    };
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );

  const lines = code.split('\n');

  function getLineAndColumn(pos: number): { line: number; column: number } {
    const lineAndChar = sourceFile.getLineAndCharacterOfPosition(pos);
    return { line: lineAndChar.line, column: lineAndChar.character };
  }

  function visit(node: ts.Node) {
    // Check for call expressions
    if (ts.isCallExpression(node) || ts.isAwaitExpression(node)) {
      const callNode = ts.isAwaitExpression(node)
        ? (node.expression as ts.CallExpression)
        : node;

      if (!ts.isCallExpression(callNode)) {
        ts.forEachChild(node, visit);
        return;
      }

      const nodeText = node.getText(sourceFile);
      const { line, column } = getLineAndColumn(node.getStart(sourceFile));
      const endPos = getLineAndColumn(node.getEnd());

      // Check disable comments
      const currentLine = lines[line] || '';
      const previousLine = line > 0 ? lines[line - 1] : undefined;
      if (hasDisableComment(currentLine, previousLine)) {
        ts.forEachChild(node, visit);
        return;
      }

      // Check tool patterns
      for (const pattern of TOOL_PATTERNS) {
        pattern.pattern.lastIndex = 0;
        if (pattern.pattern.test(nodeText)) {
          const hasReceipt = hasReceiptNearby(code, node.getEnd());

          toolCalls.push({
            tool: pattern.tool,
            line,
            column,
            code: nodeText.substring(0, 100),
            destructive: pattern.destructive,
            hasReceipt,
          });

          if (pattern.requiresReceipt && !hasReceipt) {
            const classification = classifyIssue('FK001', pattern.tool);
            const fixInfo = getFixInfo('FK001', pattern.tool);

            issues.push({
              ruleId: 'FK001',
              line,
              column,
              endLine: endPos.line,
              endColumn: endPos.column,
              message: `${pattern.tool} operation without receipt generation. Destructive operations should generate audit receipts.`,
              severity: classification.issueSeverity === 'critical' ? 'error' : 'warning',
              code: nodeText.substring(0, 80),
              suggestion: fixInfo.fixHint,
              issueSeverity: classification.issueSeverity,
              businessImpact: classification.businessImpact,
              category: classification.category,
              fixHint: fixInfo.fixHint,
              exampleFix: fixInfo.exampleFix,
              docLink: fixInfo.docLink,
              estimatedFixTime: classification.estimatedFixTime,
              riskScore: classification.riskScore,
              rootCause: getRootCause('FK001', pattern.tool, filePath),
              reproductionSteps: getReproductionSteps('FK001', pattern.tool, line, filePath),
            });
          }
          break;
        }
      }

      // Check LLM patterns
      for (const pattern of LLM_PATTERNS) {
        pattern.pattern.lastIndex = 0;
        if (pattern.pattern.test(nodeText)) {
          const hasErrorHandling = hasErrorHandlingNearby(code, node.getStart(sourceFile));
          const resilience = hasLLMResilience(code, node.getStart(sourceFile));

          llmCalls.push({
            provider: pattern.provider,
            line,
            column,
            code: nodeText.substring(0, 100),
            hasErrorHandling,
          });

          // FK002: Missing error handling
          if (pattern.requiresErrorHandling && !hasErrorHandling) {
            const classification = classifyIssue('FK002', pattern.provider);
            const fixInfo = getFixInfo('FK002', pattern.provider);

            issues.push({
              ruleId: 'FK002',
              line,
              column,
              endLine: endPos.line,
              endColumn: endPos.column,
              message: `${pattern.provider} LLM call without error handling. LLM calls can fail and should be wrapped in try/catch.`,
              severity: 'warning',
              code: nodeText.substring(0, 80),
              suggestion: fixInfo.fixHint,
              issueSeverity: classification.issueSeverity,
              businessImpact: classification.businessImpact,
              category: classification.category,
              fixHint: fixInfo.fixHint,
              exampleFix: fixInfo.exampleFix,
              docLink: fixInfo.docLink,
              estimatedFixTime: classification.estimatedFixTime,
              riskScore: classification.riskScore,
              rootCause: getRootCause('FK002', pattern.provider, filePath),
              reproductionSteps: getReproductionSteps('FK002', pattern.provider, line, filePath),
            });
          }

          // FK005: Missing timeout/retry
          if (!resilience.hasTimeout && !resilience.hasRetry) {
            const classification = classifyIssue('FK005', pattern.provider);
            const fixInfo = getFixInfo('FK005', pattern.provider);

            issues.push({
              ruleId: 'FK005',
              line,
              column,
              endLine: endPos.line,
              endColumn: endPos.column,
              message: `${pattern.provider} LLM call without timeout/retry. Add resilience patterns for production readiness.`,
              severity: 'info',
              code: nodeText.substring(0, 80),
              suggestion: fixInfo.fixHint,
              issueSeverity: classification.issueSeverity,
              businessImpact: classification.businessImpact,
              category: classification.category,
              fixHint: fixInfo.fixHint,
              exampleFix: fixInfo.exampleFix,
              docLink: fixInfo.docLink,
              estimatedFixTime: classification.estimatedFixTime,
              riskScore: classification.riskScore,
              rootCause: getRootCause('FK005', pattern.provider, filePath),
              reproductionSteps: getReproductionSteps('FK005', pattern.provider, line, filePath),
            });
          }
          break;
        }
      }

      // Check agent patterns
      for (const pattern of AGENT_PATTERNS) {
        pattern.pattern.lastIndex = 0;
        if (pattern.pattern.test(nodeText)) {
          const hasReceipt = hasReceiptNearby(code, node.getEnd());
          const hasErrorHandling = hasErrorHandlingNearby(code, node.getStart(sourceFile));
          const provenance = hasProvenanceMetadata(code, node.getEnd());

          agentCalls.push({
            framework: pattern.framework,
            line,
            column,
            code: nodeText.substring(0, 100),
            methodType: pattern.methodType,
          });

          if (!hasReceipt) {
            const classification = classifyIssue('FK001', 'agent');
            const fixInfo = getFixInfo('FK001', 'agent');

            issues.push({
              ruleId: 'FK001',
              line,
              column,
              endLine: endPos.line,
              endColumn: endPos.column,
              message: `${pattern.framework} agent ${pattern.methodType}() without receipt generation. Agent actions should be auditable.`,
              severity: 'warning',
              code: nodeText.substring(0, 80),
              suggestion: fixInfo.fixHint,
              issueSeverity: classification.issueSeverity,
              businessImpact: classification.businessImpact,
              category: classification.category,
              fixHint: fixInfo.fixHint,
              exampleFix: fixInfo.exampleFix,
              docLink: fixInfo.docLink,
              estimatedFixTime: classification.estimatedFixTime,
              rootCause: getRootCause('FK001', pattern.framework, filePath),
              reproductionSteps: getReproductionSteps('FK001', pattern.framework, line, filePath),
              riskScore: classification.riskScore,
            });
          }

          if (!hasErrorHandling) {
            const classification = classifyIssue('FK002', 'agent');
            const fixInfo = getFixInfo('FK002', 'agent');

            issues.push({
              ruleId: 'FK002',
              line,
              column,
              endLine: endPos.line,
              endColumn: endPos.column,
              message: `${pattern.framework} agent call without error handling. Agent executions can fail unpredictably.`,
              severity: 'warning',
              code: nodeText.substring(0, 80),
              suggestion: fixInfo.fixHint,
              issueSeverity: classification.issueSeverity,
              businessImpact: classification.businessImpact,
              category: classification.category,
              fixHint: fixInfo.fixHint,
              exampleFix: fixInfo.exampleFix,
              docLink: fixInfo.docLink,
              estimatedFixTime: classification.estimatedFixTime,
              riskScore: classification.riskScore,
              rootCause: getRootCause('FK002', pattern.framework, filePath),
              reproductionSteps: getReproductionSteps('FK002', pattern.framework, line, filePath),
            });
          }

          // FK006: Missing provenance metadata
          if (provenance.missingFields.length > 0) {
            const classification = classifyIssue('FK006', pattern.framework);
            const fixInfo = getFixInfo('FK006', pattern.framework);

            issues.push({
              ruleId: 'FK006',
              line,
              column,
              endLine: endPos.line,
              endColumn: endPos.column,
              message: `${pattern.framework} agent action missing provenance metadata: ${provenance.missingFields.join(', ')}. Add action_id and timestamp for audit trail.`,
              severity: 'info',
              code: nodeText.substring(0, 80),
              suggestion: fixInfo.fixHint,
              issueSeverity: classification.issueSeverity,
              businessImpact: classification.businessImpact,
              category: classification.category,
              fixHint: fixInfo.fixHint,
              exampleFix: fixInfo.exampleFix,
              docLink: fixInfo.docLink,
              estimatedFixTime: classification.estimatedFixTime,
              riskScore: classification.riskScore,
              rootCause: getRootCause('FK006', pattern.framework, filePath),
              reproductionSteps: getReproductionSteps('FK006', pattern.framework, line, filePath),
            });
          }
          break;
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // ============================================
  // NEW: Secret detection (FK003, FK007)
  // ============================================
  if (!isConfigFile(filePath)) {
    const secrets = findSecrets(code);
    for (const { pattern, match, position } of secrets) {
      const lineAndChar = sourceFile.getLineAndCharacterOfPosition(position);
      const line = lineAndChar.line;
      const column = lineAndChar.character;
      
      // Check disable comment
      const currentLine = lines[line] || '';
      const previousLine = line > 0 ? lines[line - 1] : undefined;
      if (hasDisableComment(currentLine, previousLine)) continue;
      
      const ruleId = pattern.type === 'hardcoded_password' || pattern.type.includes('secret') ? 'FK007' : 'FK003';
      const classification = classifyIssue(ruleId, pattern.type);
      const fixInfo = getFixInfo(ruleId, pattern.type);
      
      issues.push({
        ruleId,
        line,
        column,
        endLine: line,
        endColumn: column + match[0].length,
        message: `${pattern.description} detected. ${ruleId === 'FK007' ? 'Hardcoded credentials' : 'Secrets'} should not be committed to source code.`,
        severity: 'error',
        code: match[0].substring(0, 20) + '...',
        suggestion: fixInfo.fixHint,
        issueSeverity: classification.issueSeverity,
        businessImpact: classification.businessImpact,
        category: classification.category,
        fixHint: fixInfo.fixHint,
        exampleFix: fixInfo.exampleFix,
        docLink: fixInfo.docLink,
        estimatedFixTime: classification.estimatedFixTime,
        riskScore: classification.riskScore,
        rootCause: getRootCause(ruleId, pattern.type, filePath),
        reproductionSteps: getReproductionSteps(ruleId, pattern.type, line, filePath),
      });
    }
  }

  // ============================================
  // NEW: Side-effect detection (FK004)
  // ============================================
  for (const sideEffect of SIDE_EFFECT_PATTERNS) {
    sideEffect.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = sideEffect.pattern.exec(code)) !== null) {
      const position = match.index;
      const lineAndChar = sourceFile.getLineAndCharacterOfPosition(position);
      const line = lineAndChar.line;
      const column = lineAndChar.character;
      
      // Check disable comment
      const currentLine = lines[line] || '';
      const previousLine = line > 0 ? lines[line - 1] : undefined;
      if (hasDisableComment(currentLine, previousLine)) continue;
      
      // Skip if confirmation exists
      if (sideEffect.requiresConfirmation && !hasSideEffectConfirmation(code, position)) {
        const classification = classifyIssue('FK004', sideEffect.action);
        const fixInfo = getFixInfo('FK004', sideEffect.action);
        
        issues.push({
          ruleId: 'FK004',
          line,
          column,
          endLine: line,
          endColumn: column + match[0].length,
          message: `${sideEffect.description} without confirmation. Destructive operations should require explicit consent.`,
          severity: sideEffect.severity === 'critical' ? 'error' : 'warning',
          code: match[0],
          suggestion: fixInfo.fixHint,
          issueSeverity: sideEffect.severity === 'critical' ? 'critical' : sideEffect.severity === 'high' ? 'high' : 'medium',
          businessImpact: classification.businessImpact,
          category: classification.category,
          fixHint: fixInfo.fixHint,
          exampleFix: fixInfo.exampleFix,
          docLink: fixInfo.docLink,
          estimatedFixTime: classification.estimatedFixTime,
          riskScore: classification.riskScore,
          rootCause: getRootCause('FK004', sideEffect.action, filePath),
          reproductionSteps: getReproductionSteps('FK004', sideEffect.action, line, filePath),
        });
      }
    }
  }

  // Deduplicate issues by line and ruleId
  const uniqueIssues = deduplicateIssues(issues);

  // Calculate summary
  const shipDecision = calculateShipDecision(uniqueIssues);
  const summary: AnalysisSummary = {
    totalIssues: uniqueIssues.length,
    criticalCount: uniqueIssues.filter(i => i.issueSeverity === 'critical').length,
    highCount: uniqueIssues.filter(i => i.issueSeverity === 'high').length,
    mediumCount: uniqueIssues.filter(i => i.issueSeverity === 'medium').length,
    lowCount: uniqueIssues.filter(i => i.issueSeverity === 'low').length,
    receiptMissing: uniqueIssues.filter(i => i.category === 'receipt_missing').length,
    errorHandlingMissing: uniqueIssues.filter(i => i.category === 'error_handling').length,
    riskScore: uniqueIssues.length > 0
      ? Math.round(uniqueIssues.reduce((sum, i) => sum + i.riskScore, 0) / uniqueIssues.length)
      : 0,
    shipDecision: shipDecision.decision,
    shipReason: shipDecision.reason,
  };

  return {
    issues: uniqueIssues,
    toolCalls,
    llmCalls,
    agentCalls,
    summary,
  };
}

/**
 * Remove duplicate issues on the same line with the same rule
 */
function deduplicateIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter(issue => {
    const key = `${issue.ruleId}:${issue.line}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Quick pattern-based analysis (faster, less accurate)
 * Used for initial pass before full AST analysis
 */
export function quickAnalyze(code: string): { hasAgentCode: boolean; patternMatches: number } {
  let patternMatches = 0;

  for (const pattern of [...TOOL_PATTERNS, ...LLM_PATTERNS, ...AGENT_PATTERNS]) {
    pattern.pattern.lastIndex = 0;
    const matches = code.match(pattern.pattern);
    if (matches) {
      patternMatches += matches.length;
    }
  }

  return {
    hasAgentCode: patternMatches > 0,
    patternMatches,
  };
}
