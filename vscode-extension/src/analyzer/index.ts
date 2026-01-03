/**
 * F.A.I.L. Kit Analyzer
 *
 * Main analyzer module that orchestrates AST analysis,
 * pattern matching, and receipt validation.
 */

export * from './patterns';
export * from './astAnalyzer';
export * from './receiptValidator';

import { analyzeDocument, AnalysisResult, Issue, quickAnalyze } from './astAnalyzer';
import { findReceiptPattern, analyzeReceiptGeneration } from './receiptValidator';
import { isTestFile } from './patterns';

export interface AnalyzerOptions {
  skipTestFiles?: boolean;
  maxIssues?: number;
  enableQuickCheck?: boolean;
}

/**
 * Main analyzer class for use in the VS Code extension
 */
export class FailKitAnalyzer {
  private options: AnalyzerOptions;
  private cache: Map<string, { hash: number; result: AnalysisResult }> = new Map();

  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      skipTestFiles: true,
      maxIssues: 100,
      enableQuickCheck: true,
      ...options,
    };
  }

  /**
   * Analyze a document and return issues
   */
  analyze(code: string, filePath: string = 'temp.ts'): AnalysisResult {
    // Skip test files if configured
    if (this.options.skipTestFiles && isTestFile(filePath)) {
      return { issues: [], toolCalls: [], llmCalls: [], agentCalls: [] };
    }

    // Check cache
    const hash = this.hashCode(code);
    const cached = this.cache.get(filePath);
    if (cached && cached.hash === hash) {
      return cached.result;
    }

    // Quick check first
    if (this.options.enableQuickCheck) {
      const quick = quickAnalyze(code);
      if (!quick.hasAgentCode) {
        const emptyResult: AnalysisResult = {
          issues: [],
          toolCalls: [],
          llmCalls: [],
          agentCalls: [],
        };
        this.cache.set(filePath, { hash, result: emptyResult });
        return emptyResult;
      }
    }

    // Full analysis
    const result = analyzeDocument(code, filePath);

    // Limit issues if configured
    if (this.options.maxIssues && result.issues.length > this.options.maxIssues) {
      result.issues = result.issues.slice(0, this.options.maxIssues);
    }

    // Cache result
    this.cache.set(filePath, { hash, result });

    return result;
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific file
   */
  clearCacheForFile(filePath: string): void {
    this.cache.delete(filePath);
  }

  /**
   * Simple hash function for caching
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
}

/**
 * Rule definitions for the extension
 */
export const RULES = {
  FK001: {
    id: 'FK001',
    name: 'missing-receipt',
    description: 'Tool call without receipt generation',
    severity: 'warning' as const,
    category: 'audit',
  },
  FK002: {
    id: 'FK002',
    name: 'missing-error-handling',
    description: 'LLM call without error handling',
    severity: 'warning' as const,
    category: 'reliability',
  },
  FK003: {
    id: 'FK003',
    name: 'external-api-no-logging',
    description: 'External API call without logging',
    severity: 'info' as const,
    category: 'observability',
  },
  FK004: {
    id: 'FK004',
    name: 'db-mutation-no-transaction',
    description: 'Database mutation without transaction',
    severity: 'info' as const,
    category: 'data-integrity',
  },
};

export type RuleId = keyof typeof RULES;
