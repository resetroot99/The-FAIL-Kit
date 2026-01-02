/**
 * Tests for F.A.I.L. Kit LangChain adapter (JavaScript/TypeScript)
 */

import {
  ReceiptGeneratingTool,
  hashData,
  extractReceiptsFromAgentExecutor,
  wrapToolWithReceipts,
  createFailKitRouter,
  ActionReceipt
} from '../src/index';
import { Tool } from '@langchain/core/tools';

describe('hashData', () => {
  it('should produce consistent hashes', () => {
    const data = { key: 'value', number: 123 };
    const hash1 = hashData(data);
    const hash2 = hashData(data);
    expect(hash1).toBe(hash2);
  });

  it('should produce correct format', () => {
    const data = { test: 'data' };
    const result = hashData(data);
    expect(result).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should produce different hashes for different data', () => {
    const hash1 = hashData({ a: 1 });
    const hash2 = hashData({ a: 2 });
    expect(hash1).not.toBe(hash2);
  });
});

describe('ReceiptGeneratingTool', () => {
  class TestTool extends ReceiptGeneratingTool {
    name = 'test_tool';
    description = 'A test tool';

    async _execute(input: { arg: string }): Promise<any> {
      return { result: `processed_${input.arg}` };
    }
  }

  it('should generate receipt on successful execution', async () => {
    const tool = new TestTool();
    const result = await tool._call({ arg: 'test' });

    expect(result).toEqual({ result: 'processed_test' });

    const receipts = tool.getReceipts();
    expect(receipts).toHaveLength(1);

    const receipt = receipts[0];
    expect(receipt.tool_name).toBe('test_tool');
    expect(receipt.status).toBe('success');
    expect(receipt).toHaveProperty('action_id');
    expect(receipt).toHaveProperty('timestamp');
    expect(receipt).toHaveProperty('input_hash');
    expect(receipt).toHaveProperty('output_hash');
    expect(receipt).toHaveProperty('latency_ms');
  });

  it('should generate receipt on failure', async () => {
    class FailingTool extends ReceiptGeneratingTool {
      name = 'failing_tool';
      description = 'A tool that fails';

      async _execute(input: any): Promise<any> {
        throw new Error('Test error');
      }
    }

    const tool = new FailingTool();

    await expect(tool._call({ arg: 'test' })).rejects.toThrow('Test error');

    const receipts = tool.getReceipts();
    expect(receipts).toHaveLength(1);

    const receipt = receipts[0];
    expect(receipt.status).toBe('failed');
    expect(receipt.error_message).toBe('Test error');
  });

  it('should include custom metadata in receipt', async () => {
    class MetadataTool extends ReceiptGeneratingTool {
      name = 'metadata_tool';
      description = 'A tool with metadata';

      async _execute(input: any): Promise<any> {
        return {
          result: 'done',
          metadata: { custom_field: 'custom_value' }
        };
      }
    }

    const tool = new MetadataTool();
    await tool._call({ arg: 'test' });

    const receipts = tool.getReceipts();
    expect(receipts[0].metadata?.custom_field).toBe('custom_value');
  });

  it('should clear receipts', async () => {
    const tool = new TestTool();
    await tool._call({ arg: 'test1' });
    await tool._call({ arg: 'test2' });

    expect(tool.getReceipts()).toHaveLength(2);

    tool.clearReceipts();
    expect(tool.getReceipts()).toHaveLength(0);
  });
});

describe('wrapToolWithReceipts', () => {
  it('should wrap a legacy tool', async () => {
    class LegacyTool extends Tool {
      name = 'legacy_tool';
      description = 'Legacy tool';

      async _call(input: string): Promise<string> {
        return `result_${input}`;
      }
    }

    const legacyTool = new LegacyTool();
    const wrapped = wrapToolWithReceipts(legacyTool);

    expect(wrapped).toBeInstanceOf(ReceiptGeneratingTool);
    expect(wrapped.name).toBe('legacy_tool');
    expect(wrapped.description).toBe('Legacy tool');

    const result = await wrapped._call('test');
    expect(result).toBe('result_test');
    expect(wrapped.getReceipts()).toHaveLength(1);
  });
});

describe('Receipt Schema Compliance', () => {
  it('should produce receipts compliant with RECEIPT_SCHEMA.json', async () => {
    class TestTool extends ReceiptGeneratingTool {
      name = 'test_tool';
      description = 'Test';

      async _execute(input: any): Promise<any> {
        return { result: 'done' };
      }
    }

    const tool = new TestTool();
    await tool._call({ arg: 'test' });

    const receipts = tool.getReceipts();
    const receipt = receipts[0];

    // Required fields per RECEIPT_SCHEMA.json
    const requiredFields = [
      'action_id',
      'tool_name',
      'timestamp',
      'status',
      'input_hash',
      'output_hash'
    ];

    for (const field of requiredFields) {
      expect(receipt).toHaveProperty(field);
    }

    // Validate formats
    expect(typeof receipt.action_id).toBe('string');
    expect(typeof receipt.tool_name).toBe('string');
    expect(typeof receipt.timestamp).toBe('string');
    expect(['success', 'failed']).toContain(receipt.status);
    expect(receipt.input_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(receipt.output_hash).toMatch(/^sha256:[a-f0-9]{64}$/);

    // Optional fields
    if (receipt.latency_ms !== undefined) {
      expect(typeof receipt.latency_ms).toBe('number');
      expect(receipt.latency_ms).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('createFailKitRouter', () => {
  it('should create a router with /run endpoint', () => {
    // Mock AgentExecutor
    const mockExecutor = {
      tools: [],
      call: jest.fn().mockResolvedValue({
        output: 'Test response',
        intermediateSteps: []
      })
    } as any;

    const router = createFailKitRouter(mockExecutor);

    // Verify router is created
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
