/**
 * Python LSP Client
 *
 * Connects to the F.A.I.L. Kit Python Language Server for
 * analyzing LangChain, CrewAI, and AutoGen Python code.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

export interface PythonLSPClientOptions {
  pythonPath?: string;
  lspServerPath?: string;
  logLevel?: 'debug' | 'info' | 'warning' | 'error';
}

export class PythonLSPClient {
  private serverProcess: ChildProcess | null = null;
  private outputChannel: vscode.OutputChannel;
  private isRunning: boolean = false;
  private options: PythonLSPClientOptions;

  constructor(options: PythonLSPClientOptions = {}) {
    this.options = options;
    this.outputChannel = vscode.window.createOutputChannel('F.A.I.L. Kit Python LSP');
  }

  async start(): Promise<boolean> {
    if (this.isRunning) {
      this.outputChannel.appendLine('Python LSP server already running');
      return true;
    }

    try {
      const pythonPath = await this.getPythonPath();
      if (!pythonPath) {
        this.outputChannel.appendLine('Python interpreter not found');
        vscode.window.showErrorMessage(
          'F.A.I.L. Kit: Python interpreter not found. Please configure Python path.'
        );
        return false;
      }

      // Check if failkit-lsp is installed
      const isInstalled = await this.checkLSPInstalled(pythonPath);
      if (!isInstalled) {
        const install = await vscode.window.showWarningMessage(
          'F.A.I.L. Kit Python LSP is not installed. Install it now?',
          'Install',
          'Cancel'
        );
        if (install === 'Install') {
          await this.installLSP(pythonPath);
        } else {
          return false;
        }
      }

      // Start the LSP server
      this.serverProcess = spawn(pythonPath, ['-m', 'failkit_lsp', '--stdio'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.serverProcess.stdout?.on('data', (data) => {
        this.outputChannel.appendLine(`[stdout] ${data.toString()}`);
      });

      this.serverProcess.stderr?.on('data', (data) => {
        this.outputChannel.appendLine(`[stderr] ${data.toString()}`);
      });

      this.serverProcess.on('error', (error) => {
        this.outputChannel.appendLine(`[error] ${error.message}`);
        this.isRunning = false;
      });

      this.serverProcess.on('exit', (code) => {
        this.outputChannel.appendLine(`[exit] Server exited with code ${code}`);
        this.isRunning = false;
      });

      this.isRunning = true;
      this.outputChannel.appendLine('Python LSP server started');
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error starting LSP server: ${error}`);
      return false;
    }
  }

  async stop(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
      this.isRunning = false;
      this.outputChannel.appendLine('Python LSP server stopped');
    }
  }

  async restart(): Promise<boolean> {
    await this.stop();
    return this.start();
  }

  private async getPythonPath(): Promise<string | null> {
    // Check user-configured path
    if (this.options.pythonPath) {
      return this.options.pythonPath;
    }

    // Check VS Code Python extension configuration
    const pythonConfig = vscode.workspace.getConfiguration('python');
    const pythonPath = pythonConfig.get<string>('defaultInterpreterPath');
    if (pythonPath) {
      return pythonPath;
    }

    // Check F.A.I.L. Kit configuration
    const failkitConfig = vscode.workspace.getConfiguration('failKit');
    const configuredPath = failkitConfig.get<string>('pythonLsp.pythonPath');
    if (configuredPath) {
      return configuredPath;
    }

    // Try common Python paths
    const commonPaths = ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'];
    for (const p of commonPaths) {
      try {
        const { execSync } = require('child_process');
        execSync(`${p} --version`, { stdio: 'ignore' });
        return p;
      } catch {
        continue;
      }
    }

    return null;
  }

  private async checkLSPInstalled(pythonPath: string): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      execSync(`${pythonPath} -c "import failkit_lsp"`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async installLSP(pythonPath: string): Promise<void> {
    const terminal = vscode.window.createTerminal('F.A.I.L. Kit Install');
    terminal.show();

    // Try to install from local middleware path first
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      const localPath = path.join(
        workspaceFolders[0].uri.fsPath,
        'middleware',
        'python-lsp'
      );
      terminal.sendText(`${pythonPath} -m pip install -e "${localPath}"`);
    } else {
      // Install from PyPI (when published)
      terminal.sendText(`${pythonPath} -m pip install failkit-lsp`);
    }

    vscode.window.showInformationMessage(
      'Installing F.A.I.L. Kit Python LSP. Please restart VS Code after installation.'
    );
  }

  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  dispose(): void {
    this.stop();
    this.outputChannel.dispose();
  }
}

/**
 * Creates and configures the Python LSP client based on workspace settings.
 */
export function createPythonLSPClient(): PythonLSPClient {
  const config = vscode.workspace.getConfiguration('failKit');
  
  return new PythonLSPClient({
    pythonPath: config.get<string>('pythonLsp.pythonPath'),
    logLevel: config.get<'debug' | 'info' | 'warning' | 'error'>('pythonLsp.logLevel', 'info'),
  });
}
