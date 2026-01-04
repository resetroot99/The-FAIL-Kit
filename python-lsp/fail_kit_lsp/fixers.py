"""
F.A.I.L. Kit Python Auto-Fix Generators

Generates code fixes for detected issues.
"""

from dataclasses import dataclass
from typing import Optional
from .analyzer import Issue


@dataclass
class AutoFix:
    """Represents an auto-fix for an issue."""
    
    title: str
    start_line: int
    start_column: int
    end_line: int
    end_column: int
    replacement: str


def get_fix_for_issue(issue: Issue, source: str) -> Optional[AutoFix]:
    """Get an auto-fix for an issue."""
    lines = source.split("\n")
    
    if issue.rule_id == "FK001":
        return get_receipt_fix(issue, lines)
    elif issue.rule_id == "FK002":
        return get_error_handling_fix(issue, lines)
    elif issue.rule_id == "FK003":
        return get_secret_fix(issue, lines)
    elif issue.rule_id == "FK004":
        return get_confirmation_fix(issue, lines)
    
    return None


def get_receipt_fix(issue: Issue, lines: list) -> Optional[AutoFix]:
    """Generate receipt generation fix."""
    line = issue.line
    if line >= len(lines):
        return None
    
    line_text = lines[line]
    indent = len(line_text) - len(line_text.lstrip())
    indent_str = " " * indent
    
    tool_name = issue.code or "tool"
    
    receipt_code = f"""
{indent_str}# F.A.I.L. Kit: Generate receipt
{indent_str}receipt = {{
{indent_str}    "action_id": f"act_{{int(time.time()*1000)}}_{{uuid.uuid4().hex[:8]}}",
{indent_str}    "tool_name": "{tool_name}",
{indent_str}    "timestamp": datetime.now().isoformat(),
{indent_str}    "status": "success",
{indent_str}    "input_hash": hashlib.sha256(json.dumps(input_data).encode()).hexdigest(),
{indent_str}    "output_hash": hashlib.sha256(json.dumps(result).encode()).hexdigest(),
{indent_str}}}
{indent_str}audit_logger.log_action(receipt)
"""
    
    # Insert after the current line
    return AutoFix(
        title=f"Add receipt generation for {tool_name}",
        start_line=line + 1,
        start_column=0,
        end_line=line + 1,
        end_column=0,
        replacement=receipt_code,
    )


def get_error_handling_fix(issue: Issue, lines: list) -> Optional[AutoFix]:
    """Generate error handling fix."""
    line = issue.line
    if line >= len(lines):
        return None
    
    line_text = lines[line]
    indent = len(line_text) - len(line_text.lstrip())
    indent_str = " " * indent
    inner_indent = " " * (indent + 4)
    
    original_code = line_text.strip()
    
    wrapped_code = f"""{indent_str}try:
{inner_indent}{original_code}
{indent_str}except Exception as e:
{inner_indent}# F.A.I.L. Kit: Log error and escalate
{inner_indent}audit_logger.log_failure({{
{inner_indent}    "action_id": f"err_{{int(time.time()*1000)}}",
{inner_indent}    "error_type": type(e).__name__,
{inner_indent}    "error_message": str(e),
{inner_indent}    "timestamp": datetime.now().isoformat(),
{inner_indent}}})
{inner_indent}raise
"""
    
    return AutoFix(
        title="Wrap in try/except with error logging",
        start_line=line,
        start_column=0,
        end_line=line,
        end_column=len(line_text),
        replacement=wrapped_code,
    )


def get_secret_fix(issue: Issue, lines: list) -> Optional[AutoFix]:
    """Generate secret remediation fix."""
    line = issue.line
    if line >= len(lines):
        return None
    
    line_text = lines[line]
    indent = len(line_text) - len(line_text.lstrip())
    indent_str = " " * indent
    
    var_name = issue.code or "secret"
    env_var_name = var_name.upper()
    
    fix_code = f"""{indent_str}# F.A.I.L. Kit: Use environment variable
{indent_str}{var_name} = os.environ.get("{env_var_name}")
{indent_str}if not {var_name}:
{indent_str}    raise ValueError("Missing required environment variable: {env_var_name}")
"""
    
    return AutoFix(
        title=f"Replace with environment variable {env_var_name}",
        start_line=line,
        start_column=0,
        end_line=line,
        end_column=len(line_text),
        replacement=fix_code,
    )


