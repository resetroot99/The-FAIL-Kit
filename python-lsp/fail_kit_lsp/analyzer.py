"""
F.A.I.L. Kit Python AST Analyzer

Analyzes Python code for AI agent forensic issues.
"""

import ast
import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from .patterns import (
    TOOL_PATTERNS,
    LLM_PATTERNS,
    AGENT_PATTERNS,
    SECRET_PATTERNS,
    SIDE_EFFECT_PATTERNS,
    RECEIPT_PATTERNS,
    ERROR_HANDLING_PATTERNS,
)


@dataclass
class Issue:
    """Represents a detected issue."""
    
    rule_id: str
    category: str
    severity: str
    message: str
    recommendation: str
    line: int
    column: int
    end_line: int
    end_column: int
    code: Optional[str] = None


@dataclass
class ToolCallInfo:
    """Information about a detected tool call."""
    
    name: str
    line: int
    column: int
    category: str
    is_destructive: bool = False


@dataclass
class LLMCallInfo:
    """Information about a detected LLM call."""
    
    provider: str
    line: int
    column: int
    has_error_handling: bool = False


@dataclass
class AnalysisResult:
    """Result of code analysis."""
    
    issues: List[Issue] = field(default_factory=list)
    tool_calls: List[ToolCallInfo] = field(default_factory=list)
    llm_calls: List[LLMCallInfo] = field(default_factory=list)
    agent_calls: List[dict] = field(default_factory=list)


