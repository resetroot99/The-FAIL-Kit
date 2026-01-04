/**
 * F.A.I.L. Kit Receipt Generator
 *
 * Generates cryptographic receipts for proxied requests.
 */

import crypto from 'crypto';

export interface Receipt {
  // Core identifiers
  action_id: string;
  tool_name: string;
  tool_category: string;
  
  // Timing
  timestamp: string;
  duration_ms: number;
  
  // Status
  status: 'success' | 'failure' | 'timeout';
  status_code?: number;
  
  // Cryptographic hashes
  input_hash: string;
  output_hash: string;
  
  // Request details
  request: {
    method: string;
    url: string;
    host: string;
    path: string;
    content_type?: string;
    content_length?: number;
  };
  
  // Response details
  response: {
    status_code: number;
    content_type?: string;
    content_length?: number;
  };
  
  // Metadata
  metadata: {
    proxy_version: string;
    hash_algorithm: string;
    intercepted_at: string;
  };
}

interface GenerateReceiptOptions {
  request: {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
    body?: Buffer;
  };
  response: {
    statusCode: number;
    headers: Record<string, string | string[] | undefined>;
    body?: Buffer;
  };
  duration: number;
  hashAlgorithm: 'sha256' | 'sha512';
}

/**
 * Generate a cryptographic receipt for a request/response pair
 */
export function generateReceipt(options: GenerateReceiptOptions): Receipt {
  const { request, response, duration, hashAlgorithm } = options;
  
  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(request.url);
  } catch {
    parsedUrl = new URL(`http://unknown${request.url}`);
  }
  
  // Determine tool name and category from host
  const { toolName, toolCategory } = categorizeHost(parsedUrl.hostname);
  
  // Generate unique action ID
  const actionId = generateActionId(toolCategory);
  
  // Compute input hash (request)
  const inputData = JSON.stringify({
    method: request.method,
    url: request.url,
    headers: sanitizeHeaders(request.headers),
    body: request.body?.toString('base64'),
  });
  const inputHash = computeHash(inputData, hashAlgorithm);
  
  // Compute output hash (response)
  const outputData = JSON.stringify({
    statusCode: response.statusCode,
    headers: sanitizeHeaders(response.headers),
    body: response.body?.toString('base64'),
  });
  const outputHash = computeHash(outputData, hashAlgorithm);
  
  // Determine status
  let status: Receipt['status'] = 'success';
  if (response.statusCode >= 500) {
    status = 'failure';
  } else if (response.statusCode === 408 || response.statusCode === 504) {
    status = 'timeout';
  }
  
  return {
    action_id: actionId,
    tool_name: toolName,
    tool_category: toolCategory,
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    status,
    status_code: response.statusCode,
    input_hash: `${hashAlgorithm}:${inputHash}`,
    output_hash: `${hashAlgorithm}:${outputHash}`,
    request: {
      method: request.method,
      url: request.url,
      host: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      content_type: getHeader(request.headers, 'content-type'),
      content_length: request.body?.length,
    },
    response: {
      status_code: response.statusCode,
      content_type: getHeader(response.headers, 'content-type'),
      content_length: response.body?.length,
    },
    metadata: {
      proxy_version: '1.0.0',
      hash_algorithm: hashAlgorithm,
      intercepted_at: new Date().toISOString(),
    },
  };
}

/**
 * Categorize host to determine tool name and category
 */
function categorizeHost(hostname: string): { toolName: string; toolCategory: string } {
  // LLM providers
  if (hostname.includes('openai.com')) {
    return { toolName: 'openai', toolCategory: 'llm' };
  }
  if (hostname.includes('anthropic.com')) {
    return { toolName: 'anthropic', toolCategory: 'llm' };
  }
  if (hostname.includes('cohere.ai')) {
    return { toolName: 'cohere', toolCategory: 'llm' };
  }
  if (hostname.includes('generativelanguage.googleapis.com')) {
    return { toolName: 'google-ai', toolCategory: 'llm' };
  }
  if (hostname.includes('bedrock')) {
    return { toolName: 'aws-bedrock', toolCategory: 'llm' };
  }
  
  // Payment providers
  if (hostname.includes('stripe.com')) {
    return { toolName: 'stripe', toolCategory: 'payment' };
  }
  if (hostname.includes('paypal.com')) {
    return { toolName: 'paypal', toolCategory: 'payment' };
  }
  
  // Email providers
  if (hostname.includes('sendgrid.com')) {
    return { toolName: 'sendgrid', toolCategory: 'email' };
  }
  if (hostname.includes('mailgun.com')) {
    return { toolName: 'mailgun', toolCategory: 'email' };
  }
  if (hostname.includes('ses.amazonaws.com')) {
    return { toolName: 'aws-ses', toolCategory: 'email' };
  }
  
  // Storage providers
  if (hostname.includes('s3.amazonaws.com') || hostname.endsWith('.s3.amazonaws.com')) {
    return { toolName: 'aws-s3', toolCategory: 'storage' };
  }
  if (hostname.includes('storage.googleapis.com')) {
    return { toolName: 'gcs', toolCategory: 'storage' };
  }
  
  // Database providers
  if (hostname.includes('supabase.co')) {
    return { toolName: 'supabase', toolCategory: 'database' };
  }
  if (hostname.includes('firebase')) {
    return { toolName: 'firebase', toolCategory: 'database' };
  }
  
  // Communication
  if (hostname.includes('twilio.com')) {
    return { toolName: 'twilio', toolCategory: 'sms' };
  }
  if (hostname.includes('slack.com')) {
    return { toolName: 'slack', toolCategory: 'messaging' };
  }
  
  // Default
  return { toolName: hostname.split('.')[0], toolCategory: 'http' };
}

/**
 * Generate unique action ID
 */
function generateActionId(category: string): string {
  const prefix = category.substring(0, 3).toLowerCase();
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Compute hash of data
 */
function computeHash(data: string, algorithm: 'sha256' | 'sha512'): string {
  return crypto.createHash(algorithm).update(data).digest('hex');
}

/**
 * Get header value (case-insensitive)
 */
function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
  if (!key) return undefined;
  const value = headers[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Sanitize headers (remove sensitive values)
 */
function sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'api-key'];
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (value !== undefined) {
      result[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  }
  
  return result;
}
