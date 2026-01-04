/**
 * F.A.I.L. Kit Mock Providers
 *
 * Pre-configured mocks for LLM providers and payment services.
 * Used for local testing without real API calls.
 */

export interface MockResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  delay?: number;
}

export interface MockScenario {
  name: string;
  description: string;
  responses: Record<string, MockResponse>;
}

// ============================================
// LLM Provider Mocks
// ============================================

export const OPENAI_MOCKS: Record<string, MockResponse> = {
  'chat/completions': {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      id: 'chatcmpl-mock-12345',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a mock response from the F.A.I.L. Kit sandbox.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 15,
        total_tokens: 25,
      },
    },
  },
  'chat/completions/error': {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
    body: {
      error: {
        message: 'Rate limit exceeded',
        type: 'rate_limit_error',
        code: 'rate_limit_exceeded',
      },
    },
    delay: 100,
  },
  'chat/completions/timeout': {
    status: 504,
    headers: { 'Content-Type': 'application/json' },
    body: {
      error: {
        message: 'Gateway timeout',
        type: 'timeout_error',
      },
    },
    delay: 30000,
  },
};

export const ANTHROPIC_MOCKS: Record<string, MockResponse> = {
  'messages': {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      id: 'msg_mock_12345',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'This is a mock response from the F.A.I.L. Kit sandbox.',
        },
      ],
      model: 'claude-3-opus-20240229',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 15,
      },
    },
  },
  'messages/error': {
    status: 529,
    headers: { 'Content-Type': 'application/json' },
    body: {
      type: 'error',
      error: {
        type: 'overloaded_error',
        message: 'API is overloaded',
      },
    },
  },
};

// ============================================
// Payment Provider Mocks
// ============================================

export const STRIPE_MOCKS: Record<string, MockResponse> = {
  'payment_intents/create': {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      id: 'pi_mock_12345',
      object: 'payment_intent',
      amount: 2000,
      currency: 'usd',
      status: 'requires_confirmation',
      client_secret: 'pi_mock_12345_secret_mock',
      created: Date.now(),
      livemode: false,
    },
  },
  'payment_intents/confirm': {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      id: 'pi_mock_12345',
      object: 'payment_intent',
      amount: 2000,
      currency: 'usd',
      status: 'succeeded',
      created: Date.now(),
      livemode: false,
    },
  },
  'charges/create': {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      id: 'ch_mock_12345',
      object: 'charge',
      amount: 2000,
      currency: 'usd',
      status: 'succeeded',
      paid: true,
      livemode: false,
    },
  },
  'refunds/create': {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      id: 're_mock_12345',
      object: 'refund',
      amount: 2000,
      currency: 'usd',
      status: 'succeeded',
    },
  },
  'charges/declined': {
    status: 402,
    headers: { 'Content-Type': 'application/json' },
    body: {
      error: {
        type: 'card_error',
        code: 'card_declined',
        message: 'Your card was declined.',
        decline_code: 'generic_decline',
      },
    },
  },
};

export const PAYPAL_MOCKS: Record<string, MockResponse> = {
  'orders/create': {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
    body: {
      id: 'ORDER-MOCK-12345',
      status: 'CREATED',
      links: [
        {
          href: 'http://localhost:8765/paypal/approve',
          rel: 'approve',
          method: 'GET',
        },
      ],
    },
  },
  'orders/capture': {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
    body: {
      id: 'ORDER-MOCK-12345',
      status: 'COMPLETED',
      purchase_units: [
        {
          payments: {
            captures: [
              {
                id: 'CAPTURE-MOCK-12345',
                status: 'COMPLETED',
                amount: { value: '20.00', currency_code: 'USD' },
              },
            ],
          },
        },
      ],
    },
  },
};

// ============================================
// Database Mocks
// ============================================

export const DATABASE_MOCKS: Record<string, MockResponse> = {
  'query/select': {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      rows: [
        { id: 1, name: 'Test User', email: 'test@example.com' },
        { id: 2, name: 'Mock User', email: 'mock@example.com' },
      ],
      rowCount: 2,
    },
  },
  'query/insert': {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      rows: [{ id: 3 }],
      rowCount: 1,
      command: 'INSERT',
    },
  },
  'query/delete': {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      rowCount: 1,
      command: 'DELETE',
    },
  },
};

// ============================================
// Scenario Configurations
// ============================================

export const MOCK_SCENARIOS: MockScenario[] = [
  {
    name: 'happy-path',
    description: 'All services respond successfully',
    responses: {
      '/openai/*': OPENAI_MOCKS['chat/completions'],
      '/anthropic/*': ANTHROPIC_MOCKS['messages'],
      '/stripe/*': STRIPE_MOCKS['payment_intents/create'],
    },
  },
  {
    name: 'rate-limited',
    description: 'LLM APIs return rate limit errors',
    responses: {
      '/openai/*': OPENAI_MOCKS['chat/completions/error'],
      '/anthropic/*': ANTHROPIC_MOCKS['messages/error'],
    },
  },
  {
    name: 'payment-declined',
    description: 'Payment provider declines the charge',
    responses: {
      '/stripe/charges': STRIPE_MOCKS['charges/declined'],
    },
  },
  {
    name: 'timeout',
    description: 'LLM calls timeout after 30 seconds',
    responses: {
      '/openai/*': OPENAI_MOCKS['chat/completions/timeout'],
    },
  },
];

/**
 * Get mock response for a given path and provider
 */
export function getMockResponse(provider: string, path: string): MockResponse | null {
  switch (provider) {
    case 'openai':
      return OPENAI_MOCKS[path] || OPENAI_MOCKS['chat/completions'];
    case 'anthropic':
      return ANTHROPIC_MOCKS[path] || ANTHROPIC_MOCKS['messages'];
    case 'stripe':
      return STRIPE_MOCKS[path] || null;
    case 'paypal':
      return PAYPAL_MOCKS[path] || null;
    case 'database':
      return DATABASE_MOCKS[path] || null;
    default:
      return null;
  }
}

/**
 * Generate dynamic mock based on request body
 */
export function generateDynamicMock(provider: string, path: string, body: unknown): MockResponse {
  const baseMock = getMockResponse(provider, path);
  
  if (!baseMock) {
    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Mock not found' },
    };
  }

  // Customize response based on request
  if (provider === 'openai' && typeof body === 'object' && body !== null) {
    const request = body as Record<string, unknown>;
    if (request.messages && Array.isArray(request.messages)) {
      const lastMessage = request.messages[request.messages.length - 1];
      if (lastMessage && typeof lastMessage === 'object') {
        const content = (lastMessage as Record<string, unknown>).content;
        if (typeof content === 'string') {
          return {
            ...baseMock,
            body: {
              ...(baseMock.body as object),
              choices: [
                {
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: `Mock response to: "${content.substring(0, 50)}..."`,
                  },
                  finish_reason: 'stop',
                },
              ],
            },
          };
        }
      }
    }
  }

  return baseMock;
}