class FailKitVisitor(ast.NodeVisitor):
    """AST visitor for F.A.I.L. Kit analysis."""
    
    def __init__(self, source: str, uri: str):
        self.source = source
        self.uri = uri
        self.lines = source.split("\n")
        self.issues: List[Issue] = []
        self.tool_calls: List[ToolCallInfo] = []
        self.llm_calls: List[LLMCallInfo] = []
        self.agent_calls: List[dict] = []
        self.current_try_block: Optional[ast.Try] = None
        self.current_function: Optional[ast.FunctionDef] = None
    
    def get_line_text(self, lineno: int) -> str:
        """Get text of a specific line."""
        if 0 <= lineno - 1 < len(self.lines):
            return self.lines[lineno - 1]
        return ""
    
    def has_receipt_nearby(self, lineno: int, range_lines: int = 10) -> bool:
        """Check if there's receipt generation nearby."""
        start = max(0, lineno - 1)
        end = min(len(self.lines), lineno + range_lines)
        chunk = "\n".join(self.lines[start:end])
        
        for pattern in RECEIPT_PATTERNS:
            if re.search(pattern, chunk, re.IGNORECASE):
                return True
        return False
    
    def has_error_handling_nearby(self, lineno: int) -> bool:
        """Check if call is inside try block."""
        return self.current_try_block is not None
    
    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        """Visit function definition."""
        prev_function = self.current_function
        self.current_function = node
        self.generic_visit(node)
        self.current_function = prev_function
    
    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        """Visit async function definition."""
        prev_function = self.current_function
        self.current_function = node  # type: ignore
        self.generic_visit(node)
        self.current_function = prev_function
    
    def visit_Try(self, node: ast.Try) -> None:
        """Visit try block."""
        prev_try = self.current_try_block
        self.current_try_block = node
        for child in node.body:
            self.visit(child)
        self.current_try_block = prev_try
        
        # Visit handlers and else/finally outside try context
        for handler in node.handlers:
            self.visit(handler)
        for child in node.orelse:
            self.visit(child)
        for child in node.finalbody:
            self.visit(child)
    
    def visit_Call(self, node: ast.Call) -> None:
        """Visit function call."""
        call_str = self.get_call_string(node)
        lineno = node.lineno
        col = node.col_offset
        
        # Check for tool calls
        self.check_tool_call(node, call_str, lineno, col)
        
        # Check for LLM calls
        self.check_llm_call(node, call_str, lineno, col)
        
        # Check for agent calls
        self.check_agent_call(node, call_str, lineno, col)
        
        # Check for side effects
        self.check_side_effect(node, call_str, lineno, col)
        
        self.generic_visit(node)
    
    def visit_Assign(self, node: ast.Assign) -> None:
        """Visit assignment."""
        # Check for hardcoded secrets
        if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
            value = node.value.value
            for target in node.targets:
                if isinstance(target, ast.Name):
                    var_name = target.id.lower()
                    self.check_secret(var_name, value, node.lineno, node.col_offset)
        
        self.generic_visit(node)
    
    def get_call_string(self, node: ast.Call) -> str:
        """Get string representation of a call."""
        if isinstance(node.func, ast.Attribute):
            parts = []
            current = node.func
            while isinstance(current, ast.Attribute):
                parts.append(current.attr)
                current = current.value
            if isinstance(current, ast.Name):
                parts.append(current.id)
            parts.reverse()
            return ".".join(parts)
        elif isinstance(node.func, ast.Name):
            return node.func.id
        return ""
    
    def check_tool_call(self, node: ast.Call, call_str: str, lineno: int, col: int) -> None:
        """Check if call is a tool call."""
        for pattern, category in TOOL_PATTERNS:
            if re.search(pattern, call_str, re.IGNORECASE):
                is_destructive = any(
                    re.search(p, call_str, re.IGNORECASE)
                    for p in ["delete", "remove", "drop", "truncate"]
                )
                
                self.tool_calls.append(ToolCallInfo(
                    name=call_str,
                    line=lineno,
                    column=col,
                    category=category,
                    is_destructive=is_destructive,
                ))
                
                # FK001: Missing receipt
                if not self.has_receipt_nearby(lineno):
                    self.issues.append(Issue(
                        rule_id="FK001",
                        category="receipt_missing",
                        severity="warning",
                        message=f"Tool call '{call_str}' without receipt generation",
                        recommendation="Add receipt generation after tool call for audit trail",
                        line=lineno - 1,
                        column=col,
                        end_line=lineno - 1,
                        end_column=col + len(call_str),
                        code=call_str,
                    ))
                
                break
    
    def check_llm_call(self, node: ast.Call, call_str: str, lineno: int, col: int) -> None:
        """Check if call is an LLM call."""
        for pattern, provider in LLM_PATTERNS:
            if re.search(pattern, call_str, re.IGNORECASE):
                has_error_handling = self.has_error_handling_nearby(lineno)
                
                self.llm_calls.append(LLMCallInfo(
                    provider=provider,
                    line=lineno,
                    column=col,
                    has_error_handling=has_error_handling,
                ))
                
                # FK002: Missing error handling
                if not has_error_handling:
                    self.issues.append(Issue(
                        rule_id="FK002",
                        category="error_handling_missing",
                        severity="warning",
                        message=f"LLM call to '{provider}' without error handling",
                        recommendation="Wrap LLM calls in try/except block",
                        line=lineno - 1,
                        column=col,
                        end_line=lineno - 1,
                        end_column=col + len(call_str),
                        code=call_str,
                    ))
                
                break
    
    def check_agent_call(self, node: ast.Call, call_str: str, lineno: int, col: int) -> None:
        """Check if call is an agent call."""
        for pattern, framework in AGENT_PATTERNS:
            if re.search(pattern, call_str, re.IGNORECASE):
                self.agent_calls.append({
                    "framework": framework,
                    "line": lineno,
                    "column": col,
                    "call": call_str,
                })
                break
    
    def check_side_effect(self, node: ast.Call, call_str: str, lineno: int, col: int) -> None:
        """Check for unconfirmed side effects."""
        for pattern in SIDE_EFFECT_PATTERNS:
            if re.search(pattern, call_str, re.IGNORECASE):
                # Check for confirmation nearby
                chunk = "\n".join(self.lines[max(0, lineno - 5):lineno])
                has_confirmation = any(
                    re.search(p, chunk, re.IGNORECASE)
                    for p in [r"confirm", r"approve", r"if\s+.*user", r"await\s+.*confirm"]
                )
                
                if not has_confirmation:
                    self.issues.append(Issue(
                        rule_id="FK004",
                        category="side_effect_unconfirmed",
                        severity="warning",
                        message=f"Destructive operation '{call_str}' without user confirmation",
                        recommendation="Add user confirmation before destructive operations",
                        line=lineno - 1,
                        column=col,
                        end_line=lineno - 1,
                        end_column=col + len(call_str),
                        code=call_str,
                    ))
                
                break
    
    def check_secret(self, var_name: str, value: str, lineno: int, col: int) -> None:
        """Check for hardcoded secrets."""
        for pattern, name in SECRET_PATTERNS:
            if re.search(pattern, var_name):
                # Check if value looks like a real secret
                if len(value) > 10 and not value.startswith("${") and not value.startswith("{{"):
                    self.issues.append(Issue(
                        rule_id="FK003",
                        category="security",
                        severity="error",
                        message=f"Potential hardcoded {name} in '{var_name}'",
                        recommendation=f"Use environment variables: os.environ.get('{var_name.upper()}')",
                        line=lineno - 1,
                        column=col,
                        end_line=lineno - 1,
                        end_column=col + len(var_name),
                        code=var_name,
                    ))
                    break


def analyze_document(source: str, uri: str) -> AnalysisResult:
    """Analyze Python source code for F.A.I.L. Kit issues."""
    result = AnalysisResult()
    
    # Skip test files
    if "_test.py" in uri or "test_" in uri or "/tests/" in uri:
        return result
    
    try:
        tree = ast.parse(source)
    except SyntaxError:
        # Can't parse - return empty result
        return result
    
    visitor = FailKitVisitor(source, uri)
    visitor.visit(tree)
    
    result.issues = visitor.issues
    result.tool_calls = visitor.tool_calls
    result.llm_calls = visitor.llm_calls
    result.agent_calls = visitor.agent_calls
    
    return result
