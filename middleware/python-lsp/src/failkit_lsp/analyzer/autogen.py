"""
AutoGen Analyzer

Detects F.A.I.L. Kit issues specific to Microsoft AutoGen Python code.
"""

import re
from typing import List

from .base import BaseAnalyzer, Issue, IssueSeverity, IssueCategory


class AutoGenAnalyzer(BaseAnalyzer):
    """
    Analyzer for Microsoft AutoGen Python code.
    
    Detects:
    - UserProxyAgent/AssistantAgent configurations
    - initiate_chat() calls without termination conditions
    - Function tool definitions without receipts
    - Missing max_turns or termination messages
    """
    
    def get_framework_name(self) -> str:
        return "autogen"
    
    def analyze(self) -> List[Issue]:
        """Analyze AutoGen code for F.A.I.L. Kit issues."""
        self.issues = []
        
        # Check if this file uses AutoGen
        if not self._is_autogen_file():
            return self.issues
        
        self._check_agent_configurations()
        self._check_initiate_chat_calls()
        self._check_function_definitions()
        self._check_group_chat_config()
        
        return self.issues
    
    def _is_autogen_file(self) -> bool:
        """Check if the file imports AutoGen modules."""
        autogen_imports = [
            r"from\s+autogen",
            r"import\s+autogen",
            r"from\s+pyautogen",
            r"import\s+pyautogen",
        ]
        return any(re.search(p, self.source_code) for p in autogen_imports)
    
    def _check_agent_configurations(self) -> None:
        """Check for agent configurations with potential issues."""
        agent_patterns = [
            (r"""UserProxyAgent\s*\(""", "UserProxyAgent"),
            (r"""AssistantAgent\s*\(""", "AssistantAgent"),
            (r"""ConversableAgent\s*\(""", "ConversableAgent"),
        ]
        
        for pattern, agent_type in agent_patterns:
            for match in re.finditer(pattern, self.source_code):
                line, col = self.get_line_column(match.start())
                
                if self.is_in_comment(line, col):
                    continue
                
                # Get constructor arguments
                agent_args = self._get_constructor_args(match.end())
                
                # Check for human_input_mode configuration
                if agent_type == "UserProxyAgent":
                    if "human_input_mode" not in agent_args:
                        self.add_issue(
                            rule_id="FK009",
                            message="UserProxyAgent without human_input_mode configuration. "
                                    "Set to 'NEVER', 'TERMINATE', or 'ALWAYS' explicitly.",
                            severity=IssueSeverity.WARNING,
                            category=IssueCategory.AGENT_SAFETY,
                            line=line,
                            column=col,
                            data={"agent_type": agent_type, "framework": "autogen"},
                        )
                
                # Check for code_execution_config with potential security issues
                if "code_execution_config" in agent_args:
                    if "use_docker" not in agent_args.lower():
                        self.add_issue(
                            rule_id="FK003",
                            message=f"{agent_type} with code execution but no Docker isolation configured. "
                                    "Consider setting use_docker=True for safe code execution.",
                            severity=IssueSeverity.WARNING,
                            category=IssueCategory.SECURITY,
                            line=line,
                            column=col,
                            data={"agent_type": agent_type, "framework": "autogen"},
                        )
                
                # Check for max_consecutive_auto_reply
                if "max_consecutive_auto_reply" not in agent_args:
                    self.add_issue(
                        rule_id="FK009",
                        message=f"{agent_type} without max_consecutive_auto_reply limit. "
                                "Set a limit to prevent infinite conversation loops.",
                        severity=IssueSeverity.INFO,
                        category=IssueCategory.AGENT_SAFETY,
                        line=line,
                        column=col,
                        data={"agent_type": agent_type, "framework": "autogen"},
                    )
    
    def _check_initiate_chat_calls(self) -> None:
        """Check for initiate_chat() calls without proper configuration."""
        chat_patterns = [
            r"""\.initiate_chat\s*\(""",
            r"""\.initiate_chats\s*\(""",
            r"""\.a_initiate_chat\s*\(""",
        ]
        
        for pattern in chat_patterns:
            for match in re.finditer(pattern, self.source_code):
                line, col = self.get_line_column(match.start())
                
                if self.is_in_comment(line, col):
                    continue
                
                # Get the chat arguments
                chat_args = self._get_constructor_args(match.end())
                
                # Check for max_turns configuration
                if "max_turns" not in chat_args:
                    self.add_issue(
                        rule_id="FK009",
                        message="initiate_chat() without max_turns limit. "
                                "Set max_turns to prevent runaway conversations.",
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.AGENT_SAFETY,
                        line=line,
                        column=col,
                        end_column=col + len(match.group()),
                        data={"pattern": "initiate_chat", "framework": "autogen"},
                    )
                
                # Check for error handling
                if not self.has_error_handling_nearby(line):
                    self.add_issue(
                        rule_id="FK002",
                        message="initiate_chat() call without error handling. "
                                "Wrap in try/except to handle conversation failures.",
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.ERROR_HANDLING,
                        line=line,
                        column=col,
                        end_column=col + len(match.group()),
                        data={"pattern": "initiate_chat", "framework": "autogen"},
                    )
                
                # Check for receipt/logging
                if not self.has_receipt_nearby(line):
                    self.add_issue(
                        rule_id="FK001",
                        message="initiate_chat() without audit logging. "
                                "Log conversation results for audit trail.",
                        severity=IssueSeverity.ERROR,
                        category=IssueCategory.RECEIPT,
                        line=line,
                        column=col,
                        end_column=col + len(match.group()),
                        data={"pattern": "initiate_chat", "framework": "autogen"},
                    )
    
    def _check_function_definitions(self) -> None:
        """Check for function tools registered with AutoGen agents."""
        # Check for register_for_execution pattern
        register_patterns = [
            r"""@\w+\.register_for_execution\s*\(\s*\)""",
            r"""@\w+\.register_for_llm\s*\(""",
            r"""register_function\s*\(""",
        ]
        
        for pattern in register_patterns:
            for match in re.finditer(pattern, self.source_code):
                line, col = self.get_line_column(match.start())
                
                if self.is_in_comment(line, col):
                    continue
                
                # Get the function body (if it's a decorator, get following function)
                if match.group().startswith("@"):
                    func_body = self._get_decorated_function_body(match.end())
                else:
                    func_body = self._get_surrounding_context(line, 20)
                
                # Check for receipt generation in function
                if not self._has_receipt_in_code(func_body):
                    self.add_issue(
                        rule_id="FK001",
                        message="AutoGen registered function without receipt generation. "
                                "Add audit logging for function executions.",
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.RECEIPT,
                        line=line,
                        column=col,
                        data={"pattern": "registered_function", "framework": "autogen"},
                    )
                
                # Check for destructive operations
                if self._has_destructive_operation(func_body):
                    if not self._has_confirmation_check(func_body):
                        self.add_issue(
                            rule_id="FK004",
                            message="AutoGen registered function with destructive operations lacks confirmation. "
                                    "Add user confirmation before executing destructive actions.",
                            severity=IssueSeverity.WARNING,
                            category=IssueCategory.SIDE_EFFECT,
                            line=line,
                            column=col,
                            data={"pattern": "destructive_function", "framework": "autogen"},
                        )
    
    def _check_group_chat_config(self) -> None:
        """Check for GroupChat configurations."""
        group_chat_pattern = r"""GroupChat\s*\("""
        
        for match in re.finditer(group_chat_pattern, self.source_code):
            line, col = self.get_line_column(match.start())
            
            if self.is_in_comment(line, col):
                continue
            
            chat_args = self._get_constructor_args(match.end())
            
            # Check for max_round configuration
            if "max_round" not in chat_args:
                self.add_issue(
                    rule_id="FK009",
                    message="GroupChat without max_round limit. "
                            "Set max_round to prevent infinite group conversations.",
                    severity=IssueSeverity.WARNING,
                    category=IssueCategory.AGENT_SAFETY,
                    line=line,
                    column=col,
                    data={"pattern": "group_chat", "framework": "autogen"},
                )
            
            # Check for admin_name configuration
            if "admin_name" not in chat_args:
                self.add_issue(
                    rule_id="FK006",
                    message="GroupChat without admin_name. "
                            "Set admin_name for better conversation provenance tracking.",
                    severity=IssueSeverity.INFO,
                    category=IssueCategory.PROVENANCE,
                    line=line,
                    column=col,
                    data={"pattern": "group_chat", "framework": "autogen"},
                )
    
    def _get_constructor_args(self, start_pos: int) -> str:
        """Extract constructor arguments as a string."""
        depth = 1
        end_pos = start_pos
        
        while depth > 0 and end_pos < len(self.source_code):
            char = self.source_code[end_pos]
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
            end_pos += 1
        
        return self.source_code[start_pos:end_pos - 1]
    
    def _get_decorated_function_body(self, decorator_end: int, max_lines: int = 50) -> str:
        """Get the body of a function following a decorator."""
        # Find the next 'def' after the decorator
        remaining_code = self.source_code[decorator_end:]
        def_match = re.search(r"\ndef\s+\w+\s*\([^)]*\)\s*:", remaining_code)
        
        if not def_match:
            return ""
        
        func_start = decorator_end + def_match.end()
        line_start, _ = self.get_line_column(func_start)
        
        return self._get_function_body_from_line(line_start, max_lines)
    
    def _get_function_body_from_line(self, line_start: int, max_lines: int = 50) -> str:
        """Get function body starting from a line number."""
        end_line = min(line_start + max_lines, len(self.lines))
        
        if line_start >= len(self.lines):
            return ""
        
        first_line = self.lines[line_start] if line_start < len(self.lines) else ""
        base_indent = len(first_line) - len(first_line.lstrip())
        
        body_lines = []
        for i in range(line_start + 1, end_line):
            line = self.lines[i]
            if line.strip() and not line.startswith(" " * (base_indent + 1)):
                break
            body_lines.append(line)
        
        return "\n".join(body_lines)
    
    def _get_surrounding_context(self, line_number: int, context_lines: int = 10) -> str:
        """Get surrounding context around a line."""
        start = max(0, line_number - context_lines)
        end = min(len(self.lines), line_number + context_lines)
        return "\n".join(self.lines[start:end])
    
    def _has_receipt_in_code(self, code: str) -> bool:
        """Check if code contains receipt-related patterns."""
        receipt_indicators = [
            r"create_receipt",
            r"generate_receipt",
            r"hash_data",
            r"action_id\s*[=:]",
            r"input_hash",
            r"output_hash",
            r"\.log(?:Receipt|Action|Event)",
            r"AuditLogger",
        ]
        return any(re.search(p, code, re.IGNORECASE) for p in receipt_indicators)
    
    def _has_destructive_operation(self, code: str) -> bool:
        """Check if code contains destructive operations."""
        destructive_patterns = [
            r"\.delete\s*\(",
            r"\.remove\s*\(",
            r"\.destroy\s*\(",
            r"\.drop\s*\(",
            r"os\.remove\s*\(",
            r"shutil\.rmtree\s*\(",
            r"subprocess\.(?:run|call)\s*\(",
            r"os\.system\s*\(",
        ]
        return any(re.search(p, code) for p in destructive_patterns)
    
    def _has_confirmation_check(self, code: str) -> bool:
        """Check if code has confirmation/authorization checks."""
        confirm_patterns = [
            r"confirm\s*\(",
            r"confirm_action",
            r"is_authorized",
            r"has_permission",
            r"policy\.allow",
            r"user_confirm",
            r"human_input",
        ]
        return any(re.search(p, code, re.IGNORECASE) for p in confirm_patterns)
