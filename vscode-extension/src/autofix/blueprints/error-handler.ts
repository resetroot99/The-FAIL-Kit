/**
 * F.A.I.L. Kit Error Handler Blueprint Generator
 *
 * Generates standardized error handling wrappers with policy escalation.
 */

import { Issue } from '../../analyzer';
import { Blueprint, BlueprintContext, BlueprintGenerator } from './types';

/**
 * Standard try-catch wrapper with policy escalation
 */
export const generateTryCatchBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  if (issue.ruleId !== 'FK002') {
    return null;
  }

  const code = `
${context.indent}try {
${context.innerIndent}${context.originalCode.trim()}
${context.indent}} catch (error) {
${context.innerIndent}// F.A.I.L. Kit: Log failure and escalate
${context.innerIndent}AuditLogger.logFailure({
${context.innerIndent}  action_id: \`err_\${Date.now().toString(36)}\`,
${context.innerIndent}  tool_name: '${context.toolName}',
${context.innerIndent}  timestamp: new Date().toISOString(),
${context.innerIndent}  status: 'failure',
${context.innerIndent}  error_type: error instanceof Error ? error.name : 'UnknownError',
${context.innerIndent}  error_message: error instanceof Error ? error.message : String(error),
${context.innerIndent}  stack_trace: error instanceof Error ? error.stack : undefined,
${context.innerIndent}});
${context.innerIndent}
${context.innerIndent}// Escalate to policy gate
${context.innerIndent}if (typeof policy !== 'undefined') {
${context.innerIndent}  policy.escalate = true;
${context.innerIndent}  policy.reasons = policy.reasons || [];
${context.innerIndent}  policy.reasons.push(\`${context.toolName} failed: \${error instanceof Error ? error.message : String(error)}\`);
${context.innerIndent}}
${context.innerIndent}
${context.innerIndent}throw error;
${context.indent}}
`;

  return {
    id: `try-catch-${context.toolName}-${Date.now()}`,
    name: `Error Handler: ${context.toolName}`,
    description: `Wrap ${context.toolName} call in try-catch with policy escalation`,
    code,
    insertPosition: 'replace',
    confidence: 90,
    impact: 'safe',
    requiredImports: [
      { module: '@fail-kit/core', named: ['AuditLogger'] },
    ],
    tags: ['error-handling', 'policy', context.toolCategory],
  };
};

/**
 * Async error handler with retry support
 */
export const generateRetryHandlerBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  if (issue.ruleId !== 'FK002' && issue.ruleId !== 'FK005') {
    return null;
  }

  const code = `
${context.indent}// F.A.I.L. Kit: Retry wrapper with exponential backoff
${context.indent}const ${context.resultVariableName || 'result'} = await withRetry(
${context.innerIndent}async () => {
${context.innerIndent}  ${context.originalCode.trim()}
${context.innerIndent}},
${context.innerIndent}{
${context.innerIndent}  maxRetries: 3,
${context.innerIndent}  initialDelayMs: 1000,
${context.innerIndent}  backoffMultiplier: 2,
${context.innerIndent}  onRetry: (error, attempt) => {
${context.innerIndent}    AuditLogger.logRetry({
${context.innerIndent}      action_id: \`retry_\${Date.now().toString(36)}\`,
${context.innerIndent}      tool_name: '${context.toolName}',
${context.innerIndent}      attempt,
${context.innerIndent}      error_message: error instanceof Error ? error.message : String(error),
${context.innerIndent}      timestamp: new Date().toISOString(),
${context.innerIndent}    });
${context.innerIndent}  },
${context.innerIndent}  onFinalFailure: (error) => {
${context.innerIndent}    if (typeof policy !== 'undefined') {
${context.innerIndent}      policy.escalate = true;
${context.innerIndent}      policy.reasons = policy.reasons || [];
${context.innerIndent}      policy.reasons.push(\`${context.toolName} failed after retries: \${error instanceof Error ? error.message : String(error)}\`);
${context.innerIndent}    }
${context.innerIndent}  },
${context.innerIndent}}
${context.indent});
`;

  return {
    id: `retry-handler-${context.toolName}-${Date.now()}`,
    name: `Retry Handler: ${context.toolName}`,
    description: `Add retry logic with exponential backoff for ${context.toolName}`,
    code,
    insertPosition: 'replace',
    confidence: 85,
    impact: 'moderate',
    requiredImports: [
      { module: '@fail-kit/core', named: ['AuditLogger', 'withRetry'] },
    ],
    tags: ['error-handling', 'retry', 'resilience', context.toolCategory],
  };
};

/**
 * LLM-specific error handler with timeout
 */
export const generateLLMErrorHandlerBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  if (issue.ruleId !== 'FK002' && issue.ruleId !== 'FK005') {
    return null;
  }
  
  if (context.toolCategory !== 'llm') {
    return null;
  }

  const code = `
${context.indent}// F.A.I.L. Kit: LLM call with timeout and error handling
${context.indent}const ${context.resultVariableName || 'llmResult'} = await Promise.race([
${context.innerIndent}(async () => {
${context.innerIndent}  try {
${context.innerIndent}    ${context.originalCode.trim()}
${context.innerIndent}    
${context.innerIndent}    AuditLogger.logAction({
${context.innerIndent}      action_id: \`llm_\${Date.now().toString(36)}\`,
${context.innerIndent}      tool_name: '${context.toolName}',
${context.innerIndent}      provider: '${context.provider || 'unknown'}',
${context.innerIndent}      timestamp: new Date().toISOString(),
${context.innerIndent}      status: 'success',
${context.innerIndent}      duration_ms: Date.now() - startTime,
${context.innerIndent}    });
${context.innerIndent}    
${context.innerIndent}    return ${context.resultVariableName || 'result'};
${context.innerIndent}  } catch (error) {
${context.innerIndent}    AuditLogger.logFailure({
${context.innerIndent}      action_id: \`llm_err_\${Date.now().toString(36)}\`,
${context.innerIndent}      tool_name: '${context.toolName}',
${context.innerIndent}      provider: '${context.provider || 'unknown'}',
${context.innerIndent}      timestamp: new Date().toISOString(),
${context.innerIndent}      status: 'failure',
${context.innerIndent}      error_type: error instanceof Error ? error.name : 'LLMError',
${context.innerIndent}      error_message: error instanceof Error ? error.message : String(error),
${context.innerIndent}    });
${context.innerIndent}    
${context.innerIndent}    if (typeof policy !== 'undefined') {
${context.innerIndent}      policy.escalate = true;
${context.innerIndent}      policy.reasons = policy.reasons || [];
${context.innerIndent}      policy.reasons.push(\`LLM call failed: \${error instanceof Error ? error.message : String(error)}\`);
${context.innerIndent}    }
${context.innerIndent}    
${context.innerIndent}    throw error;
${context.innerIndent}  }
${context.innerIndent}})(),
${context.innerIndent}new Promise((_, reject) => 
${context.innerIndent}  setTimeout(() => {
${context.innerIndent}    const timeoutError = new Error('LLM call timed out after 30000ms');
${context.innerIndent}    AuditLogger.logFailure({
${context.innerIndent}      action_id: \`llm_timeout_\${Date.now().toString(36)}\`,
${context.innerIndent}      tool_name: '${context.toolName}',
${context.innerIndent}      provider: '${context.provider || 'unknown'}',
${context.innerIndent}      timestamp: new Date().toISOString(),
${context.innerIndent}      status: 'timeout',
${context.innerIndent}      error_message: timeoutError.message,
${context.innerIndent}    });
${context.innerIndent}    reject(timeoutError);
${context.innerIndent}  }, 30000)
${context.innerIndent})
${context.indent}]);
`;

  return {
    id: `llm-error-handler-${Date.now()}`,
    name: `LLM Error Handler with Timeout`,
    description: `Comprehensive error handling for LLM calls with 30s timeout`,
    code,
    insertPosition: 'replace',
    confidence: 88,
    impact: 'moderate',
    requiredImports: [
      { module: '@fail-kit/core', named: ['AuditLogger'] },
    ],
    tags: ['error-handling', 'llm', 'timeout', 'resilience'],
  };
};

/**
 * Graceful degradation handler with fallback
 */
export const generateGracefulDegradationBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  if (issue.ruleId !== 'FK002') {
    return null;
  }

  const code = `
${context.indent}// F.A.I.L. Kit: Graceful degradation with fallback
${context.indent}let ${context.resultVariableName || 'result'};
${context.indent}try {
${context.innerIndent}${context.originalCode.trim()}
${context.indent}} catch (error) {
${context.innerIndent}AuditLogger.logFailure({
${context.innerIndent}  action_id: \`degrade_\${Date.now().toString(36)}\`,
${context.innerIndent}  tool_name: '${context.toolName}',
${context.innerIndent}  timestamp: new Date().toISOString(),
${context.innerIndent}  status: 'degraded',
${context.innerIndent}  error_message: error instanceof Error ? error.message : String(error),
${context.innerIndent}  fallback_used: true,
${context.innerIndent}});
${context.innerIndent}
${context.innerIndent}// Fallback response - customize based on your needs
${context.innerIndent}${context.resultVariableName || 'result'} = {
${context.innerIndent}  success: false,
${context.innerIndent}  degraded: true,
${context.innerIndent}  message: 'Service temporarily unavailable. Using cached/default response.',
${context.innerIndent}  originalError: error instanceof Error ? error.message : String(error),
${context.innerIndent}};
${context.innerIndent}
${context.innerIndent}// Don't escalate for graceful degradation, but log
${context.innerIndent}console.warn('[F.A.I.L. Kit] Graceful degradation activated for ${context.toolName}');
${context.indent}}
`;

  return {
    id: `graceful-degradation-${context.toolName}-${Date.now()}`,
    name: `Graceful Degradation: ${context.toolName}`,
    description: `Handle failures gracefully with fallback response`,
    code,
    insertPosition: 'replace',
    confidence: 80,
    impact: 'moderate',
    requiredImports: [
      { module: '@fail-kit/core', named: ['AuditLogger'] },
    ],
    tags: ['error-handling', 'fallback', 'degradation', context.toolCategory],
  };
};
