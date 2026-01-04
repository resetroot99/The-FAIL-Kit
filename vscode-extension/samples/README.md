# F.A.I.L. Kit VS Code Extension - Sample Files

These sample files are for testing the F.A.I.L. Kit VS Code extension.

## Files

### `agent-with-issues.ts`

This file contains **intentionally problematic** agent code that should trigger F.A.I.L. Kit warnings:

| Line | Issue | Rule |
|------|-------|------|
| ~20 | OpenAI call without try/catch | FK002 |
| ~29 | Anthropic call without try/catch | FK002 |
| ~38 | Stripe payment without receipt | FK001 |
| ~47 | Database update without receipt | FK001 |
| ~54 | Agent call without receipt or error handling | FK001, FK002 |
| ~61 | HTTP POST without receipt | FK001 |
| ~68 | File write without receipt | FK001 |
| ~74 | Email send without receipt | FK001 |

### `agent-correct.ts`

This file shows **best practices** and should **not** trigger any warnings:

- All LLM calls wrapped in try/catch
- All destructive operations generate receipts
- Receipts follow RECEIPT_SCHEMA.json format
- Proper error logging

## Testing the Extension

1. Open VS Code in the `vscode-extension` directory
2. Press `F5` to launch Extension Development Host
3. Open `samples/agent-with-issues.ts`
4. You should see yellow squiggly underlines on problematic lines
5. Hover over the underlines to see F.A.I.L. Kit warnings
6. Click the lightbulb to see quick fix options
7. Open `samples/agent-correct.ts` - no warnings should appear

## Expected Warnings

When opening `agent-with-issues.ts`, you should see:

```
[Warning] FK001: payment operation without receipt generation. Destructive operations should generate audit receipts.
[Warning] FK002: openai LLM call without error handling. LLM calls can fail and should be wrapped in try/catch.
```

## Quick Fixes Available

For each warning, the following quick fixes are available:

1. **Add TODO comment** - Adds a TODO reminder to fix the issue
2. **Disable for this line** - Adds `// fail-kit-disable-next-line`
3. **Learn about receipt generation** - Opens documentation
4. **Wrap in try-catch** (FK002 only) - Wraps the call in error handling
