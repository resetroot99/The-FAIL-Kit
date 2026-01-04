/**
 * F.A.I.L. Kit Pattern Definitions
 *
 * Shared patterns for detecting agent code, tool calls, and LLM invocations.
 * Extracted and enhanced from cli/src/scanner.js for TypeScript usage.
 */

export interface ToolPattern {
  pattern: RegExp;
  tool: string;
  destructive: boolean;
  requiresReceipt: boolean;
}

// ============================================
// NEW: Secret detection patterns (FK003, FK007)
// ============================================

export interface SecretPattern {
  pattern: RegExp;
  type: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  // Stripe keys
  { pattern: /['"`]sk[-_]live[-_][a-zA-Z0-9]{20,}['"`]/g, type: 'stripe_secret_key', severity: 'critical', description: 'Stripe live secret key' },
  { pattern: /['"`]sk[-_]test[-_][a-zA-Z0-9]{20,}['"`]/g, type: 'stripe_test_key', severity: 'high', description: 'Stripe test secret key' },
  { pattern: /['"`]pk[-_]live[-_][a-zA-Z0-9]{20,}['"`]/g, type: 'stripe_publishable_key', severity: 'medium', description: 'Stripe live publishable key' },
  
  // AWS keys
  { pattern: /['"`]AKIA[A-Z0-9]{16}['"`]/g, type: 'aws_access_key', severity: 'critical', description: 'AWS Access Key ID' },
  { pattern: /['"`][A-Za-z0-9/+=]{40}['"`]/g, type: 'aws_secret_key', severity: 'critical', description: 'Potential AWS Secret Access Key' },
  
  // OpenAI keys
  { pattern: /['"`]sk-[a-zA-Z0-9]{32,}['"`]/g, type: 'openai_api_key', severity: 'critical', description: 'OpenAI API key' },
  
  // Generic API keys
  { pattern: /api[_-]?key\s*[:=]\s*['"`][^'"`]{20,}['"`]/gi, type: 'generic_api_key', severity: 'high', description: 'Generic API key assignment' },
  { pattern: /secret[_-]?key\s*[:=]\s*['"`][^'"`]{10,}['"`]/gi, type: 'generic_secret', severity: 'high', description: 'Generic secret key assignment' },
  { pattern: /password\s*[:=]\s*['"`][^'"`]{6,}['"`]/gi, type: 'hardcoded_password', severity: 'critical', description: 'Hardcoded password' },
  
  // GitHub tokens
  { pattern: /['"`]ghp_[a-zA-Z0-9]{36}['"`]/g, type: 'github_pat', severity: 'critical', description: 'GitHub Personal Access Token' },
  { pattern: /['"`]github_pat_[a-zA-Z0-9_]{22,}['"`]/g, type: 'github_fine_grained', severity: 'critical', description: 'GitHub Fine-grained PAT' },
  
  // Database connection strings
  { pattern: /['"`]postgres(ql)?:\/\/[^'"`]+['"`]/gi, type: 'postgres_uri', severity: 'high', description: 'PostgreSQL connection string' },
  { pattern: /['"`]mongodb(\+srv)?:\/\/[^'"`]+['"`]/gi, type: 'mongodb_uri', severity: 'high', description: 'MongoDB connection string' },
  { pattern: /['"`]mysql:\/\/[^'"`]+['"`]/gi, type: 'mysql_uri', severity: 'high', description: 'MySQL connection string' },
  
  // JWT secrets
  { pattern: /jwt[_-]?secret\s*[:=]\s*['"`][^'"`]{10,}['"`]/gi, type: 'jwt_secret', severity: 'critical', description: 'JWT secret key' },
];

// ============================================
// NEW: Side-effect patterns (FK004)
// ============================================

export interface SideEffectPattern {
  pattern: RegExp;
  action: string;
  severity: 'critical' | 'high' | 'medium';
  requiresConfirmation: boolean;
  description: string;
}

export const SIDE_EFFECT_PATTERNS: SideEffectPattern[] = [
  // Destructive operations
  { pattern: /\.delete\s*\(/g, action: 'delete', severity: 'high', requiresConfirmation: true, description: 'Delete operation' },
  { pattern: /\.remove\s*\(/g, action: 'remove', severity: 'high', requiresConfirmation: true, description: 'Remove operation' },
  { pattern: /\.destroy\s*\(/g, action: 'destroy', severity: 'critical', requiresConfirmation: true, description: 'Destroy operation' },
  { pattern: /\.truncate\s*\(/g, action: 'truncate', severity: 'critical', requiresConfirmation: true, description: 'Truncate operation' },
  { pattern: /\.drop\s*\(/g, action: 'drop', severity: 'critical', requiresConfirmation: true, description: 'Drop operation' },
  
  // Publishing/broadcasting
  { pattern: /\.publish\s*\(/g, action: 'publish', severity: 'medium', requiresConfirmation: true, description: 'Publish operation' },
  { pattern: /\.broadcast\s*\(/g, action: 'broadcast', severity: 'medium', requiresConfirmation: true, description: 'Broadcast operation' },
  { pattern: /\.emit\s*\(/g, action: 'emit', severity: 'medium', requiresConfirmation: false, description: 'Emit event' },
  
  // Sending operations
  { pattern: /\.send\s*\(/g, action: 'send', severity: 'medium', requiresConfirmation: true, description: 'Send operation' },
  { pattern: /\.sendEmail\s*\(/g, action: 'send_email', severity: 'high', requiresConfirmation: true, description: 'Send email' },
  { pattern: /\.sendSMS\s*\(/g, action: 'send_sms', severity: 'high', requiresConfirmation: true, description: 'Send SMS' },
  { pattern: /\.sendNotification\s*\(/g, action: 'send_notification', severity: 'medium', requiresConfirmation: true, description: 'Send notification' },
  
  // Financial operations
  { pattern: /\.charge\s*\(/g, action: 'charge', severity: 'critical', requiresConfirmation: true, description: 'Charge payment' },
  { pattern: /\.refund\s*\(/g, action: 'refund', severity: 'critical', requiresConfirmation: true, description: 'Refund payment' },
  { pattern: /\.transfer\s*\(/g, action: 'transfer', severity: 'critical', requiresConfirmation: true, description: 'Transfer funds' },
];

// ============================================
// NEW: LLM resilience patterns (FK005)
// ============================================

export interface LLMResiliencePattern {
  pattern: RegExp;
  type: 'timeout' | 'retry' | 'fallback' | 'circuit_breaker';
  description: string;
}

export const LLM_RESILIENCE_PATTERNS: LLMResiliencePattern[] = [
  { pattern: /timeout\s*[:=]/gi, type: 'timeout', description: 'Timeout configuration' },
  { pattern: /maxRetries\s*[:=]/gi, type: 'retry', description: 'Retry configuration' },
  { pattern: /retryCount\s*[:=]/gi, type: 'retry', description: 'Retry count' },
  { pattern: /retry\s*\(/gi, type: 'retry', description: 'Retry function' },
  { pattern: /withRetry\s*\(/gi, type: 'retry', description: 'With retry wrapper' },
  { pattern: /fallback\s*[:=]/gi, type: 'fallback', description: 'Fallback configuration' },
  { pattern: /onFallback\s*[:=]/gi, type: 'fallback', description: 'Fallback handler' },
  { pattern: /circuitBreaker/gi, type: 'circuit_breaker', description: 'Circuit breaker pattern' },
];

// ============================================
// NEW: Provenance patterns (FK006)
// ============================================

export interface ProvenancePattern {
  pattern: RegExp;
  field: string;
  required: boolean;
}

export const PROVENANCE_PATTERNS: ProvenancePattern[] = [
  { pattern: /action_id\s*[:=]/g, field: 'action_id', required: true },
  { pattern: /actionId\s*[:=]/g, field: 'action_id', required: true },
  { pattern: /timestamp\s*[:=]/g, field: 'timestamp', required: true },
  { pattern: /created_at\s*[:=]/g, field: 'timestamp', required: true },
  { pattern: /createdAt\s*[:=]/g, field: 'timestamp', required: true },
  { pattern: /trace_id\s*[:=]/g, field: 'trace_id', required: false },
  { pattern: /traceId\s*[:=]/g, field: 'trace_id', required: false },
  { pattern: /correlation_id\s*[:=]/g, field: 'correlation_id', required: false },
  { pattern: /correlationId\s*[:=]/g, field: 'correlation_id', required: false },
  { pattern: /user_id\s*[:=]/g, field: 'user_id', required: false },
  { pattern: /userId\s*[:=]/g, field: 'user_id', required: false },
];

export interface LLMPattern {
  pattern: RegExp;
  provider: string;
  requiresErrorHandling: boolean;
}

export interface AgentPattern {
  pattern: RegExp;
  framework: string;
  methodType: 'call' | 'run' | 'invoke' | 'execute' | 'kickoff';
}

export interface EndpointPattern {
  pattern: RegExp;
  type: 'nextjs' | 'express' | 'fastapi' | 'hono';
}

/**
 * Tool call patterns - operations that may need receipts
 */
export const TOOL_PATTERNS: ToolPattern[] = [
  // Database operations
  { pattern: /await\s+db\.(query|execute|insert|update|delete)\s*\(/g, tool: 'database', destructive: true, requiresReceipt: true },
  { pattern: /await\s+prisma\.(create|update|delete|upsert)\s*\(/g, tool: 'database', destructive: true, requiresReceipt: true },
  { pattern: /await\s+prisma\.findMany\s*\(/g, tool: 'database', destructive: false, requiresReceipt: false },
  { pattern: /await\s+prisma\.findUnique\s*\(/g, tool: 'database', destructive: false, requiresReceipt: false },
  { pattern: /await\s+knex\s*\([^)]*\)\.(insert|update|delete|del)\s*\(/g, tool: 'database', destructive: true, requiresReceipt: true },

  // HTTP requests
  { pattern: /await\s+fetch\s*\(/g, tool: 'http_request', destructive: false, requiresReceipt: false },
  { pattern: /await\s+axios\.(post|put|delete|patch)\s*\(/g, tool: 'http_request', destructive: true, requiresReceipt: true },
  { pattern: /await\s+axios\.get\s*\(/g, tool: 'http_request', destructive: false, requiresReceipt: false },

  // Email/messaging
  { pattern: /await\s+sendEmail\s*\(/g, tool: 'email', destructive: true, requiresReceipt: true },
  { pattern: /await\s+\w+\.send(Email|Message|Mail)\s*\(/g, tool: 'email', destructive: true, requiresReceipt: true },
  { pattern: /await\s+\w+\.sendMessage\s*\(/g, tool: 'messaging', destructive: true, requiresReceipt: true },
  { pattern: /await\s+twilio\.\w+\.(create|send)\s*\(/g, tool: 'sms', destructive: true, requiresReceipt: true },

  // File operations
  { pattern: /await\s+fs\.(writeFile|appendFile|unlink|rm|rmdir)\s*\(/g, tool: 'file_system', destructive: true, requiresReceipt: true },
  { pattern: /await\s+fs\.promises\.(writeFile|appendFile|unlink|rm|rmdir)\s*\(/g, tool: 'file_system', destructive: true, requiresReceipt: true },
  { pattern: /await\s+fs\.(readFile|readdir|stat)\s*\(/g, tool: 'file_system', destructive: false, requiresReceipt: false },

  // File uploads
  { pattern: /await\s+\w+\.upload\s*\(/g, tool: 'file_upload', destructive: true, requiresReceipt: true },
  { pattern: /await\s+s3\.(putObject|upload|deleteObject)\s*\(/g, tool: 'cloud_storage', destructive: true, requiresReceipt: true },

  // Payment processing
  { pattern: /await\s+stripe\.(charges|paymentIntents|subscriptions)\.(create|update|cancel)\s*\(/g, tool: 'payment', destructive: true, requiresReceipt: true },
  { pattern: /await\s+\w+\.(charge|pay|refund|transfer)\s*\(/g, tool: 'payment', destructive: true, requiresReceipt: true },

  // External API calls
  { pattern: /await\s+\w+Client\.(post|put|delete|patch|create|update|remove)\s*\(/g, tool: 'external_api', destructive: true, requiresReceipt: true },
];

/**
 * LLM invocation patterns
 */
export const LLM_PATTERNS: LLMPattern[] = [
  // OpenAI
  { pattern: /await\s+openai\.chat\.completions\.create\s*\(/g, provider: 'openai', requiresErrorHandling: true },
  { pattern: /await\s+openai\.completions\.create\s*\(/g, provider: 'openai', requiresErrorHandling: true },
  { pattern: /await\s+openai\.images\.generate\s*\(/g, provider: 'openai', requiresErrorHandling: true },

  // Anthropic
  { pattern: /await\s+anthropic\.messages\.create\s*\(/g, provider: 'anthropic', requiresErrorHandling: true },
  { pattern: /await\s+anthropic\.completions\.create\s*\(/g, provider: 'anthropic', requiresErrorHandling: true },

  // Generic LLM patterns
  { pattern: /await\s+\w+\.generateText\s*\(/g, provider: 'generic', requiresErrorHandling: true },
  { pattern: /await\s+\w+\.streamText\s*\(/g, provider: 'generic', requiresErrorHandling: true },
  { pattern: /await\s+\w+\.complete\s*\(/g, provider: 'generic', requiresErrorHandling: true },
  { pattern: /await\s+llm\.(call|invoke|generate)\s*\(/g, provider: 'generic', requiresErrorHandling: true },

  // Vercel AI SDK
  { pattern: /await\s+generateText\s*\(/g, provider: 'vercel-ai', requiresErrorHandling: true },
  { pattern: /await\s+streamText\s*\(/g, provider: 'vercel-ai', requiresErrorHandling: true },

  // LangChain
  { pattern: /await\s+\w+\.invoke\s*\(/g, provider: 'langchain', requiresErrorHandling: true },
  { pattern: /await\s+\w+\.call\s*\(/g, provider: 'langchain', requiresErrorHandling: true },
];

/**
 * Agent framework patterns
 */
export const AGENT_PATTERNS: AgentPattern[] = [
  // LangChain
  { pattern: /agent\.(call|invoke)\s*\(/g, framework: 'langchain', methodType: 'call' },
  { pattern: /agentExecutor\.(call|invoke|run)\s*\(/g, framework: 'langchain', methodType: 'invoke' },
  { pattern: /await\s+\w+Agent\.(call|invoke|run)\s*\(/g, framework: 'langchain', methodType: 'call' },

  // CrewAI
  { pattern: /crew\.kickoff\s*\(/g, framework: 'crewai', methodType: 'kickoff' },
  { pattern: /task\.execute\s*\(/g, framework: 'crewai', methodType: 'execute' },

  // AutoGPT style
  { pattern: /agent\.run\s*\(/g, framework: 'autogpt', methodType: 'run' },
  { pattern: /await\s+runAgent\s*\(/g, framework: 'generic', methodType: 'run' },

  // Generic executor patterns
  { pattern: /executor\.(run|execute|invoke)\s*\(/g, framework: 'generic', methodType: 'execute' },
];

/**
 * API endpoint patterns for detecting where agents are exposed
 */
export const ENDPOINT_PATTERNS: EndpointPattern[] = [
  // Next.js API routes
  { pattern: /export\s+async\s+function\s+(POST|GET|PUT|DELETE|PATCH)\s*\(/g, type: 'nextjs' },

  // Express routes
  { pattern: /app\.(post|get|put|delete|patch)\s*\(\s*['"`][^'"`]+['"`]/g, type: 'express' },
  { pattern: /router\.(post|get|put|delete|patch)\s*\(\s*['"`][^'"`]+['"`]/g, type: 'express' },

  // FastAPI (Python - for reference)
  { pattern: /@app\.(post|get|put|delete|patch)\s*\(\s*['"`][^'"`]+['"`]/g, type: 'fastapi' },

  // Hono
  { pattern: /app\.(post|get|put|delete|patch)\s*\(\s*['"`][^'"`]+['"`]/g, type: 'hono' },
];

/**
 * Receipt generation patterns - what we look for to confirm receipts exist
 */
export const RECEIPT_PATTERNS = [
  /createReceipt\s*\(/,
  /generateReceipt\s*\(/,
  /hashData\s*\(/,
  /action_id\s*:/,
  /input_hash\s*:/,
  /output_hash\s*:/,
  /ActionReceipt/,
  /ReceiptGenerating/,
];

/**
 * Error handling patterns
 */
export const ERROR_HANDLING_PATTERNS = [
  /try\s*\{/,
  /\.catch\s*\(/,
  /handle_parsing_errors/,
  /handle_tool_error/,
  /onError/,
  /error_handler/,
];

/**
 * Disable comment patterns - skip analysis for these lines
 */
export const DISABLE_PATTERNS = [
  /fail-kit-disable/,
  /failkit-ignore/,
  /@fail-kit-ignore/,
  /eslint-disable.*fail-kit/,
];

/**
 * Check if a file should be excluded from analysis
 */
export function isTestFile(filePath: string): boolean {
  return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filePath) ||
         /__tests__\//.test(filePath) ||
         /\/test\//.test(filePath);
}

/**
 * Check if line has disable comment
 */
export function hasDisableComment(line: string, previousLine?: string): boolean {
  const combined = (previousLine || '') + line;
  return DISABLE_PATTERNS.some(pattern => pattern.test(combined));
}

/**
 * Check if code contains receipt generation near a given position
 */
export function hasReceiptNearby(code: string, startIndex: number, range: number = 500): boolean {
  const endIndex = Math.min(startIndex + range, code.length);
  const codeSlice = code.substring(startIndex, endIndex);
  return RECEIPT_PATTERNS.some(pattern => pattern.test(codeSlice));
}

/**
 * Check if code has error handling around a given position
 */
export function hasErrorHandlingNearby(code: string, position: number): boolean {
  // Look backwards for try block
  const beforeCode = code.substring(Math.max(0, position - 200), position);
  const afterCode = code.substring(position, Math.min(position + 100, code.length));

  const hasTry = /try\s*\{/.test(beforeCode);
  const hasCatch = /\.catch\s*\(/.test(afterCode) || /\}\s*catch\s*\(/.test(afterCode);

  return hasTry || hasCatch;
}

// ============================================
// NEW: Helper functions for new patterns
// ============================================

/**
 * Check if code contains secret patterns
 */
export function findSecrets(code: string): Array<{ pattern: SecretPattern; match: RegExpMatchArray; position: number }> {
  const results: Array<{ pattern: SecretPattern; match: RegExpMatchArray; position: number }> = [];
  
  for (const secretPattern of SECRET_PATTERNS) {
    secretPattern.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = secretPattern.pattern.exec(code)) !== null) {
      // Skip if in comment
      const lineStart = code.lastIndexOf('\n', match.index) + 1;
      const lineContent = code.substring(lineStart, match.index);
      if (lineContent.includes('//') || lineContent.includes('/*')) continue;
      
      // Skip environment variable references
      if (/process\.env\.|import\.meta\.env\.|env\[/.test(code.substring(Math.max(0, match.index - 30), match.index))) continue;
      
      results.push({ pattern: secretPattern, match, position: match.index });
    }
  }
  
  return results;
}

/**
 * Check if side-effect has confirmation/guard nearby
 */
export function hasSideEffectConfirmation(code: string, position: number): boolean {
  const beforeCode = code.substring(Math.max(0, position - 300), position);
  
  // Check for confirmation patterns
  const confirmPatterns = [
    /confirm\s*\(/i,
    /confirmAction\s*\(/i,
    /userConfirm/i,
    /await\s+confirm/i,
    /if\s*\(\s*!?\s*confirm/i,
    /policy\.allow/i,
    /isAuthorized/i,
    /hasPermission/i,
    /canDelete/i,
    /canExecute/i,
    /approval/i,
  ];
  
  return confirmPatterns.some(p => p.test(beforeCode));
}

/**
 * Check if LLM call has resilience patterns nearby
 */
export function hasLLMResilience(code: string, position: number): { hasTimeout: boolean; hasRetry: boolean; hasFallback: boolean } {
  const range = 500;
  const beforeCode = code.substring(Math.max(0, position - range), position);
  const afterCode = code.substring(position, Math.min(position + range, code.length));
  const contextCode = beforeCode + afterCode;
  
  const hasTimeout = LLM_RESILIENCE_PATTERNS.filter(p => p.type === 'timeout').some(p => {
    p.pattern.lastIndex = 0;
    return p.pattern.test(contextCode);
  });
  
  const hasRetry = LLM_RESILIENCE_PATTERNS.filter(p => p.type === 'retry').some(p => {
    p.pattern.lastIndex = 0;
    return p.pattern.test(contextCode);
  });
  
  const hasFallback = LLM_RESILIENCE_PATTERNS.filter(p => p.type === 'fallback').some(p => {
    p.pattern.lastIndex = 0;
    return p.pattern.test(contextCode);
  });
  
  return { hasTimeout, hasRetry, hasFallback };
}

/**
 * Check if code has provenance metadata
 */
export function hasProvenanceMetadata(code: string, position: number): { hasActionId: boolean; hasTimestamp: boolean; missingFields: string[] } {
  const range = 500;
  const afterCode = code.substring(position, Math.min(position + range, code.length));
  
  const foundFields = new Set<string>();
  
  for (const prov of PROVENANCE_PATTERNS) {
    prov.pattern.lastIndex = 0;
    if (prov.pattern.test(afterCode)) {
      foundFields.add(prov.field);
    }
  }
  
  const requiredFields = PROVENANCE_PATTERNS.filter(p => p.required).map(p => p.field);
  const uniqueRequired = [...new Set(requiredFields)];
  const missingFields = uniqueRequired.filter(f => !foundFields.has(f));
  
  return {
    hasActionId: foundFields.has('action_id'),
    hasTimestamp: foundFields.has('timestamp'),
    missingFields,
  };
}

/**
 * Check if line is inside an environment file or config
 */
export function isConfigFile(filePath: string): boolean {
  return /\.(env|config|settings)\.(ts|js|json)$/.test(filePath) ||
         /\.env(\.\w+)?$/.test(filePath) ||
         /config\.(ts|js|json)$/.test(filePath);
}
