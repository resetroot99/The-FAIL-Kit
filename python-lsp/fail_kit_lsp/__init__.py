"""
F.A.I.L. Kit Language Server for Python

Forensic Analysis of Intelligent Logic for Python AI agent frameworks.
Supports LangChain, CrewAI, AutoGen, and other Python AI frameworks.
"""

__version__ = "1.0.0"
__author__ = "F.A.I.L. Kit Team"

from .server import FailKitLanguageServer
from .analyzer import analyze_document, Issue, AnalysisResult
from .patterns import TOOL_PATTERNS, LLM_PATTERNS, AGENT_PATTERNS
from .fixers import get_fix_for_issue, AutoFix

__all__ = [
    "FailKitLanguageServer",
    "analyze_document",
    "Issue",
    "AnalysisResult",
    "TOOL_PATTERNS",
    "LLM_PATTERNS",
    "AGENT_PATTERNS",
    "get_fix_for_issue",
    "AutoFix",
]
