/**
 * F.A.I.L. Kit Diagnostics Provider
 *
 * Provides real-time diagnostics for agent code issues.
 * Uses debouncing for performance and caching for efficiency.
 */

import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { FailKitAnalyzer, Issue, AnalysisResult, RULES } from './analyzer';
import { debounce, reportError, debugLog } from './utils';

const VALID_SEVERITIES = ['error', 'warning', 'info', 'hint'] as const;
type Severity = typeof VALID_SEVERITIES[number];

export const DIAGNOSTIC_SOURCE = 'fail-kit';

/**
 * Map severity string to VS Code DiagnosticSeverity
 */
function mapSeverity(severity: string): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'error':
      return vscode.DiagnosticSeverity.Error;
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'info':
      return vscode.DiagnosticSeverity.Information;
    case 'hint':
      return vscode.DiagnosticSeverity.Hint;
    default:
      return vscode.DiagnosticSeverity.Warning;
  }
}

/**
 * Convert an Issue to a VS Code Diagnostic
 */
function issueToDiagnostic(issue: Issue): vscode.Diagnostic {
  const range = new vscode.Range(
    new vscode.Position(issue.line, issue.column),
    new vscode.Position(issue.endLine, issue.endColumn)
  );

  const diagnostic = new vscode.Diagnostic(
    range,
    issue.message,
    mapSeverity(issue.severity)
  );

  diagnostic.source = DIAGNOSTIC_SOURCE;
  
  // Add documentation link to the diagnostic code
  diagnostic.code = {
    value: issue.ruleId,
    target: vscode.Uri.parse(issue.docLink || `https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/rules/${issue.ruleId}.md`),
  };

  // Add related information with suggestion and business impact
  const relatedInfo: vscode.DiagnosticRelatedInformation[] = [];
  
  if (issue.suggestion) {
    relatedInfo.push(
      new vscode.DiagnosticRelatedInformation(
        new vscode.Location(vscode.Uri.parse(''), range),
        `Fix: ${issue.suggestion}`
      )
    );
  }
  
  if (issue.businessImpact) {
    relatedInfo.push(
      new vscode.DiagnosticRelatedInformation(
        new vscode.Location(vscode.Uri.parse(''), range),
        `Impact: ${issue.businessImpact}`
      )
    );
  }
  
  if (relatedInfo.length > 0) {
    diagnostic.relatedInformation = relatedInfo;
  }

  return diagnostic;
}

/**
 * Diagnostics provider for F.A.I.L. Kit
 */
