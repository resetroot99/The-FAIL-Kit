/**
 * F.A.I.L. Kit ONNX Runtime Wrapper
 *
 * Runs quantized language models locally using ONNX runtime.
 */

export interface ModelConfig {
  modelPath: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  topK?: number;
}

interface InferenceSession {
  run(feeds: Record<string, unknown>): Promise<Record<string, unknown>>;
  dispose(): void;
}

/**
 * ONNX Runtime wrapper for local model inference
 */
export class OnnxRunner {
  private config: ModelConfig;
  private session: InferenceSession | null = null;
  private tokenizer: SimpleTokenizer | null = null;
  private initialized = false;

  constructor(config: ModelConfig) {
    this.config = {
      topP: 0.9,
      topK: 50,
      ...config,
    };
  }

  /**
   * Initialize the ONNX runtime and load the model
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to load ONNX runtime
      const ort = require('onnxruntime-node');
      
      // Create inference session
      const sessionOptions = {
        executionProviders: ['cpu'], // Use CPU for compatibility
        graphOptimizationLevel: 'all',
      };

      // Check if model file exists
      const fs = require('fs');
      if (fs.existsSync(this.config.modelPath)) {
        this.session = await ort.InferenceSession.create(
          this.config.modelPath,
          sessionOptions
        );
      } else {
        console.log(`[F.A.I.L. Kit] Model not found at ${this.config.modelPath}`);
        console.log('[F.A.I.L. Kit] Using simplified inference');
      }

      // Initialize simple tokenizer
      this.tokenizer = new SimpleTokenizer();

      this.initialized = true;
    } catch (error) {
      console.error('[F.A.I.L. Kit ONNX] Initialization failed:', error);
      // Continue without ONNX - will use fallback
      this.initialized = true;
    }
  }

  /**
   * Run inference on input text
   */
  async infer(prompt: string): Promise<string> {
    if (!this.session) {
      // Return empty for now - caller should use pattern matching
      return '';
    }

    try {
      // Tokenize input
      const inputIds = this.tokenizer!.encode(prompt);
      
      // Prepare input tensors
      const feeds = {
        input_ids: inputIds,
        attention_mask: new Array(inputIds.length).fill(1),
      };

      // Run inference
      const results = await this.session.run(feeds);
      
      // Decode output
      const outputIds = results.logits as number[];
      const output = this.tokenizer!.decode(outputIds);

      return output;
    } catch (error) {
      console.error('[F.A.I.L. Kit ONNX] Inference error:', error);
      return '';
    }
  }

  /**
   * Classify text into categories
   */
  async classify(
    text: string,
    categories: string[]
  ): Promise<{ category: string; confidence: number }[]> {
    if (!this.session) {
      // Fallback: return empty results
      return categories.map(c => ({ category: c, confidence: 0 }));
    }

    try {
      // Use zero-shot classification approach
      const prompt = `Classify the following text into one of these categories: ${categories.join(', ')}\n\nText: ${text}\n\nCategory:`;
      
      const result = await this.infer(prompt);
      
      // Parse result
      const scores = categories.map(category => {
        const similarity = this.calculateSimilarity(result.toLowerCase(), category.toLowerCase());
        return { category, confidence: similarity };
      });

      return scores.sort((a, b) => b.confidence - a.confidence);
    } catch {
      return categories.map(c => ({ category: c, confidence: 0 }));
    }
  }

  /**
   * Check if text matches a pattern/concept
   */
  async checkConcept(
    text: string,
    concept: string,
    context?: string
  ): Promise<{ matches: boolean; confidence: number; explanation: string }> {
    if (!this.session) {
      // Pattern-based fallback
      const patterns = this.getConceptPatterns(concept);
      const matches = patterns.some(p => p.test(text));
      return {
        matches,
        confidence: matches ? 0.6 : 0.4,
        explanation: matches ? `Pattern match for ${concept}` : `No pattern match for ${concept}`,
      };
    }

    try {
      const prompt = `Does the following code ${concept}?

Code:
\`\`\`
${text}
\`\`\`

Answer with YES or NO and explain briefly:`;

      const result = await this.infer(prompt);
      
      const isYes = /\byes\b/i.test(result);
      const confidence = isYes ? 0.8 : 0.7;

      return {
        matches: isYes,
        confidence,
        explanation: result.substring(0, 200),
      };
    } catch {
      return {
        matches: false,
        confidence: 0,
        explanation: 'Analysis failed',
      };
    }
  }

  /**
   * Get patterns for concept-based matching (fallback)
   */
  private getConceptPatterns(concept: string): RegExp[] {
    const conceptPatterns: Record<string, RegExp[]> = {
      'leak PII': [
        /(?:ssn|social.?security|password|api.?key|credit.?card)/i,
        /(?:console\.log|print|return).*(?:email|phone|address)/i,
      ],
      'allow injection': [
        /prompt\s*\+\s*(?:user|input|message)/i,
        /`\$\{.*(?:user|input).*\}`/i,
        /eval\s*\(/i,
      ],
      'perform destructive operation': [
        /(?:delete|remove|drop|truncate)\s*\(/i,
        /fs\.(?:unlink|rm|rmdir)/i,
      ],
      'handle errors': [
        /try\s*\{[\s\S]*catch/i,
        /\.catch\s*\(/i,
        /if\s*\(\s*error/i,
      ],
      'generate receipt': [
        /receipt|action_id|audit/i,
        /logAction|logReceipt/i,
      ],
    };

    return conceptPatterns[concept] || [new RegExp(concept, 'i')];
  }

  /**
   * Calculate text similarity (simple approach)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    let overlap = 0;
    for (const word of words1) {
      if (words2.has(word)) overlap++;
    }
    
    return overlap / Math.max(words1.size, words2.size);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.session?.dispose();
    this.session = null;
    this.initialized = false;
  }
}

/**
 * Simple tokenizer for basic text processing
 */
class SimpleTokenizer {
  private vocab: Map<string, number> = new Map();
  private reverseVocab: Map<number, string> = new Map();
  private nextId = 0;

  encode(text: string): number[] {
    const tokens = text.toLowerCase().split(/\s+/);
    const ids: number[] = [];

    for (const token of tokens) {
      if (!this.vocab.has(token)) {
        this.vocab.set(token, this.nextId);
        this.reverseVocab.set(this.nextId, token);
        this.nextId++;
      }
      ids.push(this.vocab.get(token)!);
    }

    return ids;
  }

  decode(ids: number[]): string {
    return ids.map(id => this.reverseVocab.get(id) || '[UNK]').join(' ');
  }
}
