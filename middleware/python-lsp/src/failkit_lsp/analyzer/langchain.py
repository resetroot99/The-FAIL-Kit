"""
LangChain Analyzer

Detects F.A.I.L. Kit issues specific to LangChain Python code.
"""

import re
from typing import List

from .base import BaseAnalyzer, Issue, IssueSeverity, IssueCategory
from .patterns import (
    PatternMatcher,
    RECEIPT_PATTERNS,
    ERROR_HANDLING_PATTERNS,
    RESILIENCE_PATTERNS,
)


class LangChainAnalyzer(BaseAnalyzer):
    """
    Analyzer for LangChain Python code.
    
    Detects:
    - AgentExecutor calls without receipts
    - Tool definitions without ReceiptGeneratingTool
    - Chain invocations without error handling
    - Missing resilience patterns in LLM calls
    """
    
    def get_framework_name(self) -> str:
        return "langchain"
    
    def analyze(self) -> List[Issue]:
        """Analyze LangChain code for F.A.I.L. Kit issues."""
        self.issues = []
        
        # Check if this file uses LangChain
        if not self._is_langchain_file():
            return self.issues
        
        self._check_agent_executor_calls()
        self._check_tool_definitions()
        self._check_chain_invocations()
        self._check_llm_calls()
        self._check_runnable_invocations()
        
        return self.issues
    
    def _is_langchain_file(self) -> bool:
        """Check if the file imports LangChain modules."""
        langchain_imports = [
            r"from\s+langchain",
            r"import\s+langchain",
            r"from\s+langchain_core",
            r"from\s+langchain_community",
            r"from\s+langgraph",
        ]
        return any(re.search(p, self.source_code) for p in langchain_imports)
    
    def _check_agent_executor_calls(self) -> None:
        """Check for AgentExecutor.invoke() calls without receipts."""
        patterns = [
            r"""agent_executor\.invoke\s*\(""",
            r"""agent_executor\.ainvoke\s*\(""",
            r"""AgentExecutor\s*\([^)]*\)\.invoke\s*\(""",
            r"""AgentExecutor\s*\([^)]*\)\.ainvoke\s*\(""",
            r"""executor\.invoke\s*\(""",
            r"""executor\.run\s*\(""",
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, self.source_code, re.IGNORECASE):
                line, col = self.get_line_column(match.start())
                
                if self.is_in_comment(line, col):
                    continue
                
                # Check for receipt generation nearby
                if not self.has_receipt_nearby(line):
                    self.add_issue(
                        rule_id="FK001",
                        message="AgentExecutor invocation without receipt generation. "
                                "Use extract_receipts_from_agent_executor() or ReceiptGeneratingTool.",
                        severity=IssueSeverity.ERROR,
                        category=IssueCategory.RECEIPT,
                        line=line,
                        column=col,
                        end_column=col + len(match.group()),
                        data={"pattern": "agent_executor_invoke", "framework": "langchain"},
                    )
                
                # Check for error handling
                if not self.has_error_handling_nearby(line):
                    self.add_issue(
                        rule_id="FK002",
                        message="AgentExecutor invocation without error handling. "
                                "Wrap in try/except to handle LLM or tool failures.",
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.ERROR_HANDLING,
                        line=line,
                        column=col,
                        end_column=col + len(match.group()),
                        data={"pattern": "agent_executor_invoke", "framework": "langchain"},
                    )
    
    def _check_tool_definitions(self) -> None:
        """Check for tool definitions that don't use ReceiptGeneratingTool."""
        # Check for @tool decorator usage
        tool_decorator_pattern = r"""@tool\s*(?:\([^)]*\))?\s*\n\s*(?:async\s+)?def\s+(\w+)"""
        
        for match in re.finditer(tool_decorator_pattern, self.source_code):
            line, col = self.get_line_column(match.start())
            tool_name = match.group(1)
            
            if self.is_in_comment(line, col):
                continue
            
            # Check if this tool has receipt generation
            tool_body = self._get_function_body(match.end())
            if not self._has_receipt_in_code(tool_body):
                self.add_issue(
                    rule_id="FK001",
                    message=f"Tool '{tool_name}' defined with @tool decorator but lacks receipt generation. "
                            "Consider using ReceiptGeneratingTool or manually generating receipts.",
                    severity=IssueSeverity.WARNING,
                    category=IssueCategory.RECEIPT,
                    line=line,
                    column=col,
                    data={"tool_name": tool_name, "framework": "langchain"},
                )
        
        # Check for BaseTool subclasses
        basetool_pattern = r"""class\s+(\w+)\s*\(\s*BaseTool\s*\)"""
        
        for match in re.finditer(basetool_pattern, self.source_code):
            line, col = self.get_line_column(match.start())
            class_name = match.group(1)
            
            if self.is_in_comment(line, col):
                continue
            
            # Check if it inherits from ReceiptGeneratingTool
            if "ReceiptGeneratingTool" not in self.source_code:
                class_body = self._get_class_body(match.end())
                if not self._has_receipt_in_code(class_body):
                    self.add_issue(
                        rule_id="FK001",
                        message=f"Tool class '{class_name}' extends BaseTool but doesn't use ReceiptGeneratingTool. "
                                "Extend ReceiptGeneratingTool instead for automatic receipt generation.",
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.RECEIPT,
                        line=line,
                        column=col,
                        data={"class_name": class_name, "framework": "langchain"},
                    )
    
    def _check_chain_invocations(self) -> None:
        """Check for chain invocations without error handling."""
        chain_patterns = [
            r"""chain\.invoke\s*\(""",
            r"""chain\.ainvoke\s*\(""",
            r"""\.pipe\s*\([^)]+\)\.invoke\s*\(""",
            r"""RunnableSequence\s*\([^)]*\)\.invoke\s*\(""",
        ]
        
        for pattern in chain_patterns:
            for match in re.finditer(pattern, self.source_code):
                line, col = self.get_line_column(match.start())
                
                if self.is_in_comment(line, col):
                    continue
                
                if not self.has_error_handling_nearby(line):
                    self.add_issue(
                        rule_id="FK002",
                        message="Chain invocation without error handling. "
                                "Wrap in try/except to handle potential failures.",
                        severity=IssueSeverity.WARNING,
                        category=IssueCategory.ERROR_HANDLING,
                        line=line,
                        column=col,
                        end_column=col + len(match.group()),
                        data={"pattern": "chain_invoke", "framework": "langchain"},
                    )
    
    def _check_llm_calls(self) -> None:
        """Check for LLM calls without resilience patterns."""
        llm_patterns = [
            r"""llm\.invoke\s*\(""",
            r"""llm\.ainvoke\s*\(""",
            r"""chat_model\.invoke\s*\(""",
            r"""ChatOpenAI\s*\([^)]*\)\.invoke\s*\(""",
            r"""ChatAnthropic\s*\([^)]*\)\.invoke\s*\(""",
        ]
        
        for pattern in llm_patterns:
            for match in re.finditer(pattern, self.source_code):
                line, col = self.get_line_column(match.start())
                
                if self.is_in_comment(line, col):
                    continue
                
                # Check for resilience patterns
                matcher = PatternMatcher(self.source_code)
                if not matcher.has_pattern_nearby(RESILIENCE_PATTERNS, line, search_range=20):
                    self.add_issue(
                        rule_id="FK005",
                        message="LLM call without resilience patterns. "
                                "Consider adding timeout, retry, or fallback configuration.",
                        severity=IssueSeverity.INFO,
                        category=IssueCategory.RESILIENCE,
                        line=line,
                        column=col,
                        end_column=col + len(match.group()),
                        data={"pattern": "llm_invoke", "framework": "langchain"},
                    )
    
    def _check_runnable_invocations(self) -> None:
        """Check for Runnable invocations (LangChain Expression Language)."""
        runnable_patterns = [
            r"""\.invoke\s*\(\s*\{""",
            r"""\.batch\s*\(\s*\[""",
            r"""\.stream\s*\(""",
            r"""\.astream\s*\(""",
        ]
        
        for pattern in runnable_patterns:
            for match in re.finditer(pattern, self.source_code):
                line, col = self.get_line_column(match.start())
                
                if self.is_in_comment(line, col):
                    continue
                
                # Check context to see if it's a significant operation
                context_start = max(0, match.start() - 100)
                context = self.source_code[context_start:match.start()]
                
                # Skip if it's just a simple getter or configuration
                if re.search(r"(config|settings|options)\.", context, re.IGNORECASE):
                    continue
                
                if not self.has_error_handling_nearby(line, search_range=5):
                    # Only warn for stream operations without error handling
                    if "stream" in match.group().lower():
                        self.add_issue(
                            rule_id="FK002",
                            message="Streaming operation without error handling. "
                                    "Handle potential connection or parsing errors.",
                            severity=IssueSeverity.INFO,
                            category=IssueCategory.ERROR_HANDLING,
                            line=line,
                            column=col,
                            end_column=col + len(match.group()),
                            data={"pattern": "stream_invoke", "framework": "langchain"},
                        )
    
    def _get_function_body(self, start_pos: int, max_lines: int = 50) -> str:
        """Extract function body starting from a position."""
        # Simple heuristic: get next N lines until dedent
        line_start, _ = self.get_line_column(start_pos)
        end_line = min(line_start + max_lines, len(self.lines))
        
        if line_start >= len(self.lines):
            return ""
        
        # Find the indentation level of the function definition
        first_line = self.lines[line_start] if line_start < len(self.lines) else ""
        base_indent = len(first_line) - len(first_line.lstrip())
        
        body_lines = []
        for i in range(line_start + 1, end_line):
            line = self.lines[i]
            if line.strip() and not line.startswith(" " * (base_indent + 1)):
                break
            body_lines.append(line)
        
        return "\n".join(body_lines)
    
    def _get_class_body(self, start_pos: int, max_lines: int = 100) -> str:
        """Extract class body starting from a position."""
        return self._get_function_body(start_pos, max_lines)
    
    def _has_receipt_in_code(self, code: str) -> bool:
        """Check if code contains receipt-related patterns."""
        receipt_indicators = [
            r"create_receipt",
            r"generate_receipt",
            r"hash_data",
            r"action_id\s*[=:]",
            r"input_hash",
            r"output_hash",
            r"ReceiptGeneratingTool",
            r"\.log(?:Receipt|Action|Event)",
        ]
        return any(re.search(p, code, re.IGNORECASE) for p in receipt_indicators)
