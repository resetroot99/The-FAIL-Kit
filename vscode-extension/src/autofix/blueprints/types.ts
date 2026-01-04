/**
 * F.A.I.L. Kit Forensic Blueprint Types
 *
 * Type definitions for the blueprint template system.
 */

import { Issue } from '../../analyzer';

/**
 * Context extracted from AST analysis for template generation
 */
export interface BlueprintContext {
  // Tool/operation info
  toolName: string;
  toolCategory: 'database' | 'http' | 'email' | 'file' | 'payment' | 'agent' | 'llm' | 'generic';
  operationType: 'read' | 'write' | 'delete' | 'execute' | 'send' | 'unknown';
  isDestructive: boolean;
  
  // Code context
  variableName?: string;
  resultVariableName?: string;
  functionName?: string;
  className?: string;
  isAsync: boolean;
  
  // Indentation
  indent: string;
  innerIndent: string;
  
  // Provider info (for LLM calls)
  provider?: string;
  
  // Original code
  originalCode: string;
  line: number;
  endLine: number;
}

/**
 * Generated blueprint with code and metadata
 */
export interface Blueprint {
  id: string;
  name: string;
  description: string;
  code: string;
  insertPosition: 'before' | 'after' | 'wrap' | 'replace';
  confidence: number;
  impact: 'safe' | 'moderate' | 'risky';
  
  // Additional imports that may be needed
  requiredImports?: ImportSpec[];
  
  // Tags for categorization
  tags: string[];
}

export interface ImportSpec {
  module: string;
  named?: string[];
  default?: string;
  isType?: boolean;
}

/**
 * Blueprint generator function type
 */
export type BlueprintGenerator = (
  issue: Issue,
  context: BlueprintContext
) => Blueprint | null;

/**
 * Blueprint registry entry
 */
export interface BlueprintRegistryEntry {
  ruleId: string;
  generator: BlueprintGenerator;
  priority: number;
}
