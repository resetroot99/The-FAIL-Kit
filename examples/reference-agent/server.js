/**
 * Reference Agent - Example Implementation
 * 
 * This is a minimal agent that demonstrates proper receipt generation
 * and action tracking. Use this to test the F.A.I.L. Kit audit.
 */

const express = require('express');
const app = express();
app.use(express.json());

// Simple in-memory action log
const actionLog = [];

/**
 * Main agent endpoint
 * Expected format matches the F.A.I.L. Kit evaluation harness
 */
app.post('/eval/run', (req, res) => {
  const { prompt, context } = req.body;
  
  // Parse the prompt to determine what action to take
  const action = determineAction(prompt);
  
  // Execute the action and generate a receipt
  const result = executeAction(action, prompt);
  
  // Log the action
  actionLog.push({
    timestamp: new Date().toISOString(),
    prompt,
    action: result.action,
    receipt: result.receipt
  });
  
  res.json({
    response: result.response,
    actions: [result.action],
    receipts: [result.receipt]
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
 * Execute an action and generate a proper receipt
 */
function executeAction(actionType, prompt) {
  const timestamp = new Date().toISOString();
  
  switch (actionType) {
    case 'send_email':
      return {
        response: 'I sent the email as requested.',
        action: {
          tool: 'email',
          input: { prompt },
          output: { status: 'sent', message_id: `msg_${Date.now()}` }
        },
        receipt: {
          timestamp,
          tool: 'email',
          status: 'success',
          message_id: `msg_${Date.now()}`,
          proof: 'SMTP confirmation received'
        }
      };
      
    case 'write_file':
      return {
        response: 'I wrote the file to disk.',
        action: {
          tool: 'filesystem',
          input: { prompt },
          output: { path: '/tmp/output.txt', bytes_written: 42 }
        },
        receipt: {
          timestamp,
          tool: 'filesystem',
          status: 'success',
          path: '/tmp/output.txt',
          checksum: 'sha256:abc123...'
        }
      };
      
    case 'transfer_money':
      return {
        response: 'I transferred the money.',
        action: {
          tool: 'payment',
          input: { prompt },
          output: { transaction_id: `txn_${Date.now()}`, amount: 100 }
        },
        receipt: {
          timestamp,
          tool: 'payment',
          status: 'success',
          transaction_id: `txn_${Date.now()}`,
          confirmation: 'Bank API returned 200 OK'
        }
      };
      
    case 'search':
      return {
        response: 'I searched and found 3 results.',
        action: {
          tool: 'search',
          input: { query: prompt },
          output: { results: ['result1', 'result2', 'result3'] }
        },
        receipt: {
          timestamp,
          tool: 'search',
          status: 'success',
          query: prompt,
          result_count: 3
        }
      };
      
    default:
      return {
        response: `I processed your request: ${prompt}`,
        action: {
          tool: 'respond',
          input: { prompt },
          output: { text: 'Response generated' }
        },
        receipt: {
          timestamp,
          tool: 'respond',
          status: 'success'
        }
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
