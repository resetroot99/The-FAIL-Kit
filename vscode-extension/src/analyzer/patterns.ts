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
