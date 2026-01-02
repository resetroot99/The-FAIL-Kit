/**
 * F.A.I.L. Kit Express Example
 * 
 * A simple "Order Processing" agent that demonstrates
 * F.A.I.L. Kit integration with Express.
 */

const express = require('express');
const { failAuditMiddleware } = require('@fail-kit/middleware-express');

const app = express();
app.use(express.json());

// =============================================================================
// Mock Database (simulates your real data layer)
// =============================================================================

const orders = new Map([
  ['ORD-001', { id: 'ORD-001', customer: 'John Doe', total: 99.99, status: 'pending' }],
  ['ORD-002', { id: 'ORD-002', customer: 'Jane Smith', total: 149.50, status: 'shipped' }],
]);

// =============================================================================
// Agent Logic
// =============================================================================

async function processOrderAgent(prompt, context) {
  const actions = [];
  let response = '';
  
  // Simple intent detection
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('status') || lowerPrompt.includes('check order')) {
    // Extract order ID from prompt
    const orderIdMatch = prompt.match(/ORD-\d+/i);
    
    if (orderIdMatch) {
      const orderId = orderIdMatch[0].toUpperCase();
      const order = orders.get(orderId);
      
      if (order) {
        // Record the action
        actions.push({
          action_id: `act_lookup_${Date.now()}`,
          tool_name: 'database_query',
          timestamp: new Date().toISOString(),
          status: 'success',
          input_hash: `sha256:${Buffer.from(orderId).toString('base64')}`,
          output_hash: `sha256:${Buffer.from(JSON.stringify(order)).toString('base64')}`,
          latency_ms: 45
        });
        
        response = `Order ${orderId} for ${order.customer} is currently ${order.status}. Total: $${order.total}`;
      } else {
        response = `I couldn't find order ${orderId} in our system.`;
      }
    } else {
      response = 'Please provide an order ID (e.g., ORD-001) to check the status.';
    }
  } else if (lowerPrompt.includes('cancel')) {
    // High-stakes action - should escalate
    return {
      response: 'Order cancellation requires manager approval. I\'ve escalated this request.',
      actions: [],
      policy: {
        escalate: true,
        reasons: ['high-stakes operation', 'cancellation requires approval']
      }
    };
  } else if (lowerPrompt.includes('process payment') || lowerPrompt.includes('charge')) {
    // Simulate payment processing
    actions.push({
      action_id: `act_payment_${Date.now()}`,
      tool_name: 'payment_processor',
      timestamp: new Date().toISOString(),
      status: 'success',
      input_hash: `sha256:payment_request_hash`,
      output_hash: `sha256:payment_confirmation_hash`,
      latency_ms: 1200,
      metadata: {
        transaction_id: `txn_${Date.now()}`,
        amount: 99.99
      }
    });
    
    response = 'Payment processed successfully. Transaction ID: txn_' + Date.now();
  } else {
    response = 'I can help you check order status, process payments, or handle cancellations. How can I assist you?';
  }
  
  return { response, actions };
}

// =============================================================================
// F.A.I.L. Kit Endpoint
// =============================================================================

app.use('/eval', failAuditMiddleware({
  handler: async (prompt, context) => {
    const result = await processOrderAgent(prompt, context);
    return {
      response: result.response,
      actions: result.actions,
      policy: result.policy
    };
  },
  autoReceipts: true
}));

// =============================================================================
// Health Check
// =============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// =============================================================================
// Start Server
// =============================================================================

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  F.A.I.L. Kit Express Example                                ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                      ║
║  F.A.I.L. Kit endpoint: http://localhost:${PORT}/eval/run        ║
║  Health check: http://localhost:${PORT}/health                   ║
╠══════════════════════════════════════════════════════════════╣
║  To run the audit:                                           ║
║    fail-audit scan && fail-audit run --format html           ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
