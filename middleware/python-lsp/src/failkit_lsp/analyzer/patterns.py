"""
Pattern Definitions for Python AI Agent Code

Shared patterns for detecting agent code, tool calls, LLM invocations,
secrets, and other audit-relevant constructs.
"""

import re
from dataclasses import dataclass
from typing import List, Optional
from enum import Enum


class PatternType(Enum):
    """Types of patterns for classification."""
    TOOL_CALL = "tool_call"
    LLM_CALL = "llm_call"
    AGENT_CALL = "agent_call"
    SECRET = "secret"
    SIDE_EFFECT = "side_effect"
    RESILIENCE = "resilience"
    RECEIPT = "receipt"
    ERROR_HANDLING = "error_handling"


@dataclass
class Pattern:
    """Represents a detection pattern."""
    pattern: str
    pattern_type: PatternType
    name: str
    description: str
    requires_receipt: bool = False
    requires_error_handling: bool = False
    severity: str = "warning"
    framework: Optional[str] = None


# Secret patterns for detecting hardcoded credentials
SECRET_PATTERNS: List[Pattern] = [
    Pattern(
        pattern=r"""['"]sk[-_]live[-_][a-zA-Z0-9]{20,}['"]""",
        pattern_type=PatternType.SECRET,
        name="stripe_secret_key",
        description="Stripe live secret key",
        severity="critical",
    ),
    Pattern(
        pattern=r"""['"]sk[-_]test[-_][a-zA-Z0-9]{20,}['"]""",
        pattern_type=PatternType.SECRET,
        name="stripe_test_key",
        description="Stripe test secret key",
        severity="high",
    ),
    Pattern(
        pattern=r"""['"]AKIA[A-Z0-9]{16}['"]""",
        pattern_type=PatternType.SECRET,
        name="aws_access_key",
        description="AWS Access Key ID",
        severity="critical",
    ),
    Pattern(
        pattern=r"""['"]sk-[a-zA-Z0-9]{32,}['"]""",
        pattern_type=PatternType.SECRET,
        name="openai_api_key",
        description="OpenAI API key",
        severity="critical",
    ),
    Pattern(
        pattern=r"""['"]ghp_[a-zA-Z0-9]{36}['"]""",
        pattern_type=PatternType.SECRET,
        name="github_pat",
        description="GitHub Personal Access Token",
        severity="critical",
    ),
    Pattern(
        pattern=r"""['"]gho_[a-zA-Z0-9]{36}['"]""",
        pattern_type=PatternType.SECRET,
        name="github_oauth",
        description="GitHub OAuth Token",
        severity="critical",
    ),
    Pattern(
        pattern=r"""password\s*=\s*['"][^'"]{6,}['"]""",
        pattern_type=PatternType.SECRET,
        name="hardcoded_password",
        description="Hardcoded password",
        severity="critical",
    ),
    Pattern(
        pattern=r"""api[_-]?key\s*=\s*['"][^'"]{20,}['"]""",
        pattern_type=PatternType.SECRET,
        name="generic_api_key",
        description="Generic API key assignment",
        severity="high",
    ),
    Pattern(
        pattern=r"""secret[_-]?key\s*=\s*['"][^'"]{10,}['"]""",
        pattern_type=PatternType.SECRET,
        name="generic_secret",
        description="Generic secret key assignment",
        severity="high",
    ),
]

# LLM call patterns
LLM_PATTERNS: List[Pattern] = [
    # OpenAI
    Pattern(
        pattern=r"""(await\s+)?openai\.chat\.completions\.create\s*\(""",
        pattern_type=PatternType.LLM_CALL,
        name="openai_chat",
        description="OpenAI Chat Completions API call",
        requires_error_handling=True,
        framework="openai",
    ),
    Pattern(
        pattern=r"""(await\s+)?client\.chat\.completions\.create\s*\(""",
        pattern_type=PatternType.LLM_CALL,
        name="openai_client_chat",
        description="OpenAI Client Chat call",
        requires_error_handling=True,
        framework="openai",
    ),
    # Anthropic
    Pattern(
        pattern=r"""(await\s+)?anthropic\.messages\.create\s*\(""",
        pattern_type=PatternType.LLM_CALL,
        name="anthropic_messages",
        description="Anthropic Messages API call",
        requires_error_handling=True,
        framework="anthropic",
    ),
    # Generic LLM patterns
    Pattern(
        pattern=r"""\.invoke\s*\([^)]*\)""",
        pattern_type=PatternType.LLM_CALL,
        name="generic_invoke",
        description="Generic invoke call (LangChain style)",
        requires_error_handling=True,
    ),
    Pattern(
        pattern=r"""\.complete\s*\(""",
        pattern_type=PatternType.LLM_CALL,
        name="generic_complete",
        description="Generic complete call",
        requires_error_handling=True,
    ),
    Pattern(
        pattern=r"""\.generate\s*\(""",
        pattern_type=PatternType.LLM_CALL,
        name="generic_generate",
        description="Generic generate call",
        requires_error_handling=True,
    ),
]

