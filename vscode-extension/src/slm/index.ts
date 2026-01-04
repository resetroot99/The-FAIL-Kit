/**
 * F.A.I.L. Kit Semantic Language Model Module
 *
 * Integrates local small language models for semantic code analysis.
 * Uses ONNX runtime for fast inference without external API calls.
 */

export * from './onnxRunner';
export * from './policyAnalyzer';
export * from './intentClassifier';

import { OnnxRunner, ModelConfig } from './onnxRunner';
import { PolicyAnalyzer } from './policyAnalyzer';
import { IntentClassifier } from './intentClassifier';
import * as vscode from 'vscode';

/**
 * SLM Module configuration
 */
export interface SLMConfig {
  modelPath?: string;
  modelName: string;
  cacheDir: string;
  maxTokens: number;
  temperature: number;
  enableSemanticAnalysis: boolean;
}

const DEFAULT_CONFIG: SLMConfig = {
  modelName: 'phi-2',
  cacheDir: '.fail-kit/models',
  maxTokens: 256,
  temperature: 0.1,
  enableSemanticAnalysis: true,
};

/**
 * Semantic Language Model service
 */
export class SemanticAnalysisService {
  private config: SLMConfig;
  private runner: OnnxRunner | null = null;
  private policyAnalyzer: PolicyAnalyzer;
  private intentClassifier: IntentClassifier;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: Partial<SLMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.policyAnalyzer = new PolicyAnalyzer();
    this.intentClassifier = new IntentClassifier();
  }

  /**
   * Initialize the SLM service
   */
  async initialize(context: vscode.ExtensionContext): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.doInitialize(context);
    await this.initializationPromise;
  }

  private async doInitialize(context: vscode.ExtensionContext): Promise<void> {
    try {
      const modelPath = this.config.modelPath || 
        context.asAbsolutePath(`models/${this.config.modelName}`);

      // Check if ONNX runtime is available
      const onnxAvailable = await this.checkOnnxAvailable();
      
      if (onnxAvailable) {
        this.runner = new OnnxRunner({
          modelPath,
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        });
        await this.runner.initialize();
      } else {
        // Use pattern-based fallback
        console.log('[F.A.I.L. Kit SLM] ONNX runtime not available, using pattern-based analysis');
      }

      this.initialized = true;
    } catch (error) {
      console.error('[F.A.I.L. Kit SLM] Initialization failed:', error);
      // Continue without SLM - fall back to pattern matching
      this.initialized = true;
    }
  }

  private async checkOnnxAvailable(): Promise<boolean> {
    try {
      // Try to require onnxruntime-node
      require('onnxruntime-node');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Analyze code for potential security issues
   */
  async analyzeCode(
    code: string,
    context?: string
  ): Promise<SemanticAnalysisResult> {
    if (!this.config.enableSemanticAnalysis) {
      return this.getEmptyResult();
    }

    // Use ONNX runner if available, otherwise pattern-based
    if (this.runner) {
      return this.analyzeWithSLM(code, context);
    } else {
      return this.analyzeWithPatterns(code, context);
    }
  }

  private async analyzeWithSLM(
    code: string,
    context?: string
  ): Promise<SemanticAnalysisResult> {
    const result: SemanticAnalysisResult = {
      piiRisk: null,
      injectionRisk: null,
      policyViolations: [],
      intents: [],
      confidence: 0,
    };

    try {
      // Analyze for PII leakage
      const piiAnalysis = await this.policyAnalyzer.checkPIILeakage(code, this.runner!);
      result.piiRisk = piiAnalysis;

      // Analyze for injection vulnerabilities
      const injectionAnalysis = await this.policyAnalyzer.checkInjectionVulnerability(code, this.runner!);
      result.injectionRisk = injectionAnalysis;

      // Check policy violations
      const violations = await this.policyAnalyzer.checkPolicyViolations(code, this.runner!);
      result.policyViolations = violations;

      // Classify intents
      const intents = await this.intentClassifier.classifyIntents(code, this.runner!);
      result.intents = intents;

      // Calculate overall confidence
      result.confidence = this.calculateConfidence([
        piiAnalysis?.confidence || 0,
        injectionAnalysis?.confidence || 0,
        ...violations.map(v => v.confidence),
      ]);

    } catch (error) {
      console.error('[F.A.I.L. Kit SLM] Analysis error:', error);
      return this.analyzeWithPatterns(code, context);
    }

    return result;
  }

  private async analyzeWithPatterns(
    code: string,
    _context?: string
  ): Promise<SemanticAnalysisResult> {
    // Pattern-based fallback when SLM is not available
    const result: SemanticAnalysisResult = {
      piiRisk: null,
      injectionRisk: null,
      policyViolations: [],
      intents: [],
      confidence: 0.7, // Lower confidence for pattern-based
    };

    // PII patterns
    const piiPatterns = [
      /(?:ssn|social.?security|password|secret|api.?key|credit.?card|card.?number)/i,
      /(?:email|phone|address|dob|date.?of.?birth)/i,
    ];

    if (piiPatterns.some(p => p.test(code))) {
      result.piiRisk = {
        detected: true,
        confidence: 0.7,
        reason: 'Pattern match: code references PII fields',
        recommendation: 'Ensure PII is properly sanitized before output',
      };
    }

    // Injection patterns
    const injectionPatterns = [
      /prompt\s*\+/i,
      /`\$\{.*user.*\}`/i,
      /input.*concat/i,
      /format\s*\(.*message/i,
    ];

    if (injectionPatterns.some(p => p.test(code))) {
      result.injectionRisk = {
        detected: true,
        confidence: 0.6,
        reason: 'Pattern match: user input concatenated with prompts',
        recommendation: 'Validate and sanitize user input before prompt injection',
      };
    }

    // Intent classification based on patterns
    if (/(?:delete|remove|drop|truncate)/i.test(code)) {
      result.intents.push({
        intent: 'destructive_operation',
        confidence: 0.8,
        description: 'Code performs destructive operations',
      });
    }

    if (/(?:send|email|notify|message)/i.test(code)) {
      result.intents.push({
        intent: 'external_communication',
        confidence: 0.7,
        description: 'Code sends external communications',
      });
    }

    if (/(?:transfer|payment|charge|billing)/i.test(code)) {
      result.intents.push({
        intent: 'financial_operation',
        confidence: 0.8,
        description: 'Code performs financial operations',
      });
    }

    return result;
  }

  private getEmptyResult(): SemanticAnalysisResult {
    return {
      piiRisk: null,
      injectionRisk: null,
      policyViolations: [],
      intents: [],
      confidence: 0,
    };
  }

  private calculateConfidence(scores: number[]): number {
    const validScores = scores.filter(s => s > 0);
    if (validScores.length === 0) return 0;
    return validScores.reduce((a, b) => a + b, 0) / validScores.length;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.runner?.dispose();
    this.runner = null;
    this.initialized = false;
  }
}

/**
 * Semantic analysis result
 */
export interface SemanticAnalysisResult {
  piiRisk: RiskAnalysis | null;
  injectionRisk: RiskAnalysis | null;
  policyViolations: PolicyViolation[];
  intents: IntentAnalysis[];
  confidence: number;
}

export interface RiskAnalysis {
  detected: boolean;
  confidence: number;
  reason: string;
  recommendation: string;
}

export interface PolicyViolation {
  policy: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  confidence: number;
  line?: number;
}

export interface IntentAnalysis {
  intent: string;
  confidence: number;
  description: string;
}
