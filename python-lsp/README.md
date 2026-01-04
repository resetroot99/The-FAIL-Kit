# F.A.I.L. Kit Python Language Server

Language Server Protocol (LSP) implementation for Python AI agent frameworks.

## Features

- **LangChain Support**: Analyze LangChain agents, tools, and chains
- **CrewAI Support**: Analyze CrewAI agents, tasks, and crews
- **AutoGen Support**: Analyze AutoGen agents and group chats
- **Real-time Diagnostics**: Issues appear as you type
- **Quick Fixes**: One-click fixes for common issues
- **Hover Information**: Detailed issue descriptions on hover

## Installation

```bash
pip install fail-kit-lsp
```

## Usage

### VS Code

Install the F.A.I.L. Kit VS Code extension, which automatically uses this LSP for Python files.

### Neovim (nvim-lspconfig)

```lua
require('lspconfig').fail_kit_lsp.setup{}
```

### Other Editors

Start the language server:

```bash
fail-kit-lsp
```

The server communicates over stdin/stdout using the Language Server Protocol.

## Detected Issues

| Rule | Category | Description |
|------|----------|-------------|
| FK001 | Audit | Tool call without receipt generation |
| FK002 | Reliability | LLM call without error handling |
| FK003 | Security | Hardcoded secrets in code |
| FK004 | Safety | Destructive operation without confirmation |
| FK005 | Resilience | LLM call without retry/timeout |
| FK006 | Audit | Missing provenance metadata |

## Example

```python
# This code will trigger FK001 and FK002 warnings

from langchain.agents import AgentExecutor
from langchain_openai import ChatOpenAI

llm = ChatOpenAI()  # FK002: No error handling

# FK001: No receipt generation
result = agent_executor.invoke({"input": "delete all files"})
```

With F.A.I.L. Kit fixes:

```python
from langchain.agents import AgentExecutor
from langchain_openai import ChatOpenAI
from fail_kit import generate_receipt, audit_logger

llm = ChatOpenAI()

try:
    result = agent_executor.invoke({"input": "delete all files"})
    
    receipt = generate_receipt(
        tool_name="agent_executor",
        input_data={"input": "delete all files"},
        result=result,
    )
    audit_logger.log_action(receipt)
    
except Exception as e:
    audit_logger.log_failure({
        "error_type": type(e).__name__,
        "error_message": str(e),
    })
    raise
```

## Configuration

Create a `fail-kit.toml` in your project root:

```toml
[fail-kit]
# Skip patterns
skip_patterns = ["*_test.py", "test_*.py", "conftest.py"]

# Severity overrides
[fail-kit.severity]
FK001 = "error"  # Treat as error instead of warning
FK005 = "hint"   # Treat as hint instead of info

# Custom patterns
[fail-kit.patterns]
tool_calls = ["my_custom_tool\\.run"]
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy fail_kit_lsp

# Format code
black fail_kit_lsp
ruff check fail_kit_lsp
```

## License

MIT
