/**
 * F.A.I.L. Kit Codebase Scanner
 * 
 * Scans a codebase to identify:
 * - API endpoints
 * - Agent functions
 * - Tool/action calls
 * - LLM invocations
 */

const fs = require('fs');
const path = require('path');

class CodebaseScanner {
  constructor(options = {}) {
    this.rootPath = options.rootPath || process.cwd();
    this.extensions = options.extensions || ['.ts', '.js', '.tsx', '.jsx', '.py'];
    this.excludeDirs = options.excludeDirs || ['node_modules', '.git', 'dist', 'build', '__pycache__'];
    
    this.results = {
      endpoints: [],
      agentFunctions: [],
      toolCalls: [],
      llmCalls: [],
      files: []
    };
  }

  /**
   * Scan the codebase
   */
  async scan() {
    console.log(`Scanning codebase at ${this.rootPath}...`);
    await this.walkDirectory(this.rootPath);
    return this.results;
  }

  /**
   * Recursively walk directory tree
   */
  async walkDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (this.excludeDirs.includes(entry.name)) {
          continue;
        }
        await this.walkDirectory(fullPath);
      } else if (entry.isFile()) {
        // Check if file has a relevant extension
        const ext = path.extname(entry.name);
        if (this.extensions.includes(ext)) {
          await this.scanFile(fullPath);
        }
      }
    }
  }

  /**
   * Scan a single file
   */
  async scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(this.rootPath, filePath);

    this.results.files.push(relativePath);

    // Scan for different patterns
    this.scanForEndpoints(content, relativePath);
    this.scanForAgentFunctions(content, relativePath);
    this.scanForToolCalls(content, relativePath);
    this.scanForLLMCalls(content, relativePath);
  }

  /**
   * Scan for API endpoints
   */
  scanForEndpoints(content, filePath) {
    // Next.js API routes: export async function POST/GET
    const nextjsPattern = /export\s+async\s+function\s+(POST|GET|PUT|DELETE|PATCH)\s*\(/g;
    let match;
    while ((match = nextjsPattern.exec(content)) !== null) {
      this.results.endpoints.push({
        type: 'nextjs',
        method: match[1],
        file: filePath,
        line: this.getLineNumber(content, match.index)
      });
    }

    // Express routes: app.post/get/put/delete
    const expressPattern = /app\.(post|get|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((match = expressPattern.exec(content)) !== null) {
      this.results.endpoints.push({
        type: 'express',
        method: match[1].toUpperCase(),
        path: match[2],
        file: filePath,
        line: this.getLineNumber(content, match.index)
      });
    }

    // FastAPI routes: @app.post/get/put/delete
    const fastapiPattern = /@app\.(post|get|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((match = fastapiPattern.exec(content)) !== null) {
      this.results.endpoints.push({
        type: 'fastapi',
        method: match[1].toUpperCase(),
        path: match[2],
        file: filePath,
        line: this.getLineNumber(content, match.index)
      });
    }
  }

  /**
   * Scan for agent functions
   */
  scanForAgentFunctions(content, filePath) {
    // Look for functions with "agent", "query", "process", "generate" in the name
    const patterns = [
      /async\s+function\s+(\w+(?:agent|query|process|generate|estimate)\w*)\s*\(/gi,
      /const\s+(\w+(?:agent|query|process|generate|estimate)\w*)\s*=\s*async/gi,
      /function\s+(\w+(?:agent|query|process|generate|estimate)\w*)\s*\(/gi,
      /def\s+(\w+(?:agent|query|process|generate|estimate)\w*)\s*\(/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1].trim();
        // Skip if the function name is too long (likely a comment or docstring match)
        if (functionName.length > 50) continue;
        // Skip if it contains special characters (except underscore)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) continue;
        
        this.results.agentFunctions.push({
          name: functionName,
          file: filePat  /**
   * Scan for tool/action calls
   */
  scanForToolCalls(content, filePath) {
    const toolPatterns = [
      { pattern: /await\s+db\.(query|execute|insert|update|delete)/g, tool: 'database' },
      { pattern: /await\s+prisma\.(create|update|delete|findMany)/g, tool: 'database' },
      { pattern: /await\s+fetch\s*\(/g, tool: 'http_request' },
      { pattern: /await\s+axios\.(get|post|put|delete)/g, tool: 'http_request' },
      { pattern: /await\s+sendEmail\s*\(/g, tool: 'email' },
      { pattern: /await\s+.*\.sendMessage\s*\(/g, tool: 'messaging' },
      { pattern: /await\s+fs\.(writeFile|readFile|unlink)/g, tool: 'file_system' },
      { pattern: /await\s+.*\.upload\s*\(/g, tool: 'file_upload' }
    ];

    toolPatterns.forEach(({ pattern, tool }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        this.results.toolCalls.push({
          tool,
          file: filePath,
          line: this.getLineNumber(content, match.index)
        });
      }
    });

    // NEW: Extended Rule Detection (FK010-FK040)
    this.scanForExtendedRules(content, filePath);
  }

  /**
   * Scan for extended rules (FK010-FK040)
   */
  scanForExtendedRules(content, filePath) {
    if (!this.results.violations) this.results.violations = [];

    const extendedPatterns = [
      // FK010: Phantom Completion
      { 
        id: 'FK010', 
        pattern: /I have (sent|updated|deleted|created|transferred|executed)/gi,
        description: 'Potential phantom completion claim'
      },
      // FK014: Hallucinated Tool
      { 
        id: 'FK014', 
        pattern: /I used the (\w+) tool/gi,
        description: 'Explicit tool usage claim'
      },
      // FK025: Confidence Without Evidence
      { 
        id: 'FK025', 
        pattern: /\b(definitely|certainly|guaranteed|absolutely)\b/gi,
        description: 'High-confidence language'
      },
      // FK019: Retrieval Gap
      { 
        id: 'FK019', 
        pattern: /retrieved|source|document/gi,
        description: 'Retrieval reference'
      },
      // FK039: Silent Failure Cascade
      { 
        id: 'FK039', 
        pattern: /task completed successfully|all steps finished/gi,
        description: 'Overall success claim'
      }
    ];

    extendedPatterns.forEach(({ id, pattern, description }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        this.results.violations.push({
          id,
          description,
          file: filePath,
          line: this.getLineNumber(content, match.index),
          context: match[0]
        });
      }
    });
  }
   * Scan for LLM calls
   */
  scanForLLMCalls(content, filePath) {
    const llmPatterns = [
      { pattern: /await\s+openai\.chat\.completions\.create/g, provider: 'openai' },
      { pattern: /await\s+anthropic\.messages\.create/g, provider: 'anthropic' },
      { pattern: /await\s+.*\.generateText/g, provider: 'generic' },
      { pattern: /await\s+.*\.chat/g, provider: 'generic' }
    ];

    llmPatterns.forEach(({ pattern, provider }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        this.results.llmCalls.push({
          provider,
          file: filePath,
          line: this.getLineNumber(content, match.index)
        });
      }
    });
  }

  /**
   * Get line number from character index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Print scan results
   */
  printResults() {
    console.log('\nScan Results:');
    console.log(`✓ Found ${this.results.endpoints.length} API endpoints`);
    console.log(`✓ Found ${this.results.agentFunctions.length} agent functions`);
    console.log(`✓ Found ${this.results.toolCalls.length} tool calls`);
    console.log(`✓ Found ${this.results.llmCalls.length} LLM invocations`);
    console.log(`✓ Scanned ${this.results.files.length} files`);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    // Count tool calls by category
    const toolCallsByCategory = {};
    for (const tc of this.results.toolCalls) {
      toolCallsByCategory[tc.tool] = (toolCallsByCategory[tc.tool] || 0) + 1;
    }

    return {
      files: this.results.files.length,
      endpoints: this.results.endpoints.length,
      agentFunctions: this.results.agentFunctions.length,
      toolCalls: this.results.toolCalls.length,
      toolCallsByCategory,
      llmInvocations: this.results.llmCalls.length
    };
  }

  /**
   * Convert results to format expected by generator
   */
  toGeneratorFormat() {
    return {
      scannedFiles: this.results.files.length,
      endpoints: this.results.endpoints.map(e => ({
        framework: e.type,
        method: e.method,
        path: e.path || e.file,
        file: e.file
      })),
      agentFunctions: this.results.agentFunctions.map(f => ({
        name: f.name,
        file: f.file
      })),
      toolCalls: this.getSummary().toolCallsByCategory,
      llmInvocations: this.results.llmCalls.length
    };
  }
}

/**
 * Helper function to scan codebase (sync wrapper)
 */
async function scanCodebase(targetPath) {
  const scanner = new CodebaseScanner({ rootPath: targetPath });
  await scanner.scan();
  return scanner.toGeneratorFormat();
}

/**
 * Helper function to get scan summary
 */
function getScanSummary(results) {
  const totalToolCalls = Object.values(results.toolCalls || {}).reduce((a, b) => a + b, 0);
  
  return {
    files: results.scannedFiles,
    endpoints: results.endpoints?.length || 0,
    agentFunctions: results.agentFunctions?.length || 0,
    toolCalls: totalToolCalls,
    toolCallsByCategory: results.toolCalls || {},
    llmInvocations: results.llmInvocations || 0
  };
}

module.exports = { 
  CodebaseScanner,
  scanCodebase,
  getScanSummary
};
