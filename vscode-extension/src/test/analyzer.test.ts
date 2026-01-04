/**
 * F.A.I.L. Kit Analyzer Unit Tests
 */

import { analyzeDocument, quickAnalyze } from '../analyzer/astAnalyzer';
import {
  TOOL_PATTERNS,
  LLM_PATTERNS,
  AGENT_PATTERNS,
  hasReceiptNearby,
  hasErrorHandlingNearby,
  hasDisableComment,
  isTestFile,
} from '../analyzer/patterns';
import { findReceiptPattern, validateReceiptObject } from '../analyzer/receiptValidator';

// Test utilities
function assertIssue(issues: any[], ruleId: string, expectedCount: number = 1) {
  const matching = issues.filter(i => i.ruleId === ruleId);
  if (matching.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${ruleId} issues, got ${matching.length}`);
  }
}

function assertNoIssue(issues: any[], ruleId: string) {
  const matching = issues.filter(i => i.ruleId === ruleId);
  if (matching.length > 0) {
    throw new Error(`Expected no ${ruleId} issues, got ${matching.length}`);
  }
}

// ============================================
// Pattern Detection Tests
// ============================================

describe('Pattern Detection', () => {
  describe('Tool Patterns', () => {
    test('detects Stripe charges.create', () => {
      const code = `await stripe.charges.create({ amount: 1000 });`;
      const result = analyzeDocument(code, 'test.ts');
      assertIssue(result.issues, 'FK001');
    });

    test('detects Prisma create/update/delete', () => {
      const code = `
        await prisma.create({ data: { name: 'test' } });
        await prisma.update({ where: { id: 1 }, data: { name: 'updated' } });
        await prisma.delete({ where: { id: 1 } });
      `;
      const result = analyzeDocument(code, 'test.ts');
      expect(result.toolCalls.length).toBeGreaterThanOrEqual(3);
    });

    test('detects axios POST requests', () => {
      const code = `await axios.post('/api/endpoint', { data: 'test' });`;
      const result = analyzeDocument(code, 'test.ts');
      assertIssue(result.issues, 'FK001');
    });

    test('does not flag axios GET requests', () => {
      const code = `await axios.get('/api/endpoint');`;
      const result = analyzeDocument(code, 'test.ts');
      // GET is read-only, should not require receipt
      expect(result.toolCalls.some(t => t.tool === 'http_request' && !t.destructive)).toBe(true);
    });

    test('detects fs.writeFile', () => {
      const code = `await fs.writeFile('/path/file.txt', 'content');`;
      const result = analyzeDocument(code, 'test.ts');
      assertIssue(result.issues, 'FK001');
    });

    test('detects sendEmail', () => {
      const code = `await sendEmail({ to: 'user@test.com', subject: 'Hello' });`;
      const result = analyzeDocument(code, 'test.ts');
      assertIssue(result.issues, 'FK001');
    });
  });

  describe('LLM Patterns', () => {
    test('detects OpenAI chat.completions.create', () => {
      const code = `
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }]
        });
      `;
      const result = analyzeDocument(code, 'test.ts');
      assertIssue(result.issues, 'FK002');
    });

    test('detects Anthropic messages.create', () => {
      const code = `
        const response = await anthropic.messages.create({
          model: 'claude-3-opus',
          messages: [{ role: 'user', content: 'Hello' }]
        });
      `;
      const result = analyzeDocument(code, 'test.ts');
      assertIssue(result.issues, 'FK002');
    });

    test('detects generic LLM invoke', () => {
      const code = `const result = await llm.invoke('Generate a poem');`;
      const result = analyzeDocument(code, 'test.ts');
      expect(result.llmCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Agent Patterns', () => {
    test('detects AgentExecutor.call', () => {
      const code = `
        const agent = new AgentExecutor({ tools, llm });
        const result = await agent.call({ input: 'do something' });
      `;
      const result = analyzeDocument(code, 'test.ts');
      expect(result.agentCalls.length).toBeGreaterThan(0);
    });

    test('detects crew.kickoff', () => {
      const code = `await crew.kickoff();`;
      const result = analyzeDocument(code, 'test.ts');
      expect(result.agentCalls.some(a => a.framework === 'crewai')).toBe(true);
    });
  });
});

// ============================================
// Receipt Detection Tests
// ============================================

describe('Receipt Detection', () => {
  test('detects receipt generation after tool call', () => {
    const code = `
      const result = await stripe.charges.create({ amount: 1000 });
      const receipt = createReceipt({
        action_id: 'act_123',
        tool_name: 'payment',
        status: 'success'
      });
    `;
    const result = analyzeDocument(code, 'test.ts');
    // Should have tool call but receipt should be nearby
    expect(result.toolCalls.length).toBeGreaterThan(0);
    expect(result.toolCalls[0].hasReceipt).toBe(true);
  });

  test('detects missing receipt', () => {
    const code = `
      const result = await stripe.charges.create({ amount: 1000 });
      return { success: true };
    `;
    const result = analyzeDocument(code, 'test.ts');
    assertIssue(result.issues, 'FK001');
  });

  test('hasReceiptNearby finds receipt patterns', () => {
    const code = `
      const result = await api.call();
      const receipt = { action_id: 'test', input_hash: 'sha256:abc' };
    `;
    expect(hasReceiptNearby(code, 30)).toBe(true);
  });

  test('hasReceiptNearby returns false when no receipt', () => {
    const code = `
      const result = await api.call();
      return result;
    `;
    expect(hasReceiptNearby(code, 0)).toBe(false);
  });
});

// ============================================
// Error Handling Detection Tests
// ============================================

describe('Error Handling Detection', () => {
  test('detects try-catch around LLM call', () => {
    const code = `
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: []
        });
      } catch (error) {
        console.error(error);
      }
    `;
    const result = analyzeDocument(code, 'test.ts');
    // Should not flag FK002 if try-catch present
    assertNoIssue(result.issues, 'FK002');
  });

  test('detects missing error handling', () => {
    const code = `
      async function fetchData() {
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: []
        });
        return response;
      }
    `;
    const result = analyzeDocument(code, 'test.ts');
    assertIssue(result.issues, 'FK002');
  });

  test('hasErrorHandlingNearby finds try block', () => {
    const code = `
      try {
        await api.call();
      } catch (e) {}
    `;
    expect(hasErrorHandlingNearby(code, 30)).toBe(true);
  });
});

// ============================================
// Disable Comment Tests
// ============================================

describe('Disable Comments', () => {
  test('hasDisableComment detects fail-kit-disable', () => {
    expect(hasDisableComment('// fail-kit-disable')).toBe(true);
    expect(hasDisableComment('// fail-kit-disable-next-line')).toBe(true);
    expect(hasDisableComment('// failkit-ignore')).toBe(true);
  });

  test('hasDisableComment checks previous line', () => {
    expect(hasDisableComment('await api.call();', '// fail-kit-disable-next-line')).toBe(true);
  });

  test('skips analysis for disabled lines', () => {
    const code = `
      // fail-kit-disable-next-line
      await stripe.charges.create({ amount: 1000 });
    `;
    const result = analyzeDocument(code, 'test.ts');
    // Should not flag the disabled line
    expect(result.issues.length).toBe(0);
  });
});

// ============================================
// Test File Detection Tests
// ============================================

describe('Test File Detection', () => {
  test('isTestFile detects test files', () => {
    expect(isTestFile('component.test.ts')).toBe(true);
    expect(isTestFile('component.spec.ts')).toBe(true);
    expect(isTestFile('__tests__/component.ts')).toBe(true);
    expect(isTestFile('/test/component.ts')).toBe(true);
  });

  test('isTestFile returns false for regular files', () => {
    expect(isTestFile('component.ts')).toBe(false);
    expect(isTestFile('service.js')).toBe(false);
    expect(isTestFile('utils/helper.ts')).toBe(false);
  });

  test('skips analysis for test files', () => {
    const code = `await stripe.charges.create({ amount: 1000 });`;
    const result = analyzeDocument(code, 'payment.test.ts');
    expect(result.issues.length).toBe(0);
  });
});

// ============================================
// Quick Analyze Tests
// ============================================

describe('Quick Analyze', () => {
  test('detects agent code presence', () => {
    const code = `await openai.chat.completions.create({});`;
    const result = quickAnalyze(code);
    expect(result.hasAgentCode).toBe(true);
    expect(result.patternMatches).toBeGreaterThan(0);
  });

  test('returns false for non-agent code', () => {
    const code = `
      function add(a, b) {
        return a + b;
      }
    `;
    const result = quickAnalyze(code);
    expect(result.hasAgentCode).toBe(false);
  });
});

// ============================================
// Receipt Validator Tests
// ============================================

describe('Receipt Validator', () => {
  test('validates correct receipt', () => {
    const receipt = {
      action_id: 'act_123',
      tool_name: 'payment',
      timestamp: '2025-01-03T12:00:00Z',
      status: 'success',
      input_hash: 'sha256:' + 'a'.repeat(64),
      output_hash: 'sha256:' + 'b'.repeat(64),
    };
    const result = validateReceiptObject(receipt);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('rejects receipt with missing fields', () => {
    const receipt = {
      action_id: 'act_123',
      tool_name: 'payment',
    };
    const result = validateReceiptObject(receipt);
    expect(result.valid).toBe(false);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });

  test('rejects receipt with invalid hash format', () => {
    const receipt = {
      action_id: 'act_123',
      tool_name: 'payment',
      timestamp: '2025-01-03T12:00:00Z',
      status: 'success',
      input_hash: 'invalid_hash',
      output_hash: 'sha256:' + 'b'.repeat(64),
    };
    const result = validateReceiptObject(receipt);
    expect(result.valid).toBe(false);
  });

  test('findReceiptPattern locates receipt generation', () => {
    const code = `
      const result = await api.call();
      const receipt = createReceipt({ action_id: 'test' });
    `;
    const check = findReceiptPattern(code, 0, 10);
    expect(check.found).toBe(true);
  });
});

// ============================================
// Edge Case Tests
// ============================================

describe('Edge Cases', () => {
  test('handles empty file', () => {
    const result = analyzeDocument('', 'empty.ts');
    expect(result.issues.length).toBe(0);
  });

  test('handles file with only comments', () => {
    const code = `
      // This is a comment
      /* Multi-line
         comment */
    `;
    const result = analyzeDocument(code, 'comments.ts');
    expect(result.issues.length).toBe(0);
  });

  test('handles nested function calls', () => {
    const code = `
      await processPayment(await stripe.charges.create({ amount: getAmount() }));
    `;
    const result = analyzeDocument(code, 'nested.ts');
    expect(result.toolCalls.length).toBeGreaterThan(0);
  });

  test('handles multiple issues on same line', () => {
    const code = `await openai.chat.completions.create({}); await stripe.charges.create({});`;
    const result = analyzeDocument(code, 'multi.ts');
    // Should detect both issues
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });

  test('handles async arrow functions', () => {
    const code = `
      const process = async () => {
        await stripe.charges.create({ amount: 1000 });
      };
    `;
    const result = analyzeDocument(code, 'arrow.ts');
    assertIssue(result.issues, 'FK001');
  });

  test('handles class methods', () => {
    const code = `
      class PaymentService {
        async charge(amount: number) {
          await stripe.charges.create({ amount });
        }
      }
    `;
    const result = analyzeDocument(code, 'class.ts');
    assertIssue(result.issues, 'FK001');
  });
});

// Mock implementations for test runner
function describe(name: string, fn: () => void) {
  console.log(`\n[Package] ${name}`);
  fn();
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
  } catch (error: any) {
    console.log(`  [FAIL] ${name}: ${error.message}`);
  }
}

function expect(value: any) {
  return {
    toBe: (expected: any) => {
      if (value !== expected) {
        throw new Error(`Expected ${expected}, got ${value}`);
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (value <= expected) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual: (expected: number) => {
      if (value < expected) {
        throw new Error(`Expected ${value} to be >= ${expected}`);
      }
    },
  };
}

// Run tests if executed directly
if (require.main === module) {
  console.log('[Test] F.A.I.L. Kit Analyzer Tests\n');
  console.log('=' .repeat(50));
}
