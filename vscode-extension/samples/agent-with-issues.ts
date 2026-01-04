/**
 * Sample agent code WITH issues for testing F.A.I.L. Kit detection
 *
 * This file should trigger multiple warnings:
 * - FK001: Missing receipt generation
 * - FK002: Missing error handling
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AgentExecutor } from 'langchain/agents';
import Stripe from 'stripe';

const openai = new OpenAI();
const anthropic = new Anthropic();
const stripe = new Stripe('sk_test_xxx');

// [Issue] FK002: LLM call without error handling
async function askOpenAI(prompt: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });
  return response.choices[0].message.content;
}

// [Issue] FK002: Another LLM call without error handling
async function askClaude(prompt: string) {
  const response = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content[0];
}

// [Issue] FK001: Payment processing without receipt
async function processPayment(amount: number, customerId: string) {
  const charge = await stripe.charges.create({
    amount,
    currency: 'usd',
    customer: customerId,
  });
  return { success: true, chargeId: charge.id };
}

// [Issue] FK001: Database mutation without receipt
async function updateUserStatus(userId: string, status: string) {
  await prisma.update({
    where: { id: userId },
    data: { status },
  });
}

// [Issue] FK001 + FK002: Agent call without receipt or error handling
async function runAgent(input: string) {
  const agent = new AgentExecutor({ tools: [], llm: openai });
  const result = await agent.call({ input });
  return result.output;
}

// [Issue] FK001: External API call (POST) without receipt
async function sendNotification(userId: string, message: string) {
  await axios.post('/api/notifications', {
    userId,
    message,
  });
}

// [Issue] FK001: File write without receipt
async function saveReport(filename: string, content: string) {
  await fs.writeFile(`/reports/${filename}`, content);
}

// [Issue] FK001: Email send without receipt
async function notifyAdmin(subject: string, body: string) {
  await sendEmail({
    to: 'admin@example.com',
    subject,
    body,
  });
}

// Placeholder declarations for TypeScript
declare const prisma: any;
declare const axios: any;
declare const fs: any;
declare function sendEmail(opts: any): Promise<void>;
