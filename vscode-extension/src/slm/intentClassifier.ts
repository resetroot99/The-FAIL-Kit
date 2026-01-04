/**
 * F.A.I.L. Kit Intent Classifier
 *
 * Classifies code intent using semantic analysis.
 */

import { OnnxRunner } from './onnxRunner';
import { IntentAnalysis } from './index';

/**
 * Intent categories for code classification
 */
export const INTENT_CATEGORIES = {
  FINANCIAL: {
    id: 'financial_operation',
    name: 'Financial Operation',
    description: 'Code performs financial transactions or handles payment data',
    riskLevel: 'high',
    keywords: ['payment', 'transfer', 'charge', 'billing', 'invoice', 'stripe', 'paypal'],
  },
  DESTRUCTIVE: {
    id: 'destructive_operation',
    name: 'Destructive Operation',
    description: 'Code deletes, removes, or permanently modifies data',
    riskLevel: 'high',
    keywords: ['delete', 'remove', 'drop', 'truncate', 'destroy', 'unlink', 'rmdir'],
  },
  COMMUNICATION: {
    id: 'external_communication',
    name: 'External Communication',
    description: 'Code sends emails, SMS, or other communications',
    riskLevel: 'medium',
    keywords: ['email', 'send', 'notify', 'sms', 'message', 'notification', 'twilio', 'sendgrid'],
  },
  DATA_ACCESS: {
    id: 'data_access',
    name: 'Data Access',
    description: 'Code reads or queries sensitive data',
    riskLevel: 'medium',
    keywords: ['query', 'select', 'find', 'fetch', 'retrieve', 'lookup'],
  },
  FILE_IO: {
    id: 'file_io',
    name: 'File I/O',
    description: 'Code reads or writes files',
    riskLevel: 'medium',
    keywords: ['readFile', 'writeFile', 'fs.', 'path.', 'file', 'upload', 'download'],
  },
  AUTHENTICATION: {
    id: 'authentication',
    name: 'Authentication',
    description: 'Code handles user authentication or authorization',
    riskLevel: 'high',
    keywords: ['login', 'logout', 'auth', 'token', 'session', 'password', 'credential'],
  },
  EXTERNAL_API: {
    id: 'external_api',
    name: 'External API Call',
    description: 'Code calls external APIs or services',
    riskLevel: 'medium',
    keywords: ['fetch', 'axios', 'http', 'request', 'api', 'endpoint'],
  },
  LLM_INTERACTION: {
    id: 'llm_interaction',
    name: 'LLM Interaction',
    description: 'Code interacts with language models',
    riskLevel: 'medium',
    keywords: ['openai', 'anthropic', 'llm', 'chat', 'completion', 'prompt', 'generate'],
  },
  AGENT_ACTION: {
    id: 'agent_action',
    name: 'Agent Action',
    description: 'Code executes autonomous agent actions',
    riskLevel: 'high',
    keywords: ['agent', 'execute', 'tool', 'action', 'invoke', 'run'],
  },
};

/**
 * Intent Classifier using semantic analysis
 */
export class IntentClassifier {
  /**
   * Classify intents in code
   */
  async classifyIntents(
    code: string,
    runner: OnnxRunner
  ): Promise<IntentAnalysis[]> {
    const intents: IntentAnalysis[] = [];

    // Use runner for semantic classification if available
    if (runner) {
      const categories = Object.values(INTENT_CATEGORIES).map(c => c.id);
      const results = await runner.classify(code, categories);

      for (const result of results) {
        if (result.confidence > 0.5) {
          const category = Object.values(INTENT_CATEGORIES)
            .find(c => c.id === result.category);
          
          if (category) {
            intents.push({
              intent: category.id,
              confidence: result.confidence,
              description: category.description,
            });
          }
        }
      }
    }

    // Supplement with keyword-based classification
    const keywordIntents = this.classifyByKeywords(code);
    
    // Merge results, preferring higher confidence
    for (const kwIntent of keywordIntents) {
      const existing = intents.find(i => i.intent === kwIntent.intent);
      if (!existing) {
        intents.push(kwIntent);
      } else if (kwIntent.confidence > existing.confidence) {
        existing.confidence = (existing.confidence + kwIntent.confidence) / 2;
      }
    }

    // Sort by confidence
    intents.sort((a, b) => b.confidence - a.confidence);

    return intents;
  }

