/**
 * F.A.I.L. Kit Receipt Blueprint Generator
 *
 * Generates standardized receipt scaffolding for tool calls.
 * Receipts provide cryptographic proof of agent actions.
 */

import { Issue } from '../../analyzer';
import { Blueprint, BlueprintContext, BlueprintGenerator } from './types';

/**
 * Receipt template configurations per tool category
 */
const RECEIPT_TEMPLATES: Record<string, (ctx: BlueprintContext) => string> = {
  database: (ctx) => `
${ctx.indent}// F.A.I.L. Kit: Generate receipt for database operation
${ctx.indent}const ${ctx.resultVariableName || 'result'}Receipt = {
${ctx.indent}  action_id: \`act_\${Date.now().toString(36)}_\${Math.random().toString(36).substr(2, 9)}\`,
${ctx.indent}  tool_name: '${ctx.toolName}',
${ctx.indent}  tool_category: 'database',
${ctx.indent}  operation: '${ctx.operationType}',
${ctx.indent}  timestamp: new Date().toISOString(),
${ctx.indent}  status: 'success',
${ctx.indent}  input_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.variableName || 'input'})).digest('hex'),
${ctx.indent}  output_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.resultVariableName || 'result'})).digest('hex'),
${ctx.indent}  metadata: {
${ctx.indent}    table: undefined, // TODO: Add table name
${ctx.indent}    affected_rows: ${ctx.resultVariableName || 'result'}?.count ?? 1,
${ctx.indent}  },
${ctx.indent}};
${ctx.indent}AuditLogger.logAction(${ctx.resultVariableName || 'result'}Receipt);
`,

  payment: (ctx) => `
${ctx.indent}// F.A.I.L. Kit: Generate receipt for payment operation (CRITICAL)
${ctx.indent}const ${ctx.resultVariableName || 'payment'}Receipt = {
${ctx.indent}  action_id: \`pay_\${Date.now().toString(36)}_\${Math.random().toString(36).substr(2, 9)}\`,
${ctx.indent}  tool_name: '${ctx.toolName}',
${ctx.indent}  tool_category: 'payment',
${ctx.indent}  operation: '${ctx.operationType}',
${ctx.indent}  timestamp: new Date().toISOString(),
${ctx.indent}  status: 'success',
${ctx.indent}  input_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.variableName || 'paymentInput'})).digest('hex'),
${ctx.indent}  output_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.resultVariableName || 'result'})).digest('hex'),
${ctx.indent}  metadata: {
${ctx.indent}    amount: ${ctx.resultVariableName || 'result'}?.amount,
${ctx.indent}    currency: ${ctx.resultVariableName || 'result'}?.currency,
${ctx.indent}    transaction_id: ${ctx.resultVariableName || 'result'}?.id,
${ctx.indent}    customer_id: ${ctx.resultVariableName || 'result'}?.customer,
${ctx.indent}  },
${ctx.indent}  compliance: {
${ctx.indent}    pci_logged: true,
${ctx.indent}    audit_required: true,
${ctx.indent}  },
${ctx.indent}};
${ctx.indent}AuditLogger.logAction(${ctx.resultVariableName || 'payment'}Receipt);
`,

  email: (ctx) => `
${ctx.indent}// F.A.I.L. Kit: Generate receipt for email/messaging operation
${ctx.indent}const ${ctx.resultVariableName || 'message'}Receipt = {
${ctx.indent}  action_id: \`msg_\${Date.now().toString(36)}_\${Math.random().toString(36).substr(2, 9)}\`,
${ctx.indent}  tool_name: '${ctx.toolName}',
${ctx.indent}  tool_category: 'messaging',
${ctx.indent}  operation: 'send',
${ctx.indent}  timestamp: new Date().toISOString(),
${ctx.indent}  status: 'success',
${ctx.indent}  input_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.variableName || 'messageInput'})).digest('hex'),
${ctx.indent}  output_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.resultVariableName || 'result'})).digest('hex'),
${ctx.indent}  metadata: {
${ctx.indent}    recipient_hash: require('crypto').createHash('sha256').update(${ctx.variableName || 'messageInput'}?.to || '').digest('hex'),
${ctx.indent}    message_id: ${ctx.resultVariableName || 'result'}?.messageId,
${ctx.indent}    channel: '${ctx.toolName.includes('sms') ? 'sms' : 'email'}',
${ctx.indent}  },
${ctx.indent}};
${ctx.indent}AuditLogger.logAction(${ctx.resultVariableName || 'message'}Receipt);
`,

  file: (ctx) => `
${ctx.indent}// F.A.I.L. Kit: Generate receipt for file operation
${ctx.indent}const ${ctx.resultVariableName || 'file'}Receipt = {
${ctx.indent}  action_id: \`file_\${Date.now().toString(36)}_\${Math.random().toString(36).substr(2, 9)}\`,
${ctx.indent}  tool_name: '${ctx.toolName}',
${ctx.indent}  tool_category: 'file_system',
${ctx.indent}  operation: '${ctx.operationType}',
${ctx.indent}  timestamp: new Date().toISOString(),
${ctx.indent}  status: 'success',
${ctx.indent}  input_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.variableName || 'filePath'})).digest('hex'),
${ctx.indent}  output_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.resultVariableName || 'result'} ?? 'void')).digest('hex'),
${ctx.indent}  metadata: {
${ctx.indent}    path: ${ctx.variableName || 'filePath'},
${ctx.indent}    operation_type: '${ctx.operationType}',
${ctx.indent}    is_destructive: ${ctx.isDestructive},
${ctx.indent}  },
${ctx.indent}};
${ctx.indent}AuditLogger.logAction(${ctx.resultVariableName || 'file'}Receipt);
`,

  http: (ctx) => `
${ctx.indent}// F.A.I.L. Kit: Generate receipt for HTTP request
${ctx.indent}const ${ctx.resultVariableName || 'http'}Receipt = {
${ctx.indent}  action_id: \`http_\${Date.now().toString(36)}_\${Math.random().toString(36).substr(2, 9)}\`,
${ctx.indent}  tool_name: '${ctx.toolName}',
${ctx.indent}  tool_category: 'http_request',
${ctx.indent}  operation: '${ctx.operationType}',
${ctx.indent}  timestamp: new Date().toISOString(),
${ctx.indent}  status: 'success',
${ctx.indent}  input_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.variableName || 'requestConfig'})).digest('hex'),
${ctx.indent}  output_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.resultVariableName || 'response'}?.data ?? ${ctx.resultVariableName || 'response'})).digest('hex'),
${ctx.indent}  metadata: {
${ctx.indent}    method: '${ctx.operationType.toUpperCase()}',
${ctx.indent}    status_code: ${ctx.resultVariableName || 'response'}?.status,
${ctx.indent}    url_hash: require('crypto').createHash('sha256').update(${ctx.variableName || 'url'} || '').digest('hex'),
${ctx.indent}  },
${ctx.indent}};
${ctx.indent}AuditLogger.logAction(${ctx.resultVariableName || 'http'}Receipt);
`,

  agent: (ctx) => `
${ctx.indent}// F.A.I.L. Kit: Generate receipt for agent action
${ctx.indent}const ${ctx.resultVariableName || 'agent'}Receipt = {
${ctx.indent}  action_id: \`agent_\${Date.now().toString(36)}_\${Math.random().toString(36).substr(2, 9)}\`,
${ctx.indent}  tool_name: '${ctx.toolName}',
${ctx.indent}  tool_category: 'agent',
${ctx.indent}  operation: '${ctx.operationType}',
${ctx.indent}  timestamp: new Date().toISOString(),
${ctx.indent}  status: 'success',
${ctx.indent}  input_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.variableName || 'agentInput'})).digest('hex'),
${ctx.indent}  output_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.resultVariableName || 'result'})).digest('hex'),
${ctx.indent}  metadata: {
${ctx.indent}    framework: '${ctx.provider || 'unknown'}',
${ctx.indent}    steps_executed: ${ctx.resultVariableName || 'result'}?.steps?.length ?? 1,
${ctx.indent}    tools_invoked: ${ctx.resultVariableName || 'result'}?.toolCalls?.map((t: any) => t.name) ?? [],
${ctx.indent}  },
${ctx.indent}  provenance: {
${ctx.indent}    trace_id: context?.traceId,
${ctx.indent}    parent_action_id: context?.parentActionId,
${ctx.indent}  },
${ctx.indent}};
${ctx.indent}AuditLogger.logAction(${ctx.resultVariableName || 'agent'}Receipt);
`,

  llm: (ctx) => `
${ctx.indent}// F.A.I.L. Kit: Generate receipt for LLM call
${ctx.indent}const ${ctx.resultVariableName || 'llm'}Receipt = {
${ctx.indent}  action_id: \`llm_\${Date.now().toString(36)}_\${Math.random().toString(36).substr(2, 9)}\`,
${ctx.indent}  tool_name: '${ctx.toolName}',
${ctx.indent}  tool_category: 'llm',
${ctx.indent}  operation: 'inference',
${ctx.indent}  timestamp: new Date().toISOString(),
${ctx.indent}  status: 'success',
${ctx.indent}  input_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.variableName || 'prompt'})).digest('hex'),
${ctx.indent}  output_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.resultVariableName || 'response'})).digest('hex'),
${ctx.indent}  metadata: {
${ctx.indent}    provider: '${ctx.provider || 'unknown'}',
${ctx.indent}    model: ${ctx.variableName || 'config'}?.model ?? 'unknown',
${ctx.indent}    tokens_used: ${ctx.resultVariableName || 'response'}?.usage?.total_tokens,
${ctx.indent}    finish_reason: ${ctx.resultVariableName || 'response'}?.choices?.[0]?.finish_reason,
${ctx.indent}  },
${ctx.indent}};
${ctx.indent}AuditLogger.logAction(${ctx.resultVariableName || 'llm'}Receipt);
`,

  generic: (ctx) => `
${ctx.indent}// F.A.I.L. Kit: Generate receipt for tool operation
${ctx.indent}const ${ctx.resultVariableName || 'tool'}Receipt = {
${ctx.indent}  action_id: \`act_\${Date.now().toString(36)}_\${Math.random().toString(36).substr(2, 9)}\`,
${ctx.indent}  tool_name: '${ctx.toolName}',
${ctx.indent}  tool_category: 'generic',
${ctx.indent}  operation: '${ctx.operationType}',
${ctx.indent}  timestamp: new Date().toISOString(),
${ctx.indent}  status: 'success',
${ctx.indent}  input_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.variableName || 'input'})).digest('hex'),
${ctx.indent}  output_hash: require('crypto').createHash('sha256').update(JSON.stringify(${ctx.resultVariableName || 'result'})).digest('hex'),
${ctx.indent}};
${ctx.indent}AuditLogger.logAction(${ctx.resultVariableName || 'tool'}Receipt);
`,
};