# Tool call patterns (destructive operations)
TOOL_PATTERNS: List[Pattern] = [
    # Database operations
    Pattern(
        pattern=r"""\.execute\s*\([^)]*\)""",
        pattern_type=PatternType.TOOL_CALL,
        name="db_execute",
        description="Database execute operation",
        requires_receipt=True,
    ),
    Pattern(
        pattern=r"""\.commit\s*\(\)""",
        pattern_type=PatternType.TOOL_CALL,
        name="db_commit",
        description="Database commit operation",
        requires_receipt=True,
    ),
    # HTTP requests
    Pattern(
        pattern=r"""requests\.(post|put|delete|patch)\s*\(""",
        pattern_type=PatternType.TOOL_CALL,
        name="http_mutation",
        description="HTTP mutation request",
        requires_receipt=True,
    ),
    Pattern(
        pattern=r"""httpx\.(post|put|delete|patch)\s*\(""",
        pattern_type=PatternType.TOOL_CALL,
        name="httpx_mutation",
        description="HTTPX mutation request",
        requires_receipt=True,
    ),
    Pattern(
        pattern=r"""aiohttp\.ClientSession\(\)\.(?:post|put|delete|patch)\s*\(""",
        pattern_type=PatternType.TOOL_CALL,
        name="aiohttp_mutation",
        description="AIOHTTP mutation request",
        requires_receipt=True,
    ),
    # File operations
    Pattern(
        pattern=r"""open\s*\([^)]*,\s*['"]w['"]""",
        pattern_type=PatternType.TOOL_CALL,
        name="file_write",
        description="File write operation",
        requires_receipt=True,
    ),
    Pattern(
        pattern=r"""os\.(remove|unlink|rmdir)\s*\(""",
        pattern_type=PatternType.TOOL_CALL,
        name="file_delete",
        description="File delete operation",
        requires_receipt=True,
    ),
    Pattern(
        pattern=r"""shutil\.(rmtree|move|copy)\s*\(""",
        pattern_type=PatternType.TOOL_CALL,
        name="file_shutil",
        description="Shutil file operation",
        requires_receipt=True,
    ),
    # Email/messaging
    Pattern(
        pattern=r"""send_email\s*\(""",
        pattern_type=PatternType.TOOL_CALL,
        name="email_send",
        description="Email send operation",
        requires_receipt=True,
    ),
    Pattern(
        pattern=r"""\.send_message\s*\(""",
        pattern_type=PatternType.TOOL_CALL,
        name="message_send",
        description="Message send operation",
        requires_receipt=True,
    ),
    # Payment operations
    Pattern(
        pattern=r"""stripe\.(?:Charge|PaymentIntent|Subscription)\.\w+\s*\(""",
        pattern_type=PatternType.TOOL_CALL,
        name="stripe_payment",
        description="Stripe payment operation",
        requires_receipt=True,
        severity="critical",
    ),
]

# Side-effect patterns
SIDE_EFFECT_PATTERNS: List[Pattern] = [
    Pattern(
        pattern=r"""\.delete\s*\(""",
        pattern_type=PatternType.SIDE_EFFECT,
        name="delete_operation",
        description="Delete operation",
        severity="high",
    ),
    Pattern(
        pattern=r"""\.destroy\s*\(""",
        pattern_type=PatternType.SIDE_EFFECT,
        name="destroy_operation",
        description="Destroy operation",
        severity="critical",
    ),
    Pattern(
        pattern=r"""\.drop\s*\(""",
        pattern_type=PatternType.SIDE_EFFECT,
        name="drop_operation",
        description="Drop operation",
        severity="critical",
    ),
    Pattern(
        pattern=r"""\.truncate\s*\(""",
        pattern_type=PatternType.SIDE_EFFECT,
        name="truncate_operation",
        description="Truncate operation",
        severity="critical",
    ),
    Pattern(
        pattern=r"""\.publish\s*\(""",
        pattern_type=PatternType.SIDE_EFFECT,
        name="publish_operation",
        description="Publish operation",
        severity="medium",
    ),
]

# Resilience patterns (what we look for as evidence of resilience)
RESILIENCE_PATTERNS: List[Pattern] = [
    Pattern(
        pattern=r"""timeout\s*=\s*\d+""",
        pattern_type=PatternType.RESILIENCE,
        name="timeout_config",
        description="Timeout configuration",
    ),
    Pattern(
        pattern=r"""max_retries\s*=\s*\d+""",
        pattern_type=PatternType.RESILIENCE,
        name="retry_config",
        description="Retry configuration",
    ),
    Pattern(
        pattern=r"""@retry\s*\(""",
        pattern_type=PatternType.RESILIENCE,
        name="retry_decorator",
        description="Retry decorator",
    ),
    Pattern(
        pattern=r"""with_retry\s*\(""",
        pattern_type=PatternType.RESILIENCE,
        name="with_retry",
        description="With retry wrapper",
    ),
    Pattern(
        pattern=r"""fallback\s*=""",
        pattern_type=PatternType.RESILIENCE,
        name="fallback_config",
        description="Fallback configuration",
    ),
]

