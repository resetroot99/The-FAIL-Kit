"""
CrewAI Analyzer

Detects F.A.I.L. Kit issues specific to CrewAI Python code.
"""

import re
from typing import List

from .base import BaseAnalyzer, Issue, IssueSeverity, IssueCategory


class CrewAIAnalyzer(BaseAnalyzer):
    """
    Analyzer for CrewAI Python code.
    
    Detects:
    - Crew.kickoff() calls without receipts
    - Task definitions without error handlers
    - Agent configurations missing memory settings
    - Tool usage without receipt generation
    """
    
    def get_framework_name(self) -> str:
        return "crewai"
    
    def analyze(self) -> List[Issue]:
        """Analyze CrewAI code for F.A.I.L. Kit issues."""
        self.issues = []
        
        # Check if this file uses CrewAI
        if not self._is_crewai_file():
            return self.issues
        
        self._check_crew_kickoff()
        self._check_task_definitions()
        self._check_agent_configurations()
        self._check_tool_usage()
        
        return self.issues
    
    def _is_crewai_file(self) -> bool:
        """Check if the file imports CrewAI modules."""
        crewai_imports = [
            r"from\s+crewai",
            r"import\s+crewai",
        ]
        return any(re.search(p, self.source_code) for p in crewai_imports)
    
    def _check_crew_kickoff(self) -> None:
        """Check for Crew.kickoff() calls without receipts or error handling."""
        kickoff_patterns = [
            r"""crew\.kickoff\s*\(""",
            r"""Crew\s*\([^)]*\)\.kickoff\s*\(""",
            r"""\.kickoff_async\s*\(""",
            r"""\.kickoff_for_each\s*\(""",
        ]
        
        for pattern in kickoff_patterns:
            for match in re.finditer(pattern, self.source_code, re.IGNORECASE):
                line, col = self.get_line_column(match.start())
                
                if self.is_in_comment(line, col):
                    continue
                
                # Check for receipt generation
                if not self.has_receipt_nearby(line):
                    self.add_issue(
                        rule_id="FK001",
                        message="Crew.kickoff() call without receipt generation. "
                                "Capture and log task execution results for audit trail.",
                        severity=IssueSeverity.ERROR,
                        category=IssueCategory.RECEIPT,
                        line=line,
                        column=col,
                        end_column=col + len(match.group()),
                        data={"pattern": "crew_kickoff", "framework": "crewai"},
                    )
                
                # Check for error handling
                if not self.has_error_handling_nearby(line):
                    self.add_issue(
                        rule_id="FK002",
                        message="Crew.kickoff() call without error handling. "
                                "Wrap in try/except to handle agent or task failures.",
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.ERROR_HANDLING,
                        line=line,
                        column=col,
                        end_column=col + len(match.group()),
                        data={"pattern": "crew_kickoff", "framework": "crewai"},
                    )
    
    def _check_task_definitions(self) -> None:
        """Check for Task definitions without error handlers."""
        task_pattern = r"""Task\s*\(\s*"""
        
        for match in re.finditer(task_pattern, self.source_code):
            line, col = self.get_line_column(match.start())
            
            if self.is_in_comment(line, col):
                continue
            
            # Get the Task constructor arguments
            task_args = self._get_constructor_args(match.end())
            
            # Check for error handler configuration
            if not self._has_error_handler_config(task_args):
                self.add_issue(
                    rule_id="FK008",
                    message="CrewAI Task definition without error handler. "
                            "Consider adding on_error or callback for failure handling.",
                    severity=IssueSeverity.WARNING,
                    category=IssueCategory.ERROR_HANDLING,
                    line=line,
                    column=col,
                    data={"pattern": "task_definition", "framework": "crewai"},
                )
            
            # Check for output configuration (for receipt generation)
            if not self._has_output_config(task_args):
                self.add_issue(
                    rule_id="FK001",
                    message="CrewAI Task without output configuration. "
                            "Add expected_output or output_pydantic for structured results.",
                    severity=IssueSeverity.INFO,
                    category=IssueCategory.RECEIPT,
                    line=line,
                    column=col,
                    data={"pattern": "task_definition", "framework": "crewai"},
                )
    
    def _check_agent_configurations(self) -> None:
        """Check for Agent configurations missing important settings."""
        agent_pattern = r"""Agent\s*\(\s*"""
        
        for match in re.finditer(agent_pattern, self.source_code):
            line, col = self.get_line_column(match.start())
            
            if self.is_in_comment(line, col):
                continue
            
            # Get the Agent constructor arguments
            agent_args = self._get_constructor_args(match.end())
            
            # Check for memory configuration
            if "memory" not in agent_args.lower():
                self.add_issue(
                    rule_id="FK006",
                    message="CrewAI Agent without memory configuration. "
                            "Consider adding memory=True for context retention and audit trail.",
                    severity=IssueSeverity.INFO,
                    category=IssueCategory.PROVENANCE,
                    line=line,
                    column=col,
                    data={"pattern": "agent_definition", "framework": "crewai"},
                )
            
            # Check for verbose mode in production-like code
            if "verbose=True" in agent_args or "verbose = True" in agent_args:
                # Check if this is likely a test file
                if not self._is_test_file():
                    self.add_issue(
                        rule_id="FK003",
                        message="CrewAI Agent with verbose=True may expose sensitive information in logs.",
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.SECURITY,
                        line=line,
                        column=col,
                        data={"pattern": "agent_verbose", "framework": "crewai"},
                    )
    
    def _check_tool_usage(self) -> None:
        """Check for tool definitions in CrewAI context."""
        # Check for @tool decorator usage in CrewAI context
        tool_decorator_pattern = r"""@tool\s*(?:\([^)]*\))?\s*\n\s*(?:async\s+)?def\s+(\w+)"""
        
        for match in re.finditer(tool_decorator_pattern, self.source_code):
            line, col = self.get_line_column(match.start())
            tool_name = match.group(1)
            
            if self.is_in_comment(line, col):
                continue
            
            # Get tool body
            tool_body = self._get_function_body(match.end())
            
            # Check for side effects without confirmation
            if self._has_destructive_operation(tool_body):
                if not self._has_confirmation_check(tool_body):
                    self.add_issue(
                        rule_id="FK004",
                        message=f"Tool '{tool_name}' performs destructive operations without confirmation. "
                                "Add user confirmation or policy check before executing.",
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.SIDE_EFFECT,
                        line=line,
                        column=col,
                        data={"tool_name": tool_name, "framework": "crewai"},
                    )
    
    def _get_constructor_args(self, start_pos: int) -> str:
        """Extract constructor arguments as a string."""
        # Find matching parenthesis
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
    
    def _get_function_body(self, start_pos: int, max_lines: int = 50) -> str:
        """Extract function body starting from a position."""
        line_start, _ = self.get_line_column(start_pos)
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
    
    def _has_error_handler_config(self, args: str) -> bool:
        """Check if Task has error handling configuration."""
        error_patterns = [
            r"on_error\s*=",
            r"callback\s*=",
            r"error_callback\s*=",
            r"async_execution\s*=\s*False",  # Sync execution allows try/except wrapper
        ]
        return any(re.search(p, args, re.IGNORECASE) for p in error_patterns)
    
    def _has_output_config(self, args: str) -> bool:
        """Check if Task has output configuration."""
        output_patterns = [
            r"expected_output\s*=",
            r"output_pydantic\s*=",
            r"output_json\s*=",
            r"output_file\s*=",
        ]
        return any(re.search(p, args, re.IGNORECASE) for p in output_patterns)
    
    def _has_destructive_operation(self, code: str) -> bool:
        """Check if code contains destructive operations."""
        destructive_patterns = [
            r"\.delete\s*\(",
            r"\.remove\s*\(",
            r"\.destroy\s*\(",
            r"\.drop\s*\(",
            r"\.truncate\s*\(",
            r"os\.remove\s*\(",
            r"shutil\.rmtree\s*\(",
            r"requests\.delete\s*\(",
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
        ]
        return any(re.search(p, code, re.IGNORECASE) for p in confirm_patterns)
    
    def _is_test_file(self) -> bool:
        """Check if current file is a test file."""
        test_indicators = [
            r"test_",
            r"_test\.py",
            r"tests/",
            r"__tests__/",
            r"\.spec\.py",
        ]
        return any(re.search(p, self.file_path, re.IGNORECASE) for p in test_indicators)
