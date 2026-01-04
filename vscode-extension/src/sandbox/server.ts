/**
 * F.A.I.L. Kit Local Sandbox Server
 *
 * In-memory mock server for testing agent code locally.
 * Provides mock endpoints for LLM providers and payment services.
 */

import * as http from 'http';
import * as vscode from 'vscode';
import {
  getMockResponse,
  generateDynamicMock,
  MOCK_SCENARIOS,
  MockScenario,
} from './mocks';

export interface SandboxConfig {
  port: number;
  scenario: string;
  logRequests: boolean;
  delayMs: number;
}

const DEFAULT_CONFIG: SandboxConfig = {
  port: 8765,
  scenario: 'happy-path',
  logRequests: true,
  delayMs: 100,
};

/**
 * Local Sandbox Server for F.A.I.L. Kit testing
 */
export class LocalSandboxServer {
  private server: http.Server | null = null;
  private config: SandboxConfig;
  private outputChannel: vscode.OutputChannel;
  private requestLog: Array<{ timestamp: Date; method: string; path: string; status: number }> = [];

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.outputChannel = vscode.window.createOutputChannel('F.A.I.L. Kit Sandbox');
  }

  /**
   * Start the sandbox server
   */
  async start(): Promise<{ success: boolean; message: string }> {
    if (this.server) {
      return { success: false, message: 'Server already running' };
    }

    return new Promise((resolve) => {
      this.server = http.createServer(this.handleRequest.bind(this));

      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          resolve({
            success: false,
            message: `Port ${this.config.port} is already in use. Try a different port.`,
          });
        } else {
          resolve({ success: false, message: error.message });
        }
      });

      this.server.listen(this.config.port, () => {
        this.log(`🚀 F.A.I.L. Kit Sandbox started on http://localhost:${this.config.port}`);
        this.log(`📋 Scenario: ${this.config.scenario}`);
        this.log('');
        this.log('Available endpoints:');
        this.log('  POST /openai/chat/completions    - Mock OpenAI chat');
        this.log('  POST /anthropic/messages         - Mock Anthropic messages');
        this.log('  POST /stripe/payment_intents     - Mock Stripe payments');
        this.log('  POST /stripe/charges             - Mock Stripe charges');
        this.log('  POST /paypal/orders              - Mock PayPal orders');
        this.log('  POST /database/query             - Mock database queries');
        this.log('');
        this.outputChannel.show();

        resolve({
          success: true,
          message: `Sandbox running on http://localhost:${this.config.port}`,
        });
      });
    });
  }

  /**
   * Stop the sandbox server
   */
  async stop(): Promise<{ success: boolean; message: string }> {
    if (!this.server) {
      return { success: false, message: 'Server not running' };
    }

    return new Promise((resolve) => {
      this.server!.close((error) => {
        if (error) {
          resolve({ success: false, message: error.message });
        } else {
          this.server = null;
          this.log('🛑 F.A.I.L. Kit Sandbox stopped');
          resolve({ success: true, message: 'Sandbox stopped' });
        }
      });
    });
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.config };
  }

  /**
   * Update scenario
   */
  setScenario(scenario: string): void {
    const found = MOCK_SCENARIOS.find(s => s.name === scenario);
    if (found) {
      this.config.scenario = scenario;
      this.log(`📋 Switched to scenario: ${scenario} - ${found.description}`);
    }
  }

  /**
   * Get available scenarios
   */
  getScenarios(): MockScenario[] {
    return MOCK_SCENARIOS;
  }

  /**
   * Get request log
   */
  getRequestLog(): typeof this.requestLog {
    return [...this.requestLog];
  }

  /**
   * Clear request log
   */
  clearLog(): void {
    this.requestLog = [];
  }

  /**
   * Handle incoming HTTP request
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const startTime = Date.now();
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      const path = req.url || '/';
      const method = req.method || 'GET';

      // Add CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Handle preflight
      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Parse the path to determine provider
      const pathParts = path.split('/').filter(Boolean);
      const provider = pathParts[0];
      const endpoint = pathParts.slice(1).join('/');

      // Add artificial delay
      if (this.config.delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.delayMs));
      }

      // Get mock response
      let parsedBody: unknown = null;
      try {
        parsedBody = body ? JSON.parse(body) : null;
      } catch {
        // Ignore parse errors
      }

      const mockResponse = generateDynamicMock(provider, endpoint, parsedBody);

      // Apply additional delay from mock
      if (mockResponse.delay) {
        await new Promise(resolve => setTimeout(resolve, mockResponse.delay));
      }

      // Send response
      res.writeHead(mockResponse.status, mockResponse.headers);
      res.end(JSON.stringify(mockResponse.body));

      // Log request
      const duration = Date.now() - startTime;
      this.logRequest(method, path, mockResponse.status, duration);
    });
  }

  /**
   * Log a request
   */
  private logRequest(method: string, path: string, status: number, duration: number): void {
    const entry = {
      timestamp: new Date(),
      method,
      path,
      status,
    };
    this.requestLog.push(entry);

    // Keep only last 100 requests
    if (this.requestLog.length > 100) {
      this.requestLog.shift();
    }

    if (this.config.logRequests) {
      const statusIcon = status >= 200 && status < 300 ? '✓' : status >= 400 ? '✗' : '→';
      this.log(`${statusIcon} ${method} ${path} → ${status} (${duration}ms)`);
    }
  }

  /**
   * Log to output channel
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
  }
}

// Global sandbox instance
let sandboxInstance: LocalSandboxServer | null = null;

/**
 * Get or create sandbox instance
 */