# Receipt patterns (evidence of proper auditing)
RECEIPT_PATTERNS: List[Pattern] = [
    Pattern(
        pattern=r"""create_receipt\s*\(""",
        pattern_type=PatternType.RECEIPT,
        name="create_receipt",
        description="Receipt creation",
    ),
    Pattern(
        pattern=r"""generate_receipt\s*\(""",
        pattern_type=PatternType.RECEIPT,
        name="generate_receipt",
        description="Receipt generation",
    ),
    Pattern(
        pattern=r"""hash_data\s*\(""",
        pattern_type=PatternType.RECEIPT,
        name="hash_data",
        description="Data hashing for receipt",
    ),
    Pattern(
        pattern=r"""action_id\s*[=:]""",
        pattern_type=PatternType.RECEIPT,
        name="action_id",
        description="Action ID field",
    ),
    Pattern(
        pattern=r"""input_hash\s*[=:]""",
        pattern_type=PatternType.RECEIPT,
        name="input_hash",
        description="Input hash field",
    ),
    Pattern(
        pattern=r"""output_hash\s*[=:]""",
        pattern_type=PatternType.RECEIPT,
        name="output_hash",
        description="Output hash field",
    ),
    Pattern(
        pattern=r"""ReceiptGeneratingTool""",
        pattern_type=PatternType.RECEIPT,
        name="receipt_generating_tool",
        description="ReceiptGeneratingTool base class",
    ),
]

# Error handling patterns
ERROR_HANDLING_PATTERNS: List[Pattern] = [
    Pattern(
        pattern=r"""try\s*:""",
        pattern_type=PatternType.ERROR_HANDLING,
        name="try_block",
        description="Try block",
    ),
    Pattern(
        pattern=r"""except\s+""",
        pattern_type=PatternType.ERROR_HANDLING,
        name="except_block",
        description="Except block",
    ),
    Pattern(
        pattern=r"""handle_parsing_errors\s*=""",
        pattern_type=PatternType.ERROR_HANDLING,
        name="parsing_errors_handler",
        description="Parsing errors handler",
    ),
    Pattern(
        pattern=r"""on_error\s*=""",
        pattern_type=PatternType.ERROR_HANDLING,
        name="on_error_handler",
        description="On error handler",
    ),
]

# Aggregate all patterns
PYTHON_PATTERNS = {
    "secrets": SECRET_PATTERNS,
    "llm": LLM_PATTERNS,
    "tool": TOOL_PATTERNS,
    "side_effect": SIDE_EFFECT_PATTERNS,
    "resilience": RESILIENCE_PATTERNS,
    "receipt": RECEIPT_PATTERNS,
    "error_handling": ERROR_HANDLING_PATTERNS,
}

# Export all pattern lists for easy import
__all__ = [
    "Pattern",
    "PatternType",
    "PatternMatcher",
    "PYTHON_PATTERNS",
    "SECRET_PATTERNS",
    "LLM_PATTERNS",
    "TOOL_PATTERNS",
    "SIDE_EFFECT_PATTERNS",
    "RESILIENCE_PATTERNS",
    "RECEIPT_PATTERNS",
    "ERROR_HANDLING_PATTERNS",
]


class PatternMatcher:
    """Utility class for matching patterns in source code."""
    
    def __init__(self, source_code: str):
        self.source_code = source_code
        self.lines = source_code.splitlines()
    
    def find_matches(
        self,
        patterns: List[Pattern],
        flags: int = re.MULTILINE
    ) -> List[tuple[Pattern, int, int, re.Match]]:
        """
        Find all matches for a list of patterns.
        
        Returns:
            List of (pattern, line, column, match) tuples.
        """
        results = []
        for pattern in patterns:
            for match in re.finditer(pattern.pattern, self.source_code, flags):
                line, col = self._get_line_column(match.start())
                results.append((pattern, line, col, match))
        return results
    
    def has_pattern_nearby(
        self,
        patterns: List[Pattern],
        line_number: int,
        search_range: int = 10
    ) -> bool:
        """Check if any of the patterns exist near a given line."""
        start = max(0, line_number - search_range)
        end = min(len(self.lines), line_number + search_range)
        context = "\n".join(self.lines[start:end])
        
        for pattern in patterns:
            if re.search(pattern.pattern, context):
                return True
        return False
    
    def _get_line_column(self, position: int) -> tuple[int, int]:
        """Convert character position to line and column."""
        line = 0
        col = position
        for i, line_text in enumerate(self.lines):
            if col <= len(line_text):
                return (i, col)
            col -= len(line_text) + 1
            line = i + 1
        return (line, 0)
    
    def is_in_skip_context(self, line_number: int) -> bool:
        """Check if line is in a context that should be skipped (comments, etc.)."""
        if line_number >= len(self.lines):
            return True
        
        line = self.lines[line_number]
        stripped = line.strip()
        
        # Skip comment lines
        if stripped.startswith("#"):
            return True
        
        # Skip docstrings (simple heuristic)
        if stripped.startswith('"""') or stripped.startswith("'''"):
            return True
        
        return False