/**
 * Generate receipt blueprint for FK001 issues
 */
export const generateReceiptBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  if (issue.ruleId !== 'FK001') {
    return null;
  }

  const template = RECEIPT_TEMPLATES[context.toolCategory] || RECEIPT_TEMPLATES.generic;
  const code = template(context);

  return {
    id: `receipt-${context.toolCategory}-${Date.now()}`,
    name: `Receipt Generation: ${context.toolName}`,
    description: `Generate cryptographic receipt for ${context.toolName} ${context.operationType} operation`,
    code,
    insertPosition: 'after',
    confidence: context.toolCategory === 'generic' ? 85 : 95,
    impact: context.isDestructive ? 'moderate' : 'safe',
    requiredImports: [
      { module: '@fail-kit/core', named: ['AuditLogger'] },
    ],
    tags: ['receipt', context.toolCategory, context.operationType],
  };
};

/**
 * Generate compact receipt for simple operations
 */
export const generateCompactReceiptBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  if (issue.ruleId !== 'FK001') {
    return null;
  }

  const code = `
${context.indent}// F.A.I.L. Kit: Quick receipt
${context.indent}AuditLogger.logAction({
${context.indent}  action_id: \`act_\${Date.now().toString(36)}\`,
${context.indent}  tool_name: '${context.toolName}',
${context.indent}  timestamp: new Date().toISOString(),
${context.indent}  status: 'success',
${context.indent}  input_hash: require('crypto').createHash('sha256').update(JSON.stringify(${context.variableName || 'input'})).digest('hex'),
${context.indent}  output_hash: require('crypto').createHash('sha256').update(JSON.stringify(${context.resultVariableName || 'result'})).digest('hex'),
${context.indent}});
`;

  return {
    id: `compact-receipt-${Date.now()}`,
    name: `Compact Receipt: ${context.toolName}`,
    description: `Minimal receipt for ${context.toolName} operation`,
    code,
    insertPosition: 'after',
    confidence: 90,
    impact: 'safe',
    requiredImports: [
      { module: '@fail-kit/core', named: ['AuditLogger'] },
    ],
    tags: ['receipt', 'compact'],
  };
};