export function getSandbox(): LocalSandboxServer {
  if (!sandboxInstance) {
    sandboxInstance = new LocalSandboxServer();
  }
  return sandboxInstance;
}

/**
 * Register sandbox commands
 */
export function registerSandboxCommands(context: vscode.ExtensionContext): void {
  // Start Sandbox
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.startSandbox', async () => {
      const sandbox = getSandbox();

      if (sandbox.isRunning()) {
        vscode.window.showInformationMessage('Sandbox is already running');
        return;
      }

      const result = await sandbox.start();
      if (result.success) {
        vscode.window.showInformationMessage(result.message);
      } else {
        vscode.window.showErrorMessage(result.message);
      }
    })
  );

  // Stop Sandbox
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.stopSandbox', async () => {
      const sandbox = getSandbox();

      if (!sandbox.isRunning()) {
        vscode.window.showInformationMessage('Sandbox is not running');
        return;
      }

      const result = await sandbox.stop();
      if (result.success) {
        vscode.window.showInformationMessage(result.message);
      } else {
        vscode.window.showErrorMessage(result.message);
      }
    })
  );

  // Switch Scenario
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.switchScenario', async () => {
      const sandbox = getSandbox();
      const scenarios = sandbox.getScenarios();

      const selected = await vscode.window.showQuickPick(
        scenarios.map(s => ({
          label: s.name,
          description: s.description,
        })),
        { title: 'Select Mock Scenario' }
      );

      if (selected) {
        sandbox.setScenario(selected.label);
        vscode.window.showInformationMessage(`Switched to scenario: ${selected.label}`);
      }
    })
  );

  // Show Sandbox Status
  context.subscriptions.push(
    vscode.commands.registerCommand('fail-kit.sandboxStatus', () => {
      const sandbox = getSandbox();
      const config = sandbox.getConfig();
      const log = sandbox.getRequestLog();

      if (!sandbox.isRunning()) {
        vscode.window.showInformationMessage('Sandbox is not running. Use "F.A.I.L. Kit: Start Sandbox" to start.');
        return;
      }

      const message = `Sandbox running on port ${config.port}\nScenario: ${config.scenario}\nRequests: ${log.length}`;
      vscode.window.showInformationMessage(message);
    })
  );
}
