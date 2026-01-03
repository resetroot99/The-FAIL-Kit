/**
 * Sample agent code WITHOUT issues - properly implemented
 *
 * This file should NOT trigger any F.A.I.L. Kit warnings.
 * Shows best practices for agent code.
 */

import OpenAI from 'openai';
import { AgentExecutor } from 'langchain/agents';
import crypto from 'crypto';

const openai = new OpenAI();

// Receipt generation utility
function hashData(data: any): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');
  return `sha256:${hash}`;
}

interface ActionReceipt {
  action_id: string;
  tool_name: string;
  timestamp: string;
  status: 'success' | 'failed';
  input_hash: string;
  output_hash: string;
  latency_ms?: number;
  error_message?: string;
}

function createReceipt(
  toolName: string,
  input: any,
  output: any,
  startTime: number
): ActionReceipt {
  return {
    action_id: `act_${crypto.randomBytes(4).toString('hex')}`,
    tool_name: toolName,
    timestamp: new Date().toISOString(),
    status: 'success',
    input_hash: hashData(input),
    output_hash: hashData(output),
    latency_ms: Date.now() - startTime,
  };
}

// ✅ LLM call WITH error handling
async function askOpenAI(prompt: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI call failed:', error);
    throw error;
  }
}

// ✅ Payment processing WITH receipt
async function processPayment(amount: number, customerId: string) {
  const startTime = Date.now();
  const input = { amount, customerId };

  try {
    const charge = await stripe.charges.create({
      amount,
      currency: 'usd',
      customer: customerId,
    });

    const receipt = createReceipt('payment', input, charge, startTime);

    return {
      success: true,
      chargeId: charge.id,
      receipt,
    };
  } catch (error) {
    console.error('Payment failed:', error);
    throw error;
  }
}

// ✅ Database mutation WITH receipt and error handling
async function updateUserStatus(userId: string, status: string) {
  const startTime = Date.now();
  const input = { userId, status };

  try {
    const result = await prisma.update({
      where: { id: userId },
      data: { status },
    });

    const receipt = createReceipt('database_update', input, result, startTime);

    return { result, receipt };
  } catch (error) {
    console.error('Database update failed:', error);
    throw error;
  }
}

// ✅ Agent call WITH receipt and error handling
async function runAgent(input: string) {
  const startTime = Date.now();

  try {
    const agent = new AgentExecutor({ tools: [], llm: openai });
    const result = await agent.call({ input });

    const receipt = createReceipt('agent_execution', { input }, result, startTime);

    return {
      output: result.output,
      receipt,
    };
  } catch (error) {
    console.error('Agent execution failed:', error);
    throw error;
  }
}

// ✅ Email send WITH receipt
async function notifyAdmin(subject: string, body: string) {
  const startTime = Date.now();
  const input = { to: 'admin@example.com', subject, body };

  try {
    await sendEmail(input);

    const receipt = createReceipt('email', input, { sent: true }, startTime);

    return { success: true, receipt };
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
}

// Placeholder declarations for TypeScript
declare const stripe: any;
declare const prisma: any;
declare function sendEmail(opts: any): Promise<void>;
