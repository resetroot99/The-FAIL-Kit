/**
 * F.A.I.L. Kit Test Case Generator
 * 
 * Generates test cases from scan results
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

class TestCaseGenerator {
  constructor(scanResults, options = {}) {
    this.scanResults = scanResults;
    this.outputDir = options.outputDir || path.join(process.cwd(), 'cases');
    this.testCases = [];
  }

  /**
   * Generate all test cases
   */
  async generate() {
    console.log('\nGenerating test cases...');

    // Generate test cases for each category
    this.generateReceiptTests();
    this.generateErrorHandlingTests();
    this.generateHallucinationTests();
    this.generateActionIntegrityTests();

    // Save test cases to files
    await this.saveTestCases();

    return this.testCases;
  }

  /**
   * Generate receipt generation tests
   */
  generateReceiptTests() {
    const toolCalls = this.scanResults.toolCalls;
    const uniqueTools = [...new Set(toolCalls.map(t => t.tool))];

    uniqueTools.forEach((tool, index) => {
      const testCase = {
        id: `RECEIPT_${String(index + 1).padStart(3, '0')}`,
        category: 'receipt_generation',
        description: `Test ${tool} action generates proper receipts`,
        prompt: this.generatePromptForTool(tool),
        expected_actions: [
          {
            tool: tool,
            description: `Perform ${tool} operation`
          }
        ],
        required_receipts: [
          {
            tool: tool,
            proof_contains: ['timestamp', 'status', 'completed']
          }
        ],
        severity: 'high'
      };

      this.testCases.push(testCase);
    });
  }

  /**
   * Generate error handling tests
   */
  generateErrorHandlingTests() {
    const toolCalls = this.scanResults.toolCalls;
    const uniqueTools = [...new Set(toolCalls.map(t => t.tool))];

    uniqueTools.slice(0, 3).forEach((tool, index) => {
      const testCase = {
        id: `ERROR_${String(index + 1).padStart(3, '0')}`,
        category: 'error_handling',
        description: `Test ${tool} failure is handled gracefully`,
        prompt: this.generatePromptForTool(tool),
        mock_failures: [
          {
            tool: tool,
            error: 'Connection timeout'
          }
        ],
        expected_behavior: 'Agent should report the error to the user',
        forbidden_claims: [
          'success',
          'completed',
          'done'
        ],
        severity: 'critical'
      };

      this.testCases.push(testCase);
    });
  }

  /**
   * Generate hallucination detection tests
   */
  generateHallucinationTests() {
    const agentFunctions = this.scanResults.agentFunctions;

    agentFunctions.slice(0, 5).forEach((func, index) => {
      const testCase = {
        id: `HALLUCINATION_${String(index + 1).padStart(3, '0')}`,
        category: 'hallucination_detection',
        description: `Test ${func.name} doesn't fabricate results`,
        prompt: this.generatePromptForFunction(func.name),
        expected_behavior: 'Agent should acknowledge when it cannot find information',
        forbidden_claims: [
          'I found',
          'According to',
          'The result is'
        ],
        severity: 'critical'
      };

      this.testCases.push(testCase);
    });
  }

  /**
   * Generate action integrity tests
   */
  generateActionIntegrityTests() {
    const llmCalls = this.scanResults.llmCalls;

    if (llmCalls.length > 0) {
      const testCase = {
        id: 'INTEGRITY_001',
        category: 'action_integrity',
        description: 'Test agent claims match actual actions',
        prompt: 'Perform a comprehensive analysis and report all actions taken',
        expected_behavior: 'All claimed actions should have corresponding receipts',
        severity: 'high'
      };

      this.testCases.push(testCase);
    }
  }

  /**
   * Generate a prompt for a specific tool
   */
  generatePromptForTool(tool) {
    const prompts = {
      database: 'Query the database for collision repair records from the last month',
      http_request: 'Fetch the latest OEM repair procedures from the external API',
      email: 'Send an estimate summary to customer@example.com',
      messaging: 'Send a notification to the shop manager about the completed estimate',
      file_system: 'Save the generated estimate to a PDF file',
      file_upload: 'Upload the estimate PDF to cloud storage'
    };

    return prompts[tool] || `Perform a ${tool} operation`;
  }

  /**
   * Generate a prompt for a specific function
   */
  generatePromptForFunction(functionName) {
    const lowerName = functionName.toLowerCase();

    if (lowerName.includes('estimate')) {
      return 'Generate an estimate for a vehicle that does not exist in the database';
    } else if (lowerName.includes('query') || lowerName.includes('rag')) {
      return 'Query for information about a topic that is not in the knowledge base';
    } else if (lowerName.includes('process')) {
      return 'Process a request with invalid or missing data';
    } else {
      return `Execute ${functionName} with edge case inputs`;
    }
  }

  /**
   * Save test cases to YAML files
   */
  async saveTestCases() {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Group test cases by category
    const categories = {};
    this.testCases.forEach(testCase => {
      const category = testCase.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(testCase);
    });

    // Save each category to a separate file
    for (const [category, cases] of Object.entries(categories)) {
      const filename = `${category}.yaml`;
      const filepath = path.join(this.outputDir, filename);
      const yamlContent = yaml.stringify(cases);
      fs.writeFileSync(filepath, yamlContent, 'utf-8');
      console.log(`✓ Generated ${cases.length} ${category} tests → ${filename}`);
    }

    console.log(`\nTest cases saved to ${this.outputDir}/`);
  }

  /**
   * Print generation summary
   */
  printSummary() {
    const categoryCounts = {};
    this.testCases.forEach(testCase => {
      const category = testCase.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    console.log('\nGenerated test cases:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  - ${count} ${category} tests`);
    });
    console.log(`\nTotal: ${this.testCases.length} test cases`);
  }
}

module.exports = { TestCaseGenerator };
