/**
 * Express.js Receipt Integration Example
 * Add receipt generation to Express API endpoints
 */

const express = require('express');
const { generateReceipt, validateReceipt } = require('receipt-standard');

const app = express();
app.use(express.json());

/**
 * Wrapper function that generates receipts for tool calls
 */
async function withReceipt(toolName, inputData, toolFunction) {
  const startTime = Date.now();
  let outputData, status, errorMessage;
  
  try {
    outputData = await toolFunction(inputData);
    status = 'success';
  } catch (error) {
    outputData = { error: error.message };
    status = 'failed';
    errorMessage = error.message;
  }
  
  const latencyMs = Date.now() - startTime;
  
  const receipt = generateReceipt({
    toolName,
    input: inputData,
    output: outputData,
    status,
    latencyMs,
    errorMessage
  });
  
  return { outputData, receipt, status };
}

/**
 * Example: Email sending endpoint with receipts
 */
app.post('/agent/send-email', async (req, res) => {
  const { to, subject, body } = req.body;
  
  // Call email tool with receipt generation
  const { outputData, receipt, status } = await withReceipt(
    'email_sender',
    { to, subject, body },
    async (input) => {
      // Your email sending logic
      const result = await sendEmailAPI(input);
      return { message_id: result.id, status: 'sent' };
    }
  );
  
  if (status === 'failed') {
    return res.status(500).json({
      outputs: {
        final_text: 'Failed to send email',
        decision: 'FAIL'
      },
      actions: [receipt]
    });
  }
  
  res.json({
    outputs: {
      final_text: `Email sent successfully to ${to}`,
      decision: 'PASS'
    },
    actions: [receipt]
  });
});

/**
 * Example: Agent endpoint that uses multiple tools
 */
app.post('/agent/run', async (req, res) => {
  const { prompt } = req.body;
  const receipts = [];
  
  // Parse intent (simplified)
  if (prompt.includes('email')) {
    const { receipt } = await withReceipt(
      'email_sender',
      { to: 'user@example.com', subject: 'Hello', body: 'Test' },
      async (input) => sendEmailAPI(input)
    );
    receipts.push(receipt);
  }
  
  if (prompt.includes('ticket')) {
    const { receipt } = await withReceipt(
      'ticket_creator',
      { title: 'New issue', priority: 'high' },
      async (input) => createTicketAPI(input)
    );
    receipts.push(receipt);
  }
  
  // Validate all receipts before responding
  const allValid = receipts.every(r => validateReceipt(r).valid);
  
  if (!allValid) {
    return res.status(500).json({
      error: 'Invalid receipts generated',
      actions: receipts
    });
  }
  
  res.json({
    outputs: {
      final_text: 'Actions completed',
      decision: 'PASS'
    },
    actions: receipts
  });
});

app.listen(8000, () => {
  console.log('Agent server with receipts running on port 8000');
});

// Example email API stub
async function sendEmailAPI(input) {
  return { id: 'msg_123', status: 'sent' };
}

// Example ticket API stub
async function createTicketAPI(input) {
  return { id: 'ticket_456', status: 'created' };
}
