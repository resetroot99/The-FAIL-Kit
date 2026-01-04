"""
F.A.I.L. Kit Python Analyzers

Framework-specific and generic analyzers for Python AI agent code.
"""

from .base import BaseAnalyzer, Issue, IssueSeverity, IssueCategory
from .patterns import (
    PYTHON_PATTERNS,
    PatternMatcher,
    Pattern,
    PatternType,
    SECRET_PATTERNS,
    LLM_PATTERNS,
    TOOL_PATTERNS,
    SIDE_EFFECT_PATTERNS,
    RESILIENCE_PATTERNS,
    RECEIPT_PATTERNS,
    ERROR_HANDLING_PATTERNS,
)
from .langchain import LangChainAnalyzer
from .crewai import CrewAIAnalyzer
from .autogen import AutoGenAnalyzer

__all__ = [
    # Base classes
    "BaseAnalyzer",
    "Issue",
    "IssueSeverity",
    "IssueCategory",
    # Patterns
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
    # Framework analyzers
    "LangChainAnalyzer",
    "CrewAIAnalyzer",
    "AutoGenAnalyzer",
]
