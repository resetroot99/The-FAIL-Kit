"""
Diagnostics Module

Converts analyzer issues to LSP diagnostics for the language server.
"""

from typing import List

from lsprotocol.types import (
    Diagnostic,
    DiagnosticSeverity,
    DiagnosticTag,
    Position,
    Range,
)

from .analyzer import Issue, IssueSeverity


def severity_to_lsp(severity: IssueSeverity) -> DiagnosticSeverity:
    """Convert F.A.I.L. Kit severity to LSP DiagnosticSeverity."""
    mapping = {
        IssueSeverity.ERROR: DiagnosticSeverity.Error,
        IssueSeverity.WARNING: DiagnosticSeverity.Warning,
        IssueSeverity.INFO: DiagnosticSeverity.Information,
        IssueSeverity.HINT: DiagnosticSeverity.Hint,
    }
    return mapping.get(severity, DiagnosticSeverity.Warning)


def issue_to_diagnostic(issue: Issue) -> Diagnostic:
    """
    Convert a F.A.I.L. Kit Issue to an LSP Diagnostic.
    
    Args:
        issue: The Issue object from the analyzer.
    
    Returns:
        An LSP Diagnostic object.
    """
    # Create range (LSP uses 0-based line numbers)
    start = Position(line=issue.line, character=issue.column)
    end = Position(line=issue.end_line, character=issue.end_column)
    
    # Build diagnostic message with rule ID
    message = f"[{issue.rule_id}] {issue.message}"
    
    # Determine tags based on category
    tags: List[DiagnosticTag] = []
    
    # Add code for quick fix identification
    code = issue.rule_id
    
    # Build data for code actions
    data = {
        "rule_id": issue.rule_id,
        "category": issue.category.value,
        "framework": issue.data.get("framework"),
        "pattern": issue.data.get("pattern"),
    }
    
    return Diagnostic(
        range=Range(start=start, end=end),
        message=message,
        severity=severity_to_lsp(issue.severity),
        source=issue.source,
        code=code,
        tags=tags if tags else None,
        data=data,
    )


def issues_to_diagnostics(issues: List[Issue]) -> List[Diagnostic]:
    """
    Convert a list of Issues to LSP Diagnostics.
    
    Args:
        issues: List of Issue objects from analyzers.
    
    Returns:
        List of LSP Diagnostic objects.
    """
    return [issue_to_diagnostic(issue) for issue in issues]


# Diagnostic code descriptions for documentation
DIAGNOSTIC_CODES = {
    "FK001": {
        "title": "Missing Receipt",
        "description": "Tool or agent operation lacks audit receipt generation.",
        "category": "receipt",
        "severity": "error",
        "remediation": "Use ReceiptGeneratingTool or call generate_receipt() after operations.",
        "docs_url": "https://fail-kit.dev/rules/FK001",
    },
    "FK002": {
        "title": "Missing Error Handling",
        "description": "LLM or agent call lacks try/except error handling.",
        "category": "error_handling",
        "severity": "warning",
        "remediation": "Wrap the call in a try/except block to handle failures gracefully.",
        "docs_url": "https://fail-kit.dev/rules/FK002",
    },
    "FK003": {
        "title": "Secret Exposure",
        "description": "Hardcoded secret or credential detected in code.",
        "category": "security",
        "severity": "error",
        "remediation": "Use environment variables or a secrets manager instead.",
        "docs_url": "https://fail-kit.dev/rules/FK003",
    },
    "FK004": {
        "title": "Side-Effect Without Confirmation",
        "description": "Destructive operation lacks user confirmation or policy check.",
        "category": "side_effect",
        "severity": "warning",
        "remediation": "Add a confirmation dialog or policy check before execution.",
        "docs_url": "https://fail-kit.dev/rules/FK004",
    },
    "FK005": {
        "title": "Missing LLM Resilience",
        "description": "LLM call lacks timeout, retry, or fallback configuration.",
        "category": "resilience",
        "severity": "info",
        "remediation": "Add timeout, max_retries, or fallback configuration.",
        "docs_url": "https://fail-kit.dev/rules/FK005",
    },
    "FK006": {
        "title": "Missing Provenance Metadata",
        "description": "Operation lacks essential audit metadata (action_id, timestamp).",
        "category": "provenance",
        "severity": "warning",
        "remediation": "Include action_id, timestamp, and other provenance fields.",
        "docs_url": "https://fail-kit.dev/rules/FK006",
    },
    "FK007": {
        "title": "Hardcoded Credential",
        "description": "Hardcoded API key, password, or token detected.",
        "category": "security",
        "severity": "error",
        "remediation": "Use environment variables: os.environ['API_KEY']",
        "docs_url": "https://fail-kit.dev/rules/FK007",
    },
    "FK008": {
        "title": "CrewAI Task Missing Error Handler",
        "description": "CrewAI Task definition lacks error handling callback.",
        "category": "error_handling",
        "severity": "warning",
        "remediation": "Add on_error or callback parameter to Task().",
        "docs_url": "https://fail-kit.dev/rules/FK008",
    },
    "FK009": {
        "title": "AutoGen Agent Missing Termination",
        "description": "AutoGen agent lacks max_turns or termination configuration.",
        "category": "agent_safety",
        "severity": "warning",
        "remediation": "Set max_turns or max_consecutive_auto_reply to prevent infinite loops.",
        "docs_url": "https://fail-kit.dev/rules/FK009",
    },
}


def get_diagnostic_info(code: str) -> dict:
    """Get detailed information about a diagnostic code."""
    return DIAGNOSTIC_CODES.get(code, {
        "title": "Unknown Rule",
        "description": f"No documentation available for rule {code}.",
        "category": "unknown",
        "severity": "info",
        "remediation": "Check F.A.I.L. Kit documentation.",
        "docs_url": "https://fail-kit.dev/rules",
    })
