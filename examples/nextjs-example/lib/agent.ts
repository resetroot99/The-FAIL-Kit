/**
 * F.A.I.L. Kit Next.js Example - RAG Agent
 * 
 * A simple knowledge base agent that demonstrates
 * proper action receipts for RAG queries.
 */

// Mock knowledge base
const knowledgeBase = new Map([
  ['pricing', 'Our basic plan is $9/month, Pro is $29/month, and Enterprise is custom pricing.'],
  ['refunds', 'Refunds are available within 30 days of purchase. Contact support@example.com.'],
  ['hours', 'Our support team is available Monday-Friday, 9am-5pm EST.'],
  ['shipping', 'Standard shipping takes 5-7 business days. Express shipping is 2-3 days.'],
]);

export interface AgentAction {
  action_id: string;
  tool_name: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  input_hash?: string;
  output_hash?: string;
  latency_ms: number;
  metadata?: Record<string, unknown>;
}

export interface AgentResult {
  text: string;
  actions: AgentAction[];
  sources?: string[];
  policy?: {
    escalate: boolean;
    reasons: string[];
  };
}

/**
 * Simple RAG agent that queries the knowledge base
 */
export async function ragAgent(query: string): Promise<AgentResult> {
  const startTime = Date.now();
  const actions: AgentAction[] = [];
  const sources: string[] = [];
  
  // Normalize query
  const normalizedQuery = query.toLowerCase();
  
  // Search knowledge base
  let bestMatch: string | null = null;
  let bestTopic: string | null = null;
  
  for (const [topic, content] of knowledgeBase) {
    if (normalizedQuery.includes(topic)) {
      bestMatch = content;
      bestTopic = topic;
      break;
    }
  }
  
  // Record the RAG retrieval action
  const retrievalLatency = Date.now() - startTime;
  
  if (bestMatch) {
    actions.push({
      action_id: `act_rag_${Date.now()}`,
      tool_name: 'rag_retrieval',
      timestamp: new Date().toISOString(),
      status: 'success',
      input_hash: `sha256:${Buffer.from(query).toString('base64').slice(0, 16)}`,
      output_hash: `sha256:${Buffer.from(bestMatch).toString('base64').slice(0, 16)}`,
      latency_ms: retrievalLatency,
      metadata: {
        topic: bestTopic,
        chunks_retrieved: 1,
        relevance_score: 0.95
      }
    });
    
    sources.push(`knowledge_base/${bestTopic}`);
    
    return {
      text: bestMatch,
      actions,
      sources
    };
  }
  
  // No match found - don't hallucinate!
  actions.push({
    action_id: `act_rag_${Date.now()}`,
    tool_name: 'rag_retrieval',
    timestamp: new Date().toISOString(),
    status: 'success',
    input_hash: `sha256:${Buffer.from(query).toString('base64').slice(0, 16)}`,
    latency_ms: retrievalLatency,
    metadata: {
      chunks_retrieved: 0,
      relevance_score: 0
    }
  });
  
  return {
    text: "I don't have information about that in my knowledge base. Please contact support@example.com for assistance.",
    actions,
    sources: []
  };
}

/**
 * Agent that handles high-stakes requests with escalation
 */
export async function escalationAgent(query: string): Promise<AgentResult> {
  const normalizedQuery = query.toLowerCase();
  
  // Check for high-stakes keywords
  const highStakesKeywords = ['delete', 'cancel', 'refund', 'terminate', 'remove account'];
  const isHighStakes = highStakesKeywords.some(kw => normalizedQuery.includes(kw));
  
  if (isHighStakes) {
    return {
      text: 'This request requires human approval. I\'ve escalated it to our support team.',
      actions: [],
      policy: {
        escalate: true,
        reasons: ['high-stakes operation', 'requires human approval']
      }
    };
  }
  
  // Handle normal requests
  return ragAgent(query);
}