/**
 * Generate receipt with error handling wrapper
 */
export const generateReceiptWithErrorBlueprint: BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
): Blueprint | null => {
  if (issue.ruleId !== 'FK001') {
    return null;
  }

  const template = RECEIPT_TEMPLATES[context.toolCategory] || RECEIPT_TEMPLATES.generic;
  const successReceipt = template(context).trim();
  
  // Extract indentation and build error receipt
  const errorReceipt = successReceipt
    .replace(/status: 'success'/g, "status: 'failure'")
    .replace(/output_hash:.*$/gm, `output_hash: require('crypto').createHash('sha256').update(JSON.stringify(error)).digest('hex'),`);

  const code = `
${context.indent}let ${context.resultVariableName || 'result'};
${context.indent}try {
${context.innerIndent}${context.originalCode.trim()}
${successReceipt}
${context.indent}} catch (error) {
${errorReceipt.replace(new RegExp(`^${context.indent}`, 'gm'), context.innerIndent)}
${context.innerIndent}throw error;
${context.indent}}
`;

  return {
    id: `receipt-error-${context.toolCategory}-${Date.now()}`,
    name: `Receipt with Error Handling: ${context.toolName}`,
    description: `Generate receipt for both success and failure cases`,
    code,
    insertPosition: 'replace',
    confidence: 90,
    impact: 'moderate',
    requiredImports: [
      { module: '@fail-kit/core', named: ['AuditLogger'] },
    ],
    tags: ['receipt', 'error-handling', context.toolCategory],
  };
};
