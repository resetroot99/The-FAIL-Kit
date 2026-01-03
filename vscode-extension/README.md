# F.A.I.L. Kit VS Code Extension

Real-time static analysis for AI agent code. Detects missing receipts, error handling issues, and audit gaps.

## Features

- **Real-time Analysis**: Analyzes your code as you type
- **Missing Receipt Detection** (FK001): Warns when destructive operations lack audit receipts
- **Missing Error Handling** (FK002): Warns when LLM calls lack try/catch blocks
- **Quick Fixes**: One-click fixes to add TODOs or disable warnings
- **Multi-Framework Support**: LangChain, OpenAI, Anthropic, CrewAI, and more

## Installation

### From VS Code Marketplace

Coming soon! For now, install from source.

### From Source

```bash
cd vscode-extension
npm install
npm run compile
```

Then press `F5` in VS Code to launch the Extension Development Host.

## Configuration

Configure the extension in VS Code settings:

```json
{
  "fail-kit.enableRealTimeAnalysis": true,
  "fail-kit.severity.missingReceipt": "warning",
  "fail-kit.severity.missingErrorHandling": "warning",
  "fail-kit.excludePatterns": [
    "**/node_modules/**",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

## Detection Rules

| Rule | Description | Default Severity |
|------|-------------|------------------|
| FK001 | Tool call without receipt generation | Warning |
| FK002 | LLM call without error handling | Warning |
| FK003 | External API call without logging | Info |
| FK004 | Database mutation without transaction | Info |

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

## Quick Fixes

When you see a warning, click the lightbulb (or press `Cmd+.`) to see available fixes:

1. **Add TODO comment** - Adds a reminder to implement the fix
2. **Disable for this line** - Adds `// fail-kit-disable-next-line`
3. **Wrap in try-catch** - Wraps the call in error handling (FK002)
4. **Learn more** - Opens documentation

## Disable Comments

To disable F.A.I.L. Kit for specific lines:

```typescript
// fail-kit-disable-next-line
await dangerousOperation(); // No warning

// fail-kit-disable
await anotherOperation(); // No warning
```

## Commands

- `F.A.I.L. Kit: Analyze Current File` - Manually trigger analysis
- `F.A.I.L. Kit: Analyze Workspace` - Analyze all files in workspace

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Run linter
npm run lint
```

## Testing

1. Press `F5` to launch Extension Development Host
2. Open `samples/agent-with-issues.ts`
3. Verify warnings appear
4. Test quick fixes

## Related

- [F.A.I.L. Kit CLI](../cli) - Command-line audit tool
- [Receipt Schema](../RECEIPT_SCHEMA.json) - Standard receipt format
- [LangChain Adapter](../middleware/langchain) - LangChain integration

## License

Commercial - See [LICENSE](../LICENSE.txt)
