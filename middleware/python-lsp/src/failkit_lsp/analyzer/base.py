"""
Base Analyzer Module

Defines core types and base class for all F.A.I.L. Kit analyzers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, List, Optional
import re


class IssueSeverity(Enum):
    """Severity levels for detected issues."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"
    HINT = "hint"


class IssueCategory(Enum):
    """Categories for detected issues."""
    RECEIPT = "receipt"
    ERROR_HANDLING = "error_handling"
    SECURITY = "security"
    RESILIENCE = "resilience"
    PROVENANCE = "provenance"
    SIDE_EFFECT = "side_effect"
    AGENT_SAFETY = "agent_safety"


@dataclass
class Issue:
    """Represents a detected issue in the code."""
    rule_id: str
    message: str
    severity: IssueSeverity
    category: IssueCategory
    line: int
    column: int
    end_line: int
    end_column: int
    file_path: str
    source: str = "failkit"
    data: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert issue to dictionary for serialization."""
        return {
            "rule_id": self.rule_id,
            "message": self.message,
            "severity": self.severity.value,
            "category": self.category.value,
            "line": self.line,
            "column": self.column,
            "end_line": self.end_line,
            "end_column": self.end_column,
            "file_path": self.file_path,
            "source": self.source,
            "data": self.data,
        }


class BaseAnalyzer(ABC):
    """
    Abstract base class for all F.A.I.L. Kit analyzers.
    
    Subclasses implement framework-specific analysis logic.
    """
    
    def __init__(self, file_path: str, source_code: str):
        self.file_path = file_path
        self.source_code = source_code
        self.lines = source_code.splitlines()
        self.issues: List[Issue] = []
    
    @abstractmethod
    def analyze(self) -> List[Issue]:
        """
        Analyze the source code and return detected issues.
        
        Returns:
            List of Issue objects representing detected problems.
        """
        pass
    
    @abstractmethod
    def get_framework_name(self) -> str:
        """Return the name of the framework this analyzer targets."""
        pass
    
    def get_line_at(self, line_number: int) -> str:
        """Get the content of a specific line (0-indexed)."""
        if 0 <= line_number < len(self.lines):
            return self.lines[line_number]
        return ""
    
    def get_line_column(self, position: int) -> tuple[int, int]:
        """
        Convert a character position to line and column numbers (0-indexed).
        
        Args:
            position: Character position in the source code.
        
        Returns:
            Tuple of (line, column).
        """
        line = 0
        col = position
        for i, line_text in enumerate(self.lines):
            if col <= len(line_text):
                return (i, col)
            col -= len(line_text) + 1  # +1 for newline
            line = i + 1
        return (line, 0)
    
    def has_disable_comment(self, line_number: int) -> bool:
        """Check if a line has a F.A.I.L. Kit disable comment."""
        line = self.get_line_at(line_number)
        prev_line = self.get_line_at(line_number - 1) if line_number > 0 else ""
        combined = prev_line + line
        
        disable_patterns = [
            r"fail-kit-disable",
            r"failkit-ignore",
            r"# noqa: FK\d+",
            r"# type: ignore\[failkit\]",
        ]
        
        return any(re.search(p, combined, re.IGNORECASE) for p in disable_patterns)
    
    def find_pattern_matches(self, pattern: str, flags: int = 0) -> List[tuple[int, int, re.Match]]:
        """
        Find all matches of a regex pattern in the source code.
        
        Args:
            pattern: Regex pattern to search for.
            flags: Regex flags.
        
        Returns:
            List of (line, column, match) tuples.
        """
        matches = []
        for match in re.finditer(pattern, self.source_code, flags):
            line, col = self.get_line_column(match.start())
            matches.append((line, col, match))
        return matches
    
    def is_in_string_literal(self, position: int) -> bool:
        """Check if a position is inside a string literal."""
        # Simple heuristic: count quotes before position
        before = self.source_code[:position]
        single_quotes = before.count("'") - before.count("\\'")
        double_quotes = before.count('"') - before.count('\\"')
        triple_single = before.count("'''")
        triple_double = before.count('"""')
        
        # If odd number of unescaped quotes, we're inside a string
        return (single_quotes - triple_single * 3) % 2 != 0 or \
               (double_quotes - triple_double * 3) % 2 != 0
    
    def is_in_comment(self, line_number: int, column: int) -> bool:
        """Check if a position is inside a comment."""
        line = self.get_line_at(line_number)
        hash_pos = line.find("#")
        return hash_pos != -1 and column >= hash_pos
    
    def add_issue(
        self,
        rule_id: str,
        message: str,
        severity: IssueSeverity,
        category: IssueCategory,
        line: int,
        column: int,
        end_line: Optional[int] = None,
        end_column: Optional[int] = None,
        data: Optional[dict] = None
    ) -> None:
        """Add an issue to the list of detected issues."""
        if self.has_disable_comment(line):
            return
        
        self.issues.append(Issue(
            rule_id=rule_id,
            message=message,
            severity=severity,
            category=category,
            line=line,
            column=column,
            end_line=end_line if end_line is not None else line,
            end_column=end_column if end_column is not None else column + 1,
            file_path=self.file_path,
            data=data or {}
        ))
    
    def has_error_handling_nearby(self, line_number: int, search_range: int = 10) -> bool:
        """Check if there's error handling (try/except) near a line."""
        start = max(0, line_number - search_range)
        end = min(len(self.lines), line_number + search_range)
        
        context = "\n".join(self.lines[start:end])
        
        patterns = [
            r"\btry\s*:",
            r"\bexcept\s*",
            r"\.catch\s*\(",
            r"handle_parsing_errors",
            r"on_error",
            r"error_handler",
        ]
        
        return any(re.search(p, context) for p in patterns)
    
    def has_receipt_nearby(self, line_number: int, search_range: int = 15) -> bool:
        """Check if there's receipt generation near a line."""
        start = max(0, line_number - search_range)
        end = min(len(self.lines), line_number + search_range)
        
        context = "\n".join(self.lines[start:end])
        
        patterns = [
            r"create_receipt",
            r"generate_receipt",
            r"ReceiptGeneratingTool",
            r"action_id\s*[=:]",
            r"input_hash\s*[=:]",
            r"output_hash\s*[=:]",
            r"hash_data\s*\(",
            r"AuditLogger\.",
            r"failkit\.",
        ]
        
        return any(re.search(p, context, re.IGNORECASE) for p in patterns)
