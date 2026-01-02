/**
 * F.A.I.L. Kit - Error Explainer
 * Provides detailed, actionable explanations for test failures
 */

/**
 * Parse failure reason and extract key information
 */
function parseFailureReason(reason) {
  if (!reason) return null;
  
  // Common patterns
  const patterns = {
    expected: /Expected\s+(.+?),\s+got\s+(.+)/i,
    missing: /Missing\s+(.+)/i,
    invalid: /Invalid\s+(.+)/i,
    timeout: /timeout|timed out/i,
    error: /error:\s*(.+)/i
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    const match = reason.match(pattern);
    if (match) {
      return { type, match, original: reason };
    }
  }
  
  return { type: 'unknown', original: reason };
}

/**
 * Get human-readable explanation for a failure
 */
function explainFailure(caseId, reason, expected, actual) {
  const parsed = parseFailureReason(reason);
  const prefix = caseId.split('_')[0];
  
  // Build explanation based on test type and failure pattern
  const explanations = {
    // Auto-generated test explanations
    'AUTO_ERROR_FILE_SYSTEM': {
      title: 'File System Error Handling Failed',
      what: 'Your agent was tested with a simulated file system failure. The test checks if your agent properly reports errors to the user instead of hiding them or claiming success.',
      why: `The agent ${parsed.match ? parsed.match[1] : 'did not handle the error correctly'}. When tools fail, users need to know what went wrong.`,
      how: [
        'Wrap file operations in try/catch blocks',
        'Return error information in the response',
        'Never claim an action succeeded when it failed',
        'Provide actionable error messages to users'
      ]
    },
    
    'AUTO_ERROR_FILE_UPLOAD': {
      title: 'File Upload Error Handling Failed',
      what: 'Your agent was tested with a simulated file upload failure. The test checks if errors are properly communicated to the user.',
      why: `The agent ${parsed.match ? parsed.match[1] : 'did not handle the upload failure correctly'}. Silent failures are dangerous.`,
      how: [
        'Check upload status before claiming success',
        'Return specific error messages (network, permissions, etc.)',
        'Suggest alternatives when uploads fail',
        'Log failures for debugging'
      ]
    },
    
    'AUTO_ERROR_HTTP_REQUEST': {
      title: 'HTTP Request Error Handling Failed',
      what: 'Your agent was tested with a simulated API failure. The test checks if network errors are handled gracefully.',
      why: `The agent ${parsed.match ? parsed.match[1] : 'did not handle the API error correctly'}. External APIs fail. Your agent must handle it.`,
      how: [
        'Implement retry logic with exponential backoff',
        'Check response status codes',
        'Provide fallback behavior when APIs are down',
        'Never fabricate data when the API fails'
      ]
    },
    
    'AUTO_RECEIPT_FILE_SYSTEM': {
      title: 'Missing File System Receipt',
      what: 'Your agent performed a file operation but did not generate a receipt proving the action was completed.',
      why: `The agent ${parsed.match ? 'claimed to ' + parsed.match[1] + ' but provided no proof' : 'did not provide proof of the file operation'}. Without receipts, there is no accountability.`,
      how: [
        'After file operations, generate a receipt with: timestamp, file path, operation type, status',
        'Include file size or hash as proof',
        'Return receipts in the response under an "actions" or "receipts" field',
        'Example: { tool: "file_system", timestamp: "2026-01-01T12:00:00Z", proof: { path: "/path/to/file", size: 1024 } }'
      ]
    },
    
    'AUTO_RECEIPT_FILE_UPLOAD': {
      title: 'Missing File Upload Receipt',
      what: 'Your agent uploaded a file but did not generate a receipt with the upload URL or confirmation.',
      why: `The agent ${parsed.match ? 'claimed to upload but provided no URL or confirmation' : 'did not provide proof of upload'}. Users need the upload URL.`,
      how: [
        'After uploads, return a receipt with: timestamp, upload URL, file name, status',
        'Include the storage location (S3 bucket, CDN URL, etc.)',
        'Provide a way for users to verify the upload',
        'Example: { tool: "file_upload", timestamp: "2026-01-01T12:00:00Z", proof: { url: "https://...", filename: "estimate.pdf" } }'
      ]
    },
    
    'AUTO_RECEIPT_HTTP_REQUEST': {
      title: 'Missing HTTP Request Receipt',
      what: 'Your agent made an API call but did not generate a receipt with the response or status.',
      why: `The agent ${parsed.match ? 'claimed to call an API but provided no proof' : 'did not provide proof of the API call'}. External calls need verification.`,
      how: [
        'After API calls, return a receipt with: timestamp, endpoint, status code, response summary',
        'Include relevant response data (not the full payload, just key fields)',
        'Log the request ID if the API provides one',
        'Example: { tool: "http_request", timestamp: "2026-01-01T12:00:00Z", proof: { endpoint: "/api/estimate", status: 200 } }'
      ]
    },
    
    'AUTO_HALLUCINATION': {
      title: 'Hallucination Detected',
      what: 'Your agent claimed to have information or performed an action that it did not actually do.',
      why: `The agent ${parsed.match ? parsed.match[1] : 'fabricated a response'}. This is a critical failure. Never lie to users.`,
      how: [
        'Implement knowledge boundary detection',
        'Return "I don\'t know" or "No data found" when appropriate',
        'Never generate plausible-sounding but false information',
        'Cite sources for all factual claims',
        'If a tool fails, report the failure instead of making up results'
      ]
    },
    
    'AUTO_INTEGRITY_POST_APP_API': {
      title: 'Action Integrity Violation',
      what: 'Your agent claimed to perform actions that do not match the actual operations executed.',
      why: `The agent's claims ${parsed.match ? 'do not match reality: ' + parsed.match[1] : 'are inconsistent with its actions'}. This breaks trust.`,
      how: [
        'Generate receipts for every action',
        'Ensure claimed actions match the receipts',
        'Do not claim actions that were not executed',
        'Provide a clear audit trail of all operations'
      ]
    }
  };
  
  // Check for exact match first
  if (explanations[caseId]) {
    return explanations[caseId];
  }
  
  // Fall back to pattern matching
  for (const [key, explanation] of Object.entries(explanations)) {
    if (caseId.includes(key.split('_').slice(0, 2).join('_'))) {
      return explanation;
    }
  }
  
  // Generic fallback based on prefix
  const genericExplanations = {
    'CONTRACT': {
      title: 'Contract Violation',
      what: 'Your agent did not return the expected response structure or fields.',
      why: reason || 'The response format does not match the contract.',
      how: [
        'Check the API contract for required fields',
        'Ensure all expected fields are present in the response',
        'Validate response structure before returning',
        'Use TypeScript or JSON Schema for type safety'
      ]
    },
    'AGENT': {
      title: 'Agent Behavior Failure',
      what: 'Your agent did not behave as expected in this scenario.',
      why: reason || 'The agent\'s behavior does not match the test expectations.',
      how: [
        'Review the test case to understand expected behavior',
        'Implement proper action tracking and receipts',
        'Ensure the agent responds appropriately to the prompt',
        'Test edge cases and error conditions'
      ]
    },
    'ADV': {
      title: 'Adversarial Attack Vulnerability',
      what: 'Your agent is vulnerable to adversarial inputs or prompt injection.',
      why: reason || 'The agent did not properly handle malicious or unexpected input.',
      how: [
        'Implement input validation and sanitization',
        'Use prompt engineering to prevent injection attacks',
        'Add guardrails for sensitive operations',
        'Consider adversarial training for your model'
      ]
    },
    'RAG': {
      title: 'RAG System Failure',
      what: 'Your retrieval-augmented generation system did not perform correctly.',
      why: reason || 'The RAG pipeline failed to retrieve or generate appropriate content.',
      how: [
        'Verify retrieval quality and relevance scoring',
        'Implement citation tracking for all retrieved content',
        'Handle cases where no relevant documents are found',
        'Add fallback behavior for retrieval failures'
      ]
    }
  };
  
  return genericExplanations[prefix] || {
    title: 'Test Failure',
    what: 'This test did not pass.',
    why: reason || 'Unknown failure reason.',
    how: [
      'Review the test case expectations',
      'Check the agent\'s response format',
      'Ensure all required fields are present',
      'Verify the agent\'s behavior matches the test requirements'
    ]
  };
}

/**
 * Generate HTML for enhanced error explanation
 */
function generateErrorExplanation(caseId, reason, expected, actual) {
  const explanation = explainFailure(caseId, reason, expected, actual);
  
  return `
    <div class="error-explanation">
      <div class="explanation-title">${explanation.title}</div>
      
      <div class="explanation-section">
        <div class="explanation-label">What Happened</div>
        <div class="explanation-text">${explanation.what}</div>
      </div>
      
      <div class="explanation-section">
        <div class="explanation-label">Why It Failed</div>
        <div class="explanation-text">${explanation.why}</div>
      </div>
      
      <div class="explanation-section">
        <div class="explanation-label">How to Fix</div>
        <ul class="explanation-list">
          ${explanation.how.map(step => `<li>${step}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

module.exports = {
  parseFailureReason,
  explainFailure,
  generateErrorExplanation
};
