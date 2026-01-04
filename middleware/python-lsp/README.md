# F.A.I.L. Kit Python LSP Server

A Language Server Protocol (LSP) implementation for auditing Python AI agent code. Provides real-time diagnostics, code actions, and hover information for LangChain, CrewAI, and AutoGen frameworks.

## Features

- **Real-time Diagnostics**: Detects missing receipts, unhandled errors, secret exposure, and more
- **Framework Support**: LangChain, CrewAI, AutoGen, and generic Python agent patterns
- **Code Actions**: Quick fixes for common issues (add try-catch, generate receipts)
- **Hover Information**: Contextual documentation for F.A.I.L. Kit rules

## Installation

```bash
pip install failkit-lsp
```

Or from source:

```bash
cd middleware/python-lsp
pip install -e .
```

## Usage

### VS Code

Add to your `settings.json`:

```json
{
  "failKit.pythonLsp.enabled": true,
  "failKit.pythonLsp.path": "failkit-lsp"
}
```

### Neovim (with nvim-lspconfig)

```lua
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

if not configs.failkit_lsp then
  configs.failkit_lsp = {
    default_config = {
      cmd = { 'failkit-lsp' },
      filetypes = { 'python' },
      root_dir = lspconfig.util.root_pattern('pyproject.toml', 'setup.py', '.git'),
    },
  }
end

lspconfig.failkit_lsp.setup{}
```

### Command Line

Run the server directly:

```bash
failkit-lsp --stdio
```

Or with TCP:

```bash
failkit-lsp --tcp --host 127.0.0.1 --port 2087
```

## Supported Rules

| Rule ID | Description | Severity |
|---------|-------------|----------|
| FK001 | Missing Receipt for Tool Call | Error |
| FK002 | Missing Error Handling | Warning |
| FK003 | Secret Exposure | Error |
| FK004 | Side-Effect Without Confirmation | Warning |
| FK005 | LLM Call Missing Resilience | Info |
| FK006 | Missing Provenance Metadata | Warning |
| FK007 | Hardcoded Credential | Error |
| FK008 | CrewAI Task Missing Error Handler | Warning |
| FK009 | AutoGen Agent Missing Termination | Warning |

## Framework-Specific Detection

### LangChain

- `AgentExecutor.invoke()` / `.run()` calls
- `BaseTool` subclasses without receipt generation
- `@tool` decorated functions
- Chain invocations without error handling

### CrewAI

- `Crew.kickoff()` calls
- `Task` definitions without error handlers
- Agent configurations missing memory settings

### AutoGen

- `UserProxyAgent` / `AssistantAgent` configurations
- `initiate_chat()` calls without termination conditions
- Function tool definitions

## Configuration

Create a `.failkit.yaml` or `failkit.config.json` in your project root:

```yaml
# .failkit.yaml
python:
  enabled: true
  severity_overrides:
    FK005: "warning"  # Downgrade resilience checks to warnings
  ignore_patterns:
    - "**/tests/**"
    - "**/migrations/**"
  frameworks:
    langchain: true
    crewai: true
    autogen: true
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black src tests
ruff check src tests

# Type check
mypy src
```

## License

MIT License - see LICENSE file for details.
