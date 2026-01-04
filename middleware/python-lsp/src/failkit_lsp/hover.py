"""
Hover Provider Module

Provides hover information for F.A.I.L. Kit diagnostics and patterns.
"""

from typing import Optional
import re

from lsprotocol.types import (
    Hover,
    MarkupContent,
    MarkupKind,
    Position,
)

from .diagnostics import DIAGNOSTIC_CODES


def get_hover_for_position(
    document_text: str,
    position: Position,
    diagnostics: list
) -> Optional[Hover]:
    """
    Generate hover information for a position in the document.
    
    Args:
        document_text: The full document text.
        position: The cursor position.
        diagnostics: List of current diagnostics for the document.
    
    Returns:
        Hover information if available, None otherwise.
    """
    lines = document_text.splitlines()
    if position.line >= len(lines):
        return None
    
    line = lines[position.line]
    
    # Check if hovering over a diagnostic
    for diag in diagnostics:
        if diag.range.start.line == position.line:
            if diag.range.start.character <= position.character <= diag.range.end.character:
                return _get_diagnostic_hover(diag.code)
    
    # Check for F.A.I.L. Kit related patterns
    hover = _check_pattern_hover(line, position.character)
    if hover:
        return hover
    
    return None


def _get_diagnostic_hover(code: str) -> Hover:
    """Generate hover content for a diagnostic code."""
    info = DIAGNOSTIC_CODES.get(code, {})
    
    title = info.get("title", "Unknown Rule")
    description = info.get("description", "No description available.")
    category = info.get("category", "unknown")
    severity = info.get("severity", "info")
    remediation = info.get("remediation", "")
    docs_url = info.get("docs_url", "https://fail-kit.dev/rules")
    
    content = f"""## {code}: {title}

**Category:** {category}  
**Severity:** {severity}

{description}

### Remediation

{remediation}

---
📖 [View Documentation]({docs_url})
"""
    
    return Hover(
        contents=MarkupContent(
            kind=MarkupKind.Markdown,
            value=content
        )
    )


