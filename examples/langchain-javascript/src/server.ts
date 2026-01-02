/**
 * Complete LangChain.js + Express Example with F.A.I.L. Kit Integration
 * 
 * This example shows a full working agent with:
 * - Custom tools with receipt generation
 * - Express endpoint for F.A.I.L. Kit audits
 * - Email and calendar scheduling capabilities
 */

import express from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import dotenv from 'dotenv';

// Import F.A.I.L. Kit adapter
import {
  createFailKitRouter,
  ReceiptGeneratingTool,
  FailKitConfig
} from '../../middleware/langchain/javascript/src/index';

dotenv.config();

// ============================================================================
// Define Tools with Automatic Receipt Generation
// ============================================================================

class EmailTool extends ReceiptGeneratingTool {
  name = 'email_sender';
  description = `Send an email to a recipient. 
    Input should be a JSON string with 'to', 'subject', and 'body' fields.`;

  /**
   * Simulate sending an email.
   * In production, replace with actual email service (SendGrid, AWS SES, etc.)
   */
  async _execute(input: { to: string; subject: string; body: string }) {
    const { to, subject, body } = input;
    const messageId = `msg_${Math.abs(this._hashString(to + subject))}`;

    console.log(`📧 Sending email to ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${body.substring(0, 50)}...`);

    // Return structured output with metadata
    return {
      status: 'sent',
      message_id: messageId,
      to,
      metadata: {
        smtp_server: 'smtp.example.com',
        priority: 'normal',
        encrypted: true
      }
    };
  }

  private _hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
}

class CalendarTool extends ReceiptGeneratingTool {
  name = 'calendar_scheduler';
  description = `Schedule a calendar event.
    Input should be a JSON string with 'title', 'date', 'time', and 'attendees' fields.`;

  /**
   * Simulate scheduling a calendar event.
   * In production, replace with Google Calendar API, Outlook API, etc.
   */
  async _execute(input: { title: string; date: string; time: string; attendees: string }) {
    const { title, date, time, attendees } = input;
    const eventId = `evt_${Math.abs(this._hashString(title + date))}`;

    console.log(`📅 Scheduling event: ${title}`);
    console.log(`   Date: ${date} at ${time}`);
    console.log(`   Attendees: ${attendees}`);

    return {
      status: 'scheduled',
      event_id: eventId,
      title,
      date,
      time,
      metadata: {
        calendar: 'primary',
        timezone: 'America/New_York',
        reminders: ['15m', '1h']
      }
    };
  }

  private _hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
}

class DatabaseTool extends ReceiptGeneratingTool {
  name = 'database_writer';
  description = `Write data to the database.
    Input should be a JSON string with 'table', 'operation', and 'data' fields.`;

  /**
   * Simulate database write.
   * In production, replace with actual database calls.
   */
  async _execute(input: { table: string; operation: string; data: any }) {
    const { table, operation, data } = input;

    // Simulate error for demonstration
    if (operation === 'delete' && JSON.stringify(data).includes('critical')) {
      throw new Error('Cannot delete critical data without confirmation');
    }

    const recordId = `rec_${Math.abs(this._hashString(JSON.stringify(data)))}`;

    console.log(`💾 Database ${operation}: ${table}`);
    console.log(`   Data:`, data);

    return {
      status: 'success',
      operation,
      record_id: recordId,
      table,
      metadata: {
        database: 'production',
        affected_rows: 1
      }
    };
  }

  private _hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
}

// ============================================================================
// Create the Agent
// ============================================================================

async function createAgent() {
  // Initialize LLM
  const llm = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY
  });

  // Create tools
  const tools = [
    new EmailTool(),
    new CalendarTool(),
    new DatabaseTool()
  ];

  // Create prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a helpful AI assistant that can send emails, 
schedule calendar events, and write to databases.

When you take an action, always confirm what you did with specific details.
If a tool fails, explain the error to the user clearly.`
    ],
    ['user', '{input}'],
    new MessagesPlaceholder('agent_scratchpad')
  ]);

  // Create agent
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt
  });

  // Create agent executor (intermediate steps will be enabled by F.A.I.L. Kit router)
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: true
  });

  return agentExecutor;
}

// ============================================================================
// Create Express App with F.A.I.L. Kit Endpoint
// ============================================================================

async function main() {
  const app = express();
  app.use(express.json());

  // Create agent
  const agentExecutor = await createAgent();

  // Add F.A.I.L. Kit evaluation endpoint
  const failKitConfig: FailKitConfig = {
    autoReceipts: true,
    includeMetadata: true,
    trackLatency: true
  };

  app.use(
    '/eval',
    createFailKitRouter(agentExecutor, failKitConfig)
  );

  // Optional: Add a test endpoint for manual testing
  app.post('/chat', async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt' });
      }

      const result = await agentExecutor.call({ input: prompt });

      res.json({
        response: result.output,
        steps: result.intermediateSteps?.length || 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'running',
      service: 'LangChain.js Agent with F.A.I.L. Kit',
      endpoints: {
        audit: '/eval/run',
        chat: '/chat'
      }
    });
  });

  // Start server
  const PORT = process.env.PORT || 8000;
  
  app.listen(PORT, () => {
    console.log('🚀 Starting LangChain.js agent with F.A.I.L. Kit integration');
    console.log(`📍 Audit endpoint: http://localhost:${PORT}/eval/run`);
    console.log(`💬 Chat endpoint: http://localhost:${PORT}/chat`);
    console.log();
    console.log('Test with:');
    console.log(`  curl -X POST http://localhost:${PORT}/eval/run \\`);
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"prompt": "Send an email to john@example.com saying hello"}\'');
    console.log();
  });
}

// Run the server
main().catch(console.error);
