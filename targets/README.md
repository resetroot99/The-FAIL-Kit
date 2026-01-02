# Target Adapters

Adapters that wrap popular AI agent frameworks for F.A.I.L. Kit security auditing.

## Available Targets

| Target | Port | API Key Required |
|--------|------|------------------|
| OpenAI Assistants | 8001 | OPENAI_API_KEY |
| Anthropic Claude | 8002 | ANTHROPIC_API_KEY |
| LangChain Agent | 8003 | OPENAI_API_KEY |
| Flowise | 8004 | FLOWISE_CHATFLOW_ID |

## Quick Start

### 1. Install Dependencies

```bash
pip install fastapi uvicorn openai anthropic langchain langchain-openai langchainhub httpx
```

### 2. Set API Keys

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Start a Target

```bash
# OpenAI Assistants
python targets/openai-assistants.py

# Or Claude
python targets/anthropic-claude.py

# Or LangChain
python targets/langchain-agent.py
```

### 4. Run Security Audit

```bash
# Run all security tests
fail-audit run --endpoint http://localhost:8001/eval/run --cases cases/security/

# Run specific category
fail-audit run --endpoint http://localhost:8001/eval/run --cases cases/security/INJECT_*.yaml

# Run with HTML report
fail-audit run --endpoint http://localhost:8001/eval/run --cases cases/security/ --output audit-report.html --format html
```

## Running All Targets

To compare security across targets, run each adapter and audit:

```bash
# Terminal 1
python targets/openai-assistants.py

# Terminal 2 (new)
fail-audit run --endpoint http://localhost:8001/eval/run --cases cases/security/ --output openai-audit.html --format html

# Then repeat for other targets
```

## Custom Targets

To add a new target, create an adapter that:

1. Exposes `POST /eval/run` endpoint
2. Accepts `{"prompt": "...", "inputs": {"user": "..."}}` 
3. Returns F.A.I.L. Kit response format:

```json
{
  "outputs": {
    "final_text": "response from agent",
    "decision": "PASS"
  },
  "actions": [
    {
      "action_id": "unique_id",
      "tool_name": "tool_used",
      "timestamp": "ISO8601",
      "status": "success|failed",
      "input_hash": "sha256:...",
      "output_hash": "sha256:..."
    }
  ],
  "policy": {
    "refuse": false,
    "abstain": false,
    "escalate": false,
    "reasons": []
  }
}
```

## Cost Warning

Running security audits costs API credits:
- 60 test cases x ~$0.01-0.05 per call = $0.60-3.00 per full audit
- Use cheaper models (gpt-4o-mini, claude-3-haiku) for initial testing
- Run subset of tests first to verify setup
