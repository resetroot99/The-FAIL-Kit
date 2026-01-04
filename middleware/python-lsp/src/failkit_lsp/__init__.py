"""
F.A.I.L. Kit Python LSP Server

A Language Server Protocol implementation for auditing Python AI agent code.
Supports LangChain, CrewAI, AutoGen, and generic Python agent patterns.
"""

__version__ = "1.0.0"
__author__ = "v3ctor"

from .server import FailKitLanguageServer

__all__ = ["FailKitLanguageServer", "__version__"]