export class FailKitDiagnosticsProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private analyzer: FailKitAnalyzer;
  private disposables: vscode.Disposable[] = [];
  private debouncedAnalyze: ReturnType<typeof debounce>;
  private resultsCache: Map<string, AnalysisResult> = new Map();

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
    this.analyzer = new FailKitAnalyzer({
      skipTestFiles: true,
      maxIssues: 100,
      enableQuickCheck: true,
    });

    // Validate configuration on initialization
    this.validateConfiguration();

    // Create debounced analysis function (500ms delay)
    // Check if document is still open to prevent race conditions
    this.debouncedAnalyze = debounce((document: vscode.TextDocument) => {
      if (vscode.workspace.textDocuments.some(doc => doc.uri.toString() === document.uri.toString())) {
        this.analyzeDocument(document);
      }
    }, 500);

    // Subscribe to document events
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => this.onDocumentOpen(doc)),
      vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChange(e)),
      vscode.workspace.onDidCloseTextDocument((doc) => this.onDocumentClose(doc)),
      vscode.workspace.onDidChangeConfiguration((e) => this.onConfigChange(e))
    );

    // Analyze all open documents on startup
    vscode.workspace.textDocuments.forEach((doc) => this.onDocumentOpen(doc));
  }

  /**
   * Handle document open event
   */
  private onDocumentOpen(document: vscode.TextDocument): void {
    if (this.shouldAnalyze(document)) {
      this.analyzeDocument(document);
    }
  }

  /**
   * Handle document change event
   */
  private onDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    if (this.shouldAnalyze(event.document)) {
      // Use debounced analysis for real-time typing
      this.debouncedAnalyze(event.document);
    }
  }

  /**
   * Handle document close event
   */
  private onDocumentClose(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
    this.analyzer.clearCacheForFile(document.uri.fsPath);
  }

  /**
   * Handle configuration change
   */
  private onConfigChange(event: vscode.ConfigurationChangeEvent): void {
    if (event.affectsConfiguration('fail-kit')) {
      // Validate configuration
      this.validateConfiguration();
      
      // Re-analyze all open documents with new settings
      this.analyzer.clearCache();
      vscode.workspace.textDocuments.forEach((doc) => {
        if (this.shouldAnalyze(doc)) {
          this.analyzeDocument(doc);
        }
      });
    }
  }

  /**
   * Validate configuration settings
   */
  private validateConfiguration(): void {
    const config = vscode.workspace.getConfiguration('fail-kit');
    const excludePatterns = config.get<string[]>('excludePatterns', []);
    const invalidPatterns: string[] = [];

    for (const pattern of excludePatterns) {
      try {
        // Test if pattern is valid by using minimatch
        minimatch('test', pattern, { dot: true });
      } catch (error) {
        invalidPatterns.push(pattern);
        debugLog(`Invalid exclude pattern: ${pattern}`, error);
      }
    }

    if (invalidPatterns.length > 0) {
      vscode.window.showWarningMessage(
        `F.A.I.L. Kit: Invalid exclude patterns detected: ${invalidPatterns.join(', ')}. Please check your settings.`,
        'Open Settings'
      ).then(choice => {
        if (choice === 'Open Settings') {
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            '@ext:AliJakvani.fail-kit-vscode excludePatterns'
          );
        }
      });
    }

    // Validate severity settings
    const severitySettings = [
      'severity.missingReceipt',
      'severity.missingErrorHandling',
    ];

    for (const setting of severitySettings) {
      const value = config.get<string>(setting);
      if (value && !VALID_SEVERITIES.includes(value as Severity)) {
        vscode.window.showWarningMessage(
          `F.A.I.L. Kit: Invalid severity value for ${setting}: ${value}. Must be one of: ${VALID_SEVERITIES.join(', ')}`
        );
      }
    }

    // Validate auto-fix confidence
    const minConfidence = config.get<number>('autoFix.minConfidence', 90);
    if (minConfidence < 0 || minConfidence > 100) {
      vscode.window.showWarningMessage(
        `F.A.I.L. Kit: autoFix.minConfidence must be between 0 and 100, got ${minConfidence}`
      );
    }
  }

  /**
   * Check if a document should be analyzed
   */
  private shouldAnalyze(document: vscode.TextDocument): boolean {
    // Check language
    const supportedLanguages = [
      'typescript',
      'javascript',
      'typescriptreact',
      'javascriptreact',
    ];
    if (!supportedLanguages.includes(document.languageId)) {
      return false;
    }

    // Check if real-time analysis is enabled
    const config = vscode.workspace.getConfiguration('fail-kit');
    if (!config.get<boolean>('enableRealTimeAnalysis', true)) {
      return false;
    }

    // Check exclude patterns
    const excludePatterns = config.get<string[]>('excludePatterns', []);
    const filePath = document.uri.fsPath;
    for (const pattern of excludePatterns) {
      if (this.matchesPattern(filePath, pattern)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Glob pattern matching using minimatch
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    return minimatch(filePath, pattern, { dot: true });
  }

  /**
   * Validate and return a severity value, or default if invalid
   */
  private validateSeverity(value: string | undefined, defaultValue: Severity): Severity {
    if (value && VALID_SEVERITIES.includes(value as Severity)) {
      return value as Severity;
    }
    return defaultValue;
  }

  /**
   * Analyze a document and update diagnostics
   */
  private analyzeDocument(document: vscode.TextDocument): void {
    const code = document.getText();
    const filePath = document.uri.fsPath;

    debugLog(`Analyzing document: ${filePath}`, {
      lines: code.split('\n').length,
      size: code.length,
    });

    try {
      const result = this.analyzer.analyze(code, filePath);

      // Store result in cache
      this.resultsCache.set(filePath, result);

      // Apply severity overrides from configuration with validation
      const config = vscode.workspace.getConfiguration('fail-kit');
      const diagnostics = result.issues.map((issue) => {
        // Check for severity override with validation
        switch (issue.ruleId) {
          case 'FK001':
            issue.severity = this.validateSeverity(
              config.get<string>('severity.missingReceipt'),
              issue.severity as Severity
            );
            break;
          case 'FK002':
            issue.severity = this.validateSeverity(
              config.get<string>('severity.missingErrorHandling'),
              issue.severity as Severity
            );
            break;
          case 'FK003':
          case 'FK007':
            issue.severity = this.validateSeverity(
              config.get<string>('severity.secretExposure'),
              issue.severity as Severity
            );
            break;
          case 'FK004':
            issue.severity = this.validateSeverity(
              config.get<string>('severity.sideEffect'),
              issue.severity as Severity
            );
            break;
          case 'FK005':
            issue.severity = this.validateSeverity(
              config.get<string>('severity.llmResilience'),
              issue.severity as Severity
            );
            break;
          case 'FK006':
            issue.severity = this.validateSeverity(
              config.get<string>('severity.missingProvenance'),
              issue.severity as Severity
            );
            break;
        }

        return issueToDiagnostic(issue);
      });

      this.diagnosticCollection.set(document.uri, diagnostics);
      
      debugLog(`Analysis complete for ${filePath}`, {
        issues: diagnostics.length,
        toolCalls: result.toolCalls.length,
        llmCalls: result.llmCalls.length,
      });
    } catch (error) {
      // Report error with telemetry (if enabled)
      const err = error instanceof Error ? error : new Error(String(error));
      reportError(err, {
        action: 'analyzeDocument',
        fileType: document.languageId,
        codeLength: code.length,
      });
      
      debugLog(`Error analyzing ${filePath}`, err);
      
      // Clear diagnostics on error to avoid stale data
      this.diagnosticCollection.set(document.uri, []);
      this.resultsCache.delete(filePath);
    }
  }

  /**
   * Manually trigger analysis for a document
   */
  public triggerAnalysis(document: vscode.TextDocument): void {
    if (this.shouldAnalyze(document)) {
      this.analyzeDocument(document);
    }
  }

  /**
   * Analyze the entire workspace with progress indicator
   */
  public async analyzeWorkspace(): Promise<{ filesAnalyzed: number; issuesFound: number }> {
    const files = await vscode.workspace.findFiles(
      '**/*.{ts,js,tsx,jsx}',
      '**/node_modules/**'
    );

    let filesAnalyzed = 0;
    let issuesFound = 0;

    // Create progress status bar item
    const progressStatusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );

    try {
      for (const file of files) {
        try {
          const document = await vscode.workspace.openTextDocument(file);
          if (this.shouldAnalyze(document)) {
            // Update progress
            filesAnalyzed++;
            progressStatusBar.text = `$(sync~spin) Analyzing ${filesAnalyzed}/${files.length}`;
            progressStatusBar.show();

            this.analyzeDocument(document);
            const fileIssues = this.diagnosticCollection.get(document.uri)?.length || 0;
            issuesFound += fileIssues;

            debugLog(`Analyzed ${file.fsPath}`, {
              issues: fileIssues,
              progress: `${filesAnalyzed}/${files.length}`,
            });
          }
        } catch (error) {
          // Skip files that can't be opened
          debugLog(`Could not analyze ${file.fsPath}`, error);
          console.warn(`Could not analyze ${file.fsPath}:`, error);
        }
      }
    } finally {
      // Hide progress indicator
      progressStatusBar.hide();
      progressStatusBar.dispose();
    }

    return { filesAnalyzed, issuesFound };
  }

  /**
   * Get diagnostics for a document
   */
  public getDiagnostics(uri: vscode.Uri): vscode.Diagnostic[] {
    return [...(this.diagnosticCollection.get(uri) || [])];
  }

  /**
   * Get all analysis results from cache
   */
  public getAllResults(): Map<string, AnalysisResult> {
    return new Map(this.resultsCache);
  }

  /**
   * Get analysis result for a specific file
   */
  public getResult(filePath: string): AnalysisResult | undefined {
    return this.resultsCache.get(filePath);
  }

  /**
   * Clear all cached results
   */
  public clearAllResults(): void {
    this.resultsCache.clear();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.debouncedAnalyze.cancel();
    this.diagnosticCollection.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.resultsCache.clear();
  }
}
