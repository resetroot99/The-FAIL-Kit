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
      /async\s+function\s+(.*(?:agent|query|process|generate|estimate)[^(]*)\s*\(/gi,
      /const\s+(.*(?:agent|query|process|generate|estimate)[^=]*)\s*=\s*async/gi,
      /async\s+(.*(?:agent|query|process|generate|estimate)[^(]*)\s*\(/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1].trim();
        this.results.agentFunctions.push({
          name: functionName,
          file: filePath,
          line: this.getLineNumber(content, match.index)
        });
      }
    });
  }

  /**
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
  }

  /**
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
}

module.exports = { CodebaseScanner };