def _check_pattern_hover(line: str, character: int) -> Optional[Hover]:
    """Check if the cursor is over a recognized pattern."""
    
    # Check for ReceiptGeneratingTool
    if "ReceiptGeneratingTool" in line:
        match = re.search(r"ReceiptGeneratingTool", line)
        if match and match.start() <= character <= match.end():
            return Hover(
                contents=MarkupContent(
                    kind=MarkupKind.Markdown,
                    value="""## ReceiptGeneratingTool

Base class for LangChain tools that automatically generate audit receipts.

### Usage

```python
from fail_kit_langchain import ReceiptGeneratingTool

class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email"
    
    def _execute(self, to: str, subject: str, body: str):
        send_email(to, subject, body)
        return {"status": "sent", "message_id": "msg_123"}
```

Receipts are automatically generated with:
- `action_id`: Unique identifier
- `timestamp`: ISO 8601 timestamp
- `input_hash`: SHA-256 hash of inputs
- `output_hash`: SHA-256 hash of outputs

📖 [F.A.I.L. Kit Documentation](https://fail-kit.dev/langchain)
"""
                )
            )
    
    # Check for AgentExecutor
    if "AgentExecutor" in line or "agent_executor" in line.lower():
        return Hover(
            contents=MarkupContent(
                kind=MarkupKind.Markdown,
                value="""## AgentExecutor (LangChain)

LangChain's AgentExecutor orchestrates agent execution with tools.

### F.A.I.L. Kit Integration

```python
from fail_kit_langchain import extract_receipts_from_agent_executor

# Run agent with return_intermediate_steps=True
agent_executor.return_intermediate_steps = True
result = agent_executor.invoke({"input": prompt})

# Extract receipts for audit
receipts = extract_receipts_from_agent_executor(
    agent_executor, result
)
```

### Best Practices

1. Always enable `return_intermediate_steps`
2. Wrap invocations in try/except
3. Extract and store receipts after each invocation

📖 [F.A.I.L. Kit LangChain Guide](https://fail-kit.dev/langchain)
"""
            )
        )
    
    # Check for CrewAI patterns
    if "Crew" in line and "kickoff" in line.lower():
        return Hover(
            contents=MarkupContent(
                kind=MarkupKind.Markdown,
                value="""## Crew.kickoff() (CrewAI)

Starts the crew's task execution workflow.

### F.A.I.L. Kit Best Practices

```python
try:
    result = crew.kickoff()
    
    # Generate receipt for audit
    receipt = {
        "action_id": f"crew_{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "crew_name": crew.name,
        "tasks_completed": len(crew.tasks),
        "output_hash": hash_data(result),
    }
except Exception as e:
    # Log failure for audit
    log_failure(e, crew_id=crew.id)
    raise
```

### Recommendations

- Always wrap `kickoff()` in try/except
- Generate receipts for completed tasks
- Configure error callbacks on Tasks

📖 [F.A.I.L. Kit CrewAI Guide](https://fail-kit.dev/crewai)
"""
            )
        )
    
    # Check for AutoGen patterns
    if "initiate_chat" in line.lower():
        return Hover(
            contents=MarkupContent(
                kind=MarkupKind.Markdown,
                value="""## initiate_chat() (AutoGen)

Starts a conversation between AutoGen agents.

### F.A.I.L. Kit Best Practices

```python
# Always set max_turns to prevent infinite loops
result = user_proxy.initiate_chat(
    assistant,
    message=prompt,
    max_turns=10,  # Required!
)

# Log conversation for audit
log_conversation(
    agent_id=user_proxy.name,
    messages=result.chat_history,
    total_turns=len(result.chat_history),
)
```

### Critical Settings

- `max_turns`: Prevents runaway conversations
- `human_input_mode`: Controls user intervention
- `code_execution_config`: Use Docker for safety

📖 [F.A.I.L. Kit AutoGen Guide](https://fail-kit.dev/autogen)
"""
            )
        )
    
    # Check for hash_data
    if "hash_data" in line:
        return Hover(
            contents=MarkupContent(
                kind=MarkupKind.Markdown,
                value="""## hash_data()

F.A.I.L. Kit utility for generating content hashes for receipt verification.

### Usage

```python
from fail_kit_langchain import hash_data

input_hash = hash_data({"prompt": user_input})
# Returns: "sha256:a1b2c3d4..."

output_hash = hash_data(agent_response)
```

### Parameters

- `data`: Any JSON-serializable data
- `algorithm`: Hash algorithm (default: "sha256")

### Returns

String in format `"algorithm:hexdigest"`

📖 [Receipt Schema Documentation](https://fail-kit.dev/receipts)
"""
            )
        )
    
    return None


def get_framework_hover(framework: str) -> Hover:
    """Get hover information for a specific framework."""
    frameworks = {
        "langchain": """## LangChain Integration

F.A.I.L. Kit provides first-class support for LangChain agents.

### Key Features

- **ReceiptGeneratingTool**: Auto-receipt base class
- **extract_receipts_from_agent_executor()**: Receipt extraction
- **create_fail_kit_endpoint()**: FastAPI integration

### Installation

```bash
pip install fail-kit-langchain
```

📖 [Full Documentation](https://fail-kit.dev/langchain)
""",
        "crewai": """## CrewAI Integration

F.A.I.L. Kit supports CrewAI multi-agent workflows.

### Key Features

- Task-level receipt generation
- Crew execution auditing
- Error callback integration

### Best Practices

1. Set `expected_output` on all Tasks
2. Configure `on_error` callbacks
3. Enable `memory` for context tracking

📖 [Full Documentation](https://fail-kit.dev/crewai)
""",
        "autogen": """## AutoGen Integration

F.A.I.L. Kit supports Microsoft AutoGen agents.

### Key Features

- Conversation auditing
- Function tool receipts
- Termination safeguards

### Critical Settings

1. Always set `max_turns` or `max_consecutive_auto_reply`
2. Use `human_input_mode="TERMINATE"` for safety
3. Enable Docker for code execution

📖 [Full Documentation](https://fail-kit.dev/autogen)
""",
    }
    
    content = frameworks.get(framework, f"No documentation for {framework}")
    return Hover(
        contents=MarkupContent(
            kind=MarkupKind.Markdown,
            value=content
        )
    )