  /**
   * Classify intents based on keywords
   */
  classifyByKeywords(code: string): IntentAnalysis[] {
    const intents: IntentAnalysis[] = [];
    const codeLower = code.toLowerCase();

    for (const category of Object.values(INTENT_CATEGORIES)) {
      let matchCount = 0;
      
      for (const keyword of category.keywords) {
        if (codeLower.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(0.9, 0.4 + (matchCount * 0.15));
        intents.push({
          intent: category.id,
          confidence,
          description: category.description,
        });
      }
    }

    return intents;
  }

  /**
   * Get risk level for detected intents
   */
  getRiskLevel(intents: IntentAnalysis[]): 'low' | 'medium' | 'high' | 'critical' {
    const categories = Object.values(INTENT_CATEGORIES);
    
    let highRiskCount = 0;
    let mediumRiskCount = 0;

    for (const intent of intents) {
      const category = categories.find(c => c.id === intent.intent);
      if (category) {
        if (category.riskLevel === 'high') highRiskCount++;
        if (category.riskLevel === 'medium') mediumRiskCount++;
      }
    }

    if (highRiskCount >= 2) return 'critical';
    if (highRiskCount >= 1) return 'high';
    if (mediumRiskCount >= 2) return 'medium';
    return 'low';
  }

  /**
   * Get required policies for detected intents
   */
  getRequiredPolicies(intents: IntentAnalysis[]): string[] {
    const policies: Set<string> = new Set();

    for (const intent of intents) {
      switch (intent.intent) {
        case 'financial_operation':
          policies.add('REQUIRE_CONFIRMATION');
          policies.add('REQUIRE_AUDIT_LOG');
          policies.add('REQUIRE_RECEIPT');
          break;
        case 'destructive_operation':
          policies.add('REQUIRE_CONFIRMATION');
          policies.add('REQUIRE_BACKUP');
          policies.add('REQUIRE_AUDIT_LOG');
          break;
        case 'external_communication':
          policies.add('REQUIRE_RATE_LIMIT');
          policies.add('REQUIRE_AUDIT_LOG');
          break;
        case 'authentication':
          policies.add('NO_CREDENTIAL_LOGGING');
          policies.add('REQUIRE_MFA_CHECK');
          policies.add('REQUIRE_AUDIT_LOG');
          break;
        case 'agent_action':
          policies.add('REQUIRE_RECEIPT');
          policies.add('REQUIRE_CONFIRMATION');
          policies.add('REQUIRE_AUDIT_LOG');
          break;
        case 'llm_interaction':
          policies.add('NO_PROMPT_INJECTION');
          policies.add('REQUIRE_ERROR_HANDLING');
          policies.add('NO_PII_IN_PROMPT');
          break;
      }
    }

    return Array.from(policies);
  }
}

/**
 * Quick intent check (synchronous, pattern-based)
 */
export function quickIntentCheck(code: string): {
  hasDestructive: boolean;
  hasFinancial: boolean;
  hasAuthentication: boolean;
  hasAgentAction: boolean;
  riskLevel: 'low' | 'medium' | 'high';
} {
  const codeLower = code.toLowerCase();

  const hasDestructive = /(?:delete|remove|drop|truncate|destroy)/.test(codeLower);
  const hasFinancial = /(?:payment|charge|transfer|billing|stripe|paypal)/.test(codeLower);
  const hasAuthentication = /(?:login|auth|password|credential|token|session)/.test(codeLower);
  const hasAgentAction = /(?:agent|execute|invoke|tool\s*\.\s*\w+\s*\()/.test(codeLower);

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  
  if (hasDestructive || hasFinancial || hasAuthentication) {
    riskLevel = 'high';
  } else if (hasAgentAction) {
    riskLevel = 'medium';
  }

  return {
    hasDestructive,
    hasFinancial,
    hasAuthentication,
    hasAgentAction,
    riskLevel,
  };
}