def get_confirmation_fix(issue: Issue, lines: list) -> Optional[AutoFix]:
    """Generate confirmation gate fix."""
    line = issue.line
    if line >= len(lines):
        return None
    
    line_text = lines[line]
    indent = len(line_text) - len(line_text.lstrip())
    indent_str = " " * indent
    inner_indent = " " * (indent + 4)
    
    operation = issue.code or "operation"
    original_code = line_text.strip()
    
    fix_code = f"""{indent_str}# F.A.I.L. Kit: Require confirmation for destructive operation
{indent_str}confirmed = await confirm_action({{
{indent_str}    "operation": "{operation}",
{indent_str}    "is_destructive": True,
{indent_str}    "requires_approval": True,
{indent_str}}})
{indent_str}
{indent_str}if not confirmed:
{inner_indent}audit_logger.log_action({{
{inner_indent}    "action_id": f"blocked_{{int(time.time()*1000)}}",
{inner_indent}    "operation": "{operation}",
{inner_indent}    "status": "blocked",
{inner_indent}    "reason": "User confirmation required",
{inner_indent}}})
{inner_indent}raise OperationCancelledError("User confirmation required")
{indent_str}
{indent_str}{original_code}
"""
    
    return AutoFix(
        title=f"Add confirmation gate for {operation}",
        start_line=line,
        start_column=0,
        end_line=line,
        end_column=len(line_text),
        replacement=fix_code,
    )


# Template snippets for manual insertion
RECEIPT_TEMPLATE = '''
# F.A.I.L. Kit Receipt Generation Template
import hashlib
import json
import time
import uuid
from datetime import datetime

def generate_receipt(tool_name: str, input_data: dict, result: dict) -> dict:
    """Generate a cryptographic receipt for an action."""
    return {
        "action_id": f"act_{int(time.time()*1000)}_{uuid.uuid4().hex[:8]}",
        "tool_name": tool_name,
        "timestamp": datetime.now().isoformat(),
        "status": "success",
        "input_hash": hashlib.sha256(json.dumps(input_data, sort_keys=True).encode()).hexdigest(),
        "output_hash": hashlib.sha256(json.dumps(result, sort_keys=True).encode()).hexdigest(),
    }
'''

AUDIT_LOGGER_TEMPLATE = '''
# F.A.I.L. Kit Audit Logger Template
import json
import logging
from datetime import datetime
from typing import Optional

class AuditLogger:
    """Centralized audit logging for agent actions."""
    
    def __init__(self, name: str = "fail-kit"):
        self.logger = logging.getLogger(name)
    
    def log_action(self, receipt: dict) -> None:
        """Log a successful action."""
        self.logger.info(f"[AUDIT] {json.dumps(receipt)}")
    
    def log_failure(self, receipt: dict) -> None:
        """Log a failed action."""
        self.logger.error(f"[AUDIT] {json.dumps(receipt)}")
    
    def log_retry(self, receipt: dict) -> None:
        """Log a retry attempt."""
        self.logger.warning(f"[AUDIT] {json.dumps(receipt)}")

audit_logger = AuditLogger()
'''

ERROR_HANDLER_TEMPLATE = '''
# F.A.I.L. Kit Error Handler Template
from functools import wraps
from typing import TypeVar, Callable, Any

T = TypeVar("T")

def with_error_handling(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator to add error handling with audit logging."""
    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> T:
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            audit_logger.log_failure({
                "action_id": f"err_{int(time.time()*1000)}",
                "function": func.__name__,
                "error_type": type(e).__name__,
                "error_message": str(e),
                "timestamp": datetime.now().isoformat(),
            })
            raise
    return wrapper
'''
