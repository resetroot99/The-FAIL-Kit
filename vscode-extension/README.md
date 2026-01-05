# F.A.I.L. Kit for VS Code

> **ℹ️ Repository Note:** This is the primary source for the F.A.I.L. Kit VSCode extension. Changes here are automatically synced to the standalone [vscode-fail](https://github.com/resetroot99/vscode-fail) repository.

**Forensic Audit of Intelligent Logic** - The complete agent code audit toolkit for VS Code.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/AliJakvani.fail-kit-vscode?color=blue&label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=AliJakvani.fail-kit-vscode)
[![npm](https://img.shields.io/npm/v/@fail-kit/core?color=red&label=npm)](https://www.npmjs.com/package/@fail-kit/core)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/resetroot99/The-FAIL-Kit/blob/main/LICENSE.txt)

---

Catch execution integrity failures before they reach production. F.A.I.L. Kit analyzes your AI agent code as you type, detecting missing receipts, error handling gaps, and audit trail issues.

## Features

- **Professional Dashboard** - Light-themed audit report with ship decisions
- **Auto-Fix System** - One-click fixes for common issues
- **Regression Detection** - Compare against baseline to track progress
- **Severity Classification** - Critical, High, Medium, Low with business impact
- **Export Reports** - Generate markdown reports for documentation

### Real-Time Analysis
Analyzes your code as you type, highlighting issues inline with actionable suggestions.

### Execution Integrity Checks
- **Missing Receipt Detection** (FK001): Warns when tool calls lack audit receipts
- **Missing Error Handling** (FK002): Warns when LLM calls lack try/catch blocks
- **Silent Failure Detection**: Catches agents that claim success when tools fail
- **Audit Trail Gaps**: Identifies operations without proper logging

### Professional Dashboard
Click "F.A.I.L. Kit: Open Dashboard" to see:
- Ship Decision (BLOCK / NEEDS_REVIEW / SHIP)
- Severity breakdown (Critical, High, Medium, Low)
- Root cause analysis
- Pass rate metrics
- Issue timeline

### Auto-Fix System
- Receipt generation for tool calls
- Try-catch wrappers for LLM calls
- Error escalation patterns
- Works with high confidence (90%+)

### Regression Detection
- Set baseline at any point
- Compare current issues against baseline
- Track improvements over time
- CI/CD friendly reports

### Multi-Framework Support
- LangChain (Python & JavaScript)
- OpenAI Assistants API
- Anthropic Claude
- CrewAI
- AutoGPT
- Custom agent implementations

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "F.A.I.L. Kit"
4. Click Install

### From Source

```bash
git clone https://github.com/resetroot99/vscode-fail.git
cd vscode-fail
npm install
npm run compile
```

Then press `F5` in VS Code to launch the Extension Development Host.

## Quick Start

1. Install the extension
2. Open any TypeScript/JavaScript file with AI agent code
3. F.A.I.L. Kit will automatically analyze your code
4. Click the lightbulb icon (or press `Cmd+.`) to see quick fixes
5. Open Command Palette and run "F.A.I.L. Kit: Open Dashboard"

## Commands

| Command | Description |
|---------|-------------|
| `F.A.I.L. Kit: Analyze Current File` | Trigger analysis on current file |
| `F.A.I.L. Kit: Analyze Workspace` | Analyze all files in workspace |
| `F.A.I.L. Kit: Open Dashboard` | Open the audit dashboard |
| `F.A.I.L. Kit: Set Baseline` | Save current state as baseline |
| `F.A.I.L. Kit: Compare to Baseline` | Compare against saved baseline |
| `F.A.I.L. Kit: Auto-Fix All Issues` | Apply auto-fixes to current file |
| `F.A.I.L. Kit: Export Report` | Export markdown report |

## Detection Rules

| Rule ID | Description | Severity |
|---------|-------------|----------|
| **FK001** | Tool call without receipt generation | Warning/Error |
| **FK002** | LLM call without error handling | Warning |
| **FK003** | External API call without logging | Info |
| **FK004** | Database mutation without transaction | Info |

## Severity Classification

| Level | Impact | Examples |
|-------|--------|----------|
| **Critical** | Blocks deployment | Payment operations, data deletion |
| **High** | Needs review | Database mutations, email sending |
| **Medium** | Should fix | File operations, API calls |
| **Low** | Nice to have | Logging, minor validations |

## Supported Patterns

### Tool Calls (FK001)

- Database: `prisma.create()`, `prisma.update()`, `db.execute()`
- HTTP: `axios.post()`, `fetch()` (POST/PUT/DELETE)
- Email: `sendEmail()`, `mailer.send()`
- Files: `fs.writeFile()`, `s3.putObject()`
- Payments: `stripe.charges.create()`, `paymentAPI.charge()`

### LLM Calls (FK002)

- OpenAI: `openai.chat.completions.create()`
- Anthropic: `anthropic.messages.create()`
- LangChain: `llm.invoke()`, `agent.call()`
- Generic: `generateText()`, `streamText()`

### Agent Frameworks

- LangChain: `AgentExecutor.call()`, `agent.invoke()`
- CrewAI: `crew.kickoff()`, `task.execute()`
- AutoGPT: `agent.run()`

## Configuration

```json
{
  "fail-kit.enableRealTimeAnalysis": true,
  "fail-kit.severity.missingReceipt": "warning",
  "fail-kit.severity.missingErrorHandling": "warning",
  "fail-kit.excludePatterns": [
    "**/node_modules/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/dist/**"
  ],
  "fail-kit.autoFix.minConfidence": 90,
  "fail-kit.regression.enabled": true
}
```

## Disable Comments

```typescript
// fail-kit-disable-next-line
await dangerousOperation(); // No warning

// fail-kit-disable
await anotherOperation(); // No warning
```

## Known Limitations

- **TypeScript/JavaScript only** - Python support planned for v1.1.0
- **Single-file analysis** - Cross-file receipt tracking not yet supported
- **Dynamic calls not detected** - Calls via `eval()` won't be caught

## Roadmap

- **v1.1.0**: Python support, cross-file analysis
- **v1.2.0**: Custom rule configuration, team sharing
- **v2.0.0**: Full multi-language support, CI/CD integration

## Related

- [F.A.I.L. Kit CLI](https://github.com/resetroot99/The-FAIL-Kit) - Command-line audit tool
- [@fail-kit/core](https://github.com/resetroot99/The-FAIL-Kit/tree/main/packages/core) - Receipt generation library

## License

MIT License - See [LICENSE](LICENSE)

---

**Made by the F.A.I.L. Kit Team**
