# F.A.I.L. Kit for VS Code

> **ℹ️ Repository Note:** This is the primary source for the F.A.I.L. Kit VSCode extension. Changes here are automatically synced to the standalone [vscode-fail](https://github.com/resetroot99/vscode-fail) repository.

**Forensic Audit of Intelligent Logic** - Real-time code analysis for robust AI agent tool use.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/AliJakvani.fail-kit-vscode?color=blue&label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=AliJakvani.fail-kit-vscode)
[![npm](https://img.shields.io/npm/v/@fail-kit/core?color=red&label=npm)](https://www.npmjs.com/package/@fail-kit/core)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/resetroot99/The-FAIL-Kit/blob/main/LICENSE.txt)

---

## Why This Exists

AI agents fail silently. Your agent says it sent the email, updated the database, or transferred money. **Did it?** Or did it just sound confident?

F.A.I.L. Kit catches execution integrity failures before they reach production:

- **Tool calls without receipts** - No proof the action happened
- **Silent failures** - Agent claims success when the tool failed
- **Missing error handling** - LLM calls with no fallback
- **Phantom completions** - Agent reports work it never did

This extension analyzes your agent code **as you type**, detecting these patterns and offering one-click fixes.

## Features

### Real-Time Robust Tool Use Analysis

F.A.I.L. Kit enforces **receipt-driven execution** - every tool call must produce proof of completion.

#### 1. Missing Receipts (FK001)

Tool calls without audit trails. Agent invokes a function but doesn't capture proof.

**Violation:**

```typescript
await sendEmail(contract); // ❌ No receipt
return 'Email sent';
```

**Auto-fixed:**

```typescript
const receipt = await sendEmail(contract);
if (!receipt.success) throw new Error(receipt.error);
return receipt;
```

#### 2. Silent Failures (FK008)

Agent claims completion when the tool returned an error.

**Violation:**

```typescript
const result = await processPayment(order);
return 'Payment processed'; // ❌ Ignores result.status
```

**Detection:** Receipt shows `status: "failed"`, output claims success.

#### 3. Missing Error Handling (FK002)

LLM calls without try/catch or timeout handling.

**Auto-fixed:**

```typescript
try {
  const response = await llm.invoke(prompt, { timeout: 30000 });
  return response;
} catch (error) {
  logError(error);
  return fallbackResponse();
}
```

#### 4. Tool Hallucination (FK014)

Agent invokes functions that don't exist.

**Detection:** Checks tool registry against claimed tool calls.

#### 5. Confidence Without Evidence (FK025)

High-confidence claims with no supporting receipts.

**Example:** "Database updated" but no tool receipt exists.

### Professional Dashboard

- **Ship Decision** - BLOCK / NEEDS_REVIEW / SHIP
- **Severity Breakdown** - Critical, High, Medium, Low
- **Root Cause Analysis** - Common failure patterns
- **Pass Rate Metrics** - Track improvements
- **Issue Timeline** - When problems were introduced

### One-Click Auto-Fix

High-confidence fixes (90%+):

- ✅ Add receipt generation after tool calls
- ✅ Wrap LLM calls in try/catch
- ✅ Add timeout handling
- ✅ Generate error escalation code
- ✅ Insert audit logging

### Multi-Framework Support

- **LangChain** (Python & JavaScript) - Agent executor, tools, chains
- **OpenAI Assistants API** - Function calling, tool use
- **Anthropic Claude** - Tool use with MCP
- **CrewAI** - Multi-agent orchestration
- **AutoGPT** - Autonomous agent execution
- **Custom Agents** - Any framework using tool/function calling

### Regression Detection

- Set baseline at any point
- Compare current state vs baseline
- Track improvements over time
- CI/CD integration ready

## Real-World Incidents Prevented

### 1. Sales Agent Email Failure

**Incident:** Agent claimed it emailed contract to legal. Three days later, deal delayed.
**F.A.I.L. Kit catches:** No receipt for `sendEmail()` call (FK001).

### 2. Backup Agent False Success

**Incident:** Nightly backup claimed success. Six months later, no backup file exists.
**F.A.I.L. Kit catches:** Receipt shows `status: "failed"`, agent claimed success (FK008).

### 3. Payment Processing Ghost Transaction

**Incident:** Customer charged, transaction never completed, product shipped for free.
**F.A.I.L. Kit catches:** No tool invocation receipt, but agent output includes transaction ID (FK014).

### 4. Database Mutation Without Proof

**Incident:** Agent reports "Database updated" but no audit log exists.
**F.A.I.L. Kit catches:** High-confidence claim with no supporting receipt (FK025).

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

| Command                              | Description                      |
| ------------------------------------ | -------------------------------- |
| `F.A.I.L. Kit: Analyze Current File` | Trigger analysis on current file |
| `F.A.I.L. Kit: Analyze Workspace`    | Analyze all files in workspace   |
| `F.A.I.L. Kit: Open Dashboard`       | Open the audit dashboard         |
| `F.A.I.L. Kit: Set Baseline`         | Save current state as baseline   |
| `F.A.I.L. Kit: Compare to Baseline`  | Compare against saved baseline   |
| `F.A.I.L. Kit: Auto-Fix All Issues`  | Apply auto-fixes to current file |
| `F.A.I.L. Kit: Export Report`        | Export markdown report           |

## Detection Rules

### Core Rules

| Rule ID   | Description                                         | Severity      | Auto-Fix  |
| --------- | --------------------------------------------------- | ------------- | --------- |
| **FK001** | Tool call without receipt generation                | Warning/Error | ✅ Yes    |
| **FK002** | LLM call without error handling                     | Warning       | ✅ Yes    |
| **FK003** | External API call without logging                   | Info          | ✅ Yes    |
| **FK004** | Database mutation without transaction               | Info          | ✅ Yes    |
| **FK008** | Phantom success (tool failed, agent claims success) | Critical      | ⚠️ Manual |
| **FK014** | Hallucinated tool invocation                        | High          | ❌ No     |
| **FK025** | Confidence without evidence                         | Medium        | ⚠️ Manual |

### Extended Ruleset

- **FK010** - Phantom completion (claimed work not done)
- **FK019** - Retrieval gap (missing context in RAG)
- **FK039** - Silent failure cascade (error propagation)
- **CONTRACT_0001** - Output schema violation
- **CONTRACT_0003** - Claimed actions without receipts
- **AGENT_0007** - State amnesia (context loss)

## Severity Classification

| Level        | Impact            | Examples                          |
| ------------ | ----------------- | --------------------------------- |
| **Critical** | Blocks deployment | Payment operations, data deletion |
| **High**     | Needs review      | Database mutations, email sending |
| **Medium**   | Should fix        | File operations, API calls        |
| **Low**      | Nice to have      | Logging, minor validations        |

## Supported Patterns

### Tool Calls Requiring Receipts (FK001)

**Database Operations:**

```typescript
await prisma.user.create({ data: userData }); // ❌ No receipt
await db.execute(query); // ❌ No receipt
const receipt = await prisma.user.create(userData); // ✅ Receipt captured
```

**HTTP Requests (Mutating):**

```typescript
await axios.post('/api/orders', order); // ❌ No receipt
await fetch('/api/users', { method: 'POST' }); // ❌ No receipt
```

**Email Operations:**

```typescript
await sendEmail(recipient, content); // ❌ No receipt
await mailer.send({ to, subject, body }); // ❌ No receipt
```

**File System Operations:**

```typescript
await fs.writeFile('output.txt', data); // ❌ No receipt
await s3.putObject({ bucket, key, body }); // ❌ No receipt
```

**Payment Processing:**

```typescript
await stripe.charges.create({ amount, currency }); // ❌ No receipt
await paymentAPI.charge(customerId, amount); // ❌ No receipt
```

### LLM Calls Requiring Error Handling (FK002)

**OpenAI:**

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }],
}); // ❌ No error handling
```

**Anthropic:**

```typescript
const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: prompt }],
}); // ❌ No error handling
```

**LangChain:**

```typescript
const result = await llm.invoke(prompt); // ❌ No error handling
const output = await agent.call({ input }); // ❌ No error handling
```

**Generic AI SDK:**

```typescript
const text = await generateText({ prompt }); // ❌ No error handling
const stream = streamText({ prompt }); // ❌ No error handling
```

### Agent Frameworks

**LangChain:**

```typescript
const executor = AgentExecutor.fromAgentAndTools({ agent, tools });
const result = await executor.call({ input: 'Book a flight' });
// F.A.I.L. Kit verifies: tool receipts, error handling, state tracking
```

**CrewAI:**

```python
crew = Crew(agents=[agent], tasks=[task])
result = crew.kickoff()
# F.A.I.L. Kit verifies: task completion receipts, failure handling
```

**AutoGPT:**

```python
agent = Agent.from_workspace(workspace_path)
result = agent.run(task)
# F.A.I.L. Kit verifies: action receipts, phantom completion detection
```

**Custom Agents:**

```typescript
class MyAgent {
  async executeTool(toolName: string, args: any) {
    const result = await this.tools[toolName](args);
    // F.A.I.L. Kit requires: receipt generation here
    return result;
  }
}
```

## Configuration

```json
{
  "fail-kit.enableRealTimeAnalysis": true,
  "fail-kit.severity.missingReceipt": "warning",
  "fail-kit.severity.missingErrorHandling": "warning",
  "fail-kit.excludePatterns": ["**/node_modules/**", "**/*.test.ts", "**/*.spec.ts", "**/dist/**"],
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

- **TypeScript/JavaScript only** - Python support via LSP server (experimental)
- **Single-file analysis** - Cross-file receipt tracking planned for v2.1
- **Dynamic calls not detected** - Calls via `eval()` or dynamic imports won't be caught
- **Requires static analysis** - Runtime-only tool registration not supported

## Roadmap

- **v2.1**: Cross-file receipt tracking, Python full support
- **v2.2**: Custom rule configuration, team-shared baselines
- **v2.5**: Real-time collaboration features
- **v3.0**: Multi-language support (Go, Rust, Java), CI/CD native integration

## Why Receipts Matter

Traditional software has **error codes**. AI agents need **execution receipts**.

**Without receipts:**

```typescript
await sendEmail(contract);
return 'Email sent'; // ❓ Did it actually send?
```

**With receipts:**

```typescript
const receipt = await sendEmail(contract);
if (!receipt.success) {
  throw new Error(`Email failed: ${receipt.error}`);
}
return receipt; // ✅ Proof of execution
```

Receipts provide:

- **Proof of execution** - Tool was actually called
- **Success/failure status** - Whether it worked
- **Error details** - What went wrong
- **Audit trail** - Who, what, when, where
- **Replay capability** - Reproduce the execution

## Related

- **[F.A.I.L. Kit CLI](https://github.com/resetroot99/The-FAIL-Kit)** - Command-line audit tool with 172+ test cases
- **[@fail-kit/core](https://github.com/resetroot99/The-FAIL-Kit/tree/main/packages/core)** - Receipt generation and validation library
- **[Receipt Standard](https://github.com/resetroot99/The-FAIL-Kit/tree/main/receipt-standard)** - Open standard for execution proof
- **[Ali's Book of Fail](https://github.com/resetroot99/Alis-book-of-fail)** - Open-source evaluation harness and doctrine

## Community & Support

**Issues:** Found a bug? [Open an issue](https://github.com/resetroot99/vscode-fail/issues)

**Discussions:** Questions? [GitHub Discussions](https://github.com/resetroot99/The-FAIL-Kit/discussions)

**Contributing:** We welcome contributions! See [CONTRIBUTING.md](https://github.com/resetroot99/The-FAIL-Kit/blob/main/CONTRIBUTING.md)

**Enterprise Support:** For advisory services or custom integrations, contact ali@jakvan.io

## License

MIT License - See [LICENSE](LICENSE)

Free and open source. Use it, modify it, ship it.

---

**No trace, no ship.**

---

**Made by the F.A.I.L. Kit Team** | [Website](https://fail-kit.dev) | [GitHub](https://github.com/resetroot99/The-FAIL-Kit)
