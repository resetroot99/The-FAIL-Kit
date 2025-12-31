/**
 * Reference Agent - Example Implementation
 * 
 * This is a minimal agent that demonstrates proper receipt generation
 * and action tracking. Use this to test the F.A.I.L. Kit audit.
 */

const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// Simple in-memory action log
const actionLog = [];

/**
 * Generate SHA256 hash for action receipts
 */
function hashData(data) {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');
  return `sha256:${hash}`;
}

/**
 * Main agent endpoint
 * Expected format matches the F.A.I.L. Kit evaluation harness
 */
app.post('/eval/run', (req, res) => {
  const { inputs, context } = req.body;
  const prompt = inputs?.user || inputs?.prompt || req.body.prompt || '';
  
  // Parse the prompt to determine what action to take
  const actionType = determineAction(prompt);
  
  // Execute the action and generate a receipt
  const result = executeAction(actionType, prompt);
  
  // Log the action
  actionLog.push({
    timestamp: new Date().toISOString(),
    prompt,
    action: result.action
  });
  
  // Return in F.A.I.L. Kit expected format
  res.json({
    outputs: {
      final_text: result.response,
      decision: result.decision || 'PASS'
    },
    actions: result.actions || [],
    policy: result.policy || {
      refuse: false,
      abstain: false,
      escalate: false,
      reasons: []
    }
  });
});

/**
 * Determine what action the agent should take based on the prompt
 */
function determineAction(prompt) {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('send email') || lower.includes('email')) {
    return 'send_email';
  } else if (lower.includes('write file') || lower.includes('save')) {
    return 'write_file';
  } else if (lower.includes('transfer money') || lower.includes('payment')) {
    return 'transfer_money';
  } else if (lower.includes('search') || lower.includes('find')) {
    return 'search';
  } else {
    return 'respond';
  }
}

/**
 * Execute an action and generate a proper receipt per RECEIPT_SCHEMA.json
 */
function executeAction(actionType, prompt) {
  const timestamp = new Date().toISOString();
  const actionId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  switch (actionType) {
    case 'send_email':
      const emailInput = { prompt, to: 'recipient@example.com', subject: 'Test' };
      const emailOutput = { status: 'sent', message_id: `msg_${Date.now()}` };
      
      return {
        response: 'I sent the email as requested.',
        decision: 'PASS',
        actions: [{
          action_id: actionId,
          tool_name: 'email_sender',
          timestamp,
          status: 'success',
          input_hash: hashData(emailInput),
          output_hash: hashData(emailOutput),
          latency_ms: Math.floor(Math.random() * 500) + 100,
          metadata: {
            message_id: emailOutput.message_id,
            smtp_confirmation: true
          }
        }]
      };
      
    case 'write_file':
      const fileInput = { prompt, path: '/tmp/output.txt', content: 'data' };
      const fileOutput = { path: '/tmp/output.txt', bytes_written: 42 };
      
      return {
        response: 'I wrote the file to disk.',
        decision: 'PASS',
        actions: [{
          action_id: actionId,
          tool_name: 'file_manager',
          timestamp,
          status: 'success',
          input_hash: hashData(fileInput),
          output_hash: hashData(fileOutput),
          latency_ms: Math.floor(Math.random() * 300) + 50,
          metadata: {
            path: fileOutput.path,
            bytes: fileOutput.bytes_written
          }
        }]
      };
      
    case 'transfer_money':
      const paymentInput = { prompt, amount: 100, currency: 'USD' };
      const paymentOutput = { transaction_id: `txn_${Date.now()}`, status: 'completed' };
      
      return {
        response: 'This request requires human review before I can proceed.',
        decision: 'NEEDS_REVIEW',
        actions: [],
        policy: {
          refuse: false,
          abstain: false,
          escalate: true,
          reasons: ['high-stakes financial transaction detected']
        }
      };
      
    case 'search':
      const searchInput = { query: prompt };
      const searchOutput = { results: ['result1', 'result2', 'result3'], count: 3 };
      
      return {
        response: 'I searched and found 3 results.',
        decision: 'PASS',
        actions: [{
          action_id: actionId,
          tool_name: 'search_engine',
          timestamp,
          status: 'success',
          input_hash: hashData(searchInput),
          output_hash: hashData(searchOutput),
          latency_ms: Math.floor(Math.random() * 800) + 200,
          metadata: {
            result_count: searchOutput.count
          }
        }]
      };
      
    default:
      // For generic responses with no action
      return {
        response: `I processed your request: ${prompt}`,
        decision: 'PASS',
        actions: []  // No action taken, just a response
      };
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/**
 * View action log (for debugging)
 */
app.get('/log', (req, res) => {
  res.json({ actions: actionLog });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Reference agent running on http://localhost:${PORT}`);
  console.log(`Evaluation endpoint: POST http://localhost:${PORT}/eval/run`);
  console.log(`Health check: GET http://localhost:${PORT}/health`);
});
