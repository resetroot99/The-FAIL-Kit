"""
F.A.I.L. Kit Python Language Server

Main LSP server implementation using pygls.
Provides diagnostics, code actions, and hover information for Python AI agent code.
"""

import argparse
import logging
import re
from typing import List, Optional, Dict

from lsprotocol.types import (
    TEXT_DOCUMENT_CODE_ACTION,
    TEXT_DOCUMENT_DID_CHANGE,
    TEXT_DOCUMENT_DID_CLOSE,
    TEXT_DOCUMENT_DID_OPEN,
    TEXT_DOCUMENT_DID_SAVE,
    TEXT_DOCUMENT_HOVER,
    INITIALIZE,
    CodeAction,
    CodeActionOptions,
    CodeActionParams,
    Diagnostic,
    DidChangeTextDocumentParams,
    DidCloseTextDocumentParams,
    DidOpenTextDocumentParams,
    DidSaveTextDocumentParams,
    Hover,
    HoverParams,
    InitializeParams,
    InitializeResult,
    ServerCapabilities,
    TextDocumentSyncKind,
    TextDocumentSyncOptions,
)
from pygls.server import LanguageServer

from .analyzer import (
    BaseAnalyzer,
    Issue,
    LangChainAnalyzer,
    CrewAIAnalyzer,
    AutoGenAnalyzer,
    PatternMatcher,
    SECRET_PATTERNS,
    TOOL_PATTERNS,
    LLM_PATTERNS,
)
from .diagnostics import issues_to_diagnostics, get_diagnostic_info
from .code_actions import get_code_actions_for_diagnostic
from .hover import get_hover_for_position

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("failkit-lsp")


class FailKitLanguageServer(LanguageServer):
    """
    F.A.I.L. Kit Language Server for Python AI agent code.
    
    Provides:
    - Real-time diagnostics for LangChain, CrewAI, AutoGen
    - Code actions (quick fixes) for common issues
    - Hover information for F.A.I.L. Kit patterns
    """
    
    def __init__(self):
        super().__init__(
            name="failkit-lsp",
            version="1.0.0"
        )
        self.diagnostics_cache: Dict[str, List[Diagnostic]] = {}
        self.document_cache: Dict[str, str] = {}


# Create server instance
server = FailKitLanguageServer()


@server.feature(INITIALIZE)
def initialize(params: InitializeParams) -> InitializeResult:
    """Handle initialization request."""
    logger.info("F.A.I.L. Kit LSP initializing...")
    
    return InitializeResult(
        capabilities=ServerCapabilities(
            text_document_sync=TextDocumentSyncOptions(
                open_close=True,
                change=TextDocumentSyncKind.Full,
                save=True,
            ),
            hover_provider=True,
            code_action_provider=CodeActionOptions(
                code_action_kinds=[
                    "quickfix",
                    "refactor",
                    "source",
                ],
                resolve_provider=False,
            ),
        ),
        server_info={
            "name": "failkit-lsp",
            "version": "1.0.0",
        },
    )


@server.feature(TEXT_DOCUMENT_DID_OPEN)
def did_open(params: DidOpenTextDocumentParams):
    """Handle document open event."""
    document = params.text_document
    uri = document.uri
    text = document.text
    
    logger.info(f"Document opened: {uri}")
    server.document_cache[uri] = text
    
    # Analyze and publish diagnostics
    _analyze_and_publish(uri, text)


@server.feature(TEXT_DOCUMENT_DID_CHANGE)
def did_change(params: DidChangeTextDocumentParams):
    """Handle document change event."""
    uri = params.text_document.uri
    
    # Get the full text from the last content change
    if params.content_changes:
        text = params.content_changes[-1].text
        server.document_cache[uri] = text
        
        # Re-analyze on change
        _analyze_and_publish(uri, text)


@server.feature(TEXT_DOCUMENT_DID_SAVE)
def did_save(params: DidSaveTextDocumentParams):
    """Handle document save event."""
    uri = params.text_document.uri
    
    if uri in server.document_cache:
        text = server.document_cache[uri]
        _analyze_and_publish(uri, text)


@server.feature(TEXT_DOCUMENT_DID_CLOSE)
def did_close(params: DidCloseTextDocumentParams):
    """Handle document close event."""
    uri = params.text_document.uri
    
    logger.info(f"Document closed: {uri}")
    
    # Clean up caches
    if uri in server.document_cache:
        del server.document_cache[uri]
    if uri in server.diagnostics_cache:
        del server.diagnostics_cache[uri]
    
    # Clear diagnostics for closed document
    server.publish_diagnostics(uri, [])


@server.feature(TEXT_DOCUMENT_HOVER)
def hover(params: HoverParams) -> Optional[Hover]:
    """Handle hover request."""
    uri = params.text_document.uri
    position = params.position
    
    if uri not in server.document_cache:
        return None
    
    text = server.document_cache[uri]
    diagnostics = server.diagnostics_cache.get(uri, [])
    
    return get_hover_for_position(text, position, diagnostics)


@server.feature(TEXT_DOCUMENT_CODE_ACTION)
def code_action(params: CodeActionParams) -> List[CodeAction]:
    """Handle code action request."""
    uri = params.text_document.uri
    
    if uri not in server.document_cache:
        return []
    
    text = server.document_cache[uri]
    actions: List[CodeAction] = []
    
    # Get actions for each diagnostic in the request context
    for diagnostic in params.context.diagnostics:
        if diagnostic.source == "failkit":
            actions.extend(
                get_code_actions_for_diagnostic(diagnostic, uri, text)
            )
    
    return actions


def _analyze_and_publish(uri: str, text: str):
    """Analyze document and publish diagnostics."""
    # Skip non-Python files
    if not uri.endswith(".py"):
        return
    
    # Extract file path from URI
    file_path = uri
    if uri.startswith("file://"):
        file_path = uri[7:]
    
    # Skip test files (optional, can be configured)
    if _is_test_file(file_path):
        logger.debug(f"Skipping test file: {file_path}")
        # Still analyze but with reduced severity for some rules
    
    logger.info(f"Analyzing: {file_path}")
    
    # Run all analyzers
    all_issues: List[Issue] = []
    
    # Framework-specific analyzers
    analyzers: List[BaseAnalyzer] = [
        LangChainAnalyzer(file_path, text),
        CrewAIAnalyzer(file_path, text),
        AutoGenAnalyzer(file_path, text),
    ]
    
    for analyzer in analyzers:
        try:
            issues = analyzer.analyze()
            all_issues.extend(issues)
            if issues:
                logger.info(f"  {analyzer.get_framework_name()}: {len(issues)} issues")
        except Exception as e:
            logger.error(f"Error in {analyzer.get_framework_name()} analyzer: {e}")
    
    # Generic pattern analysis
    try:
        generic_issues = _run_generic_analysis(file_path, text)
        all_issues.extend(generic_issues)
        if generic_issues:
            logger.info(f"  generic: {len(generic_issues)} issues")
    except Exception as e:
        logger.error(f"Error in generic analysis: {e}")
    
    # Convert to diagnostics and publish
    diagnostics = issues_to_diagnostics(all_issues)
    server.diagnostics_cache[uri] = diagnostics
    
    logger.info(f"Publishing {len(diagnostics)} diagnostics for {file_path}")
    server.publish_diagnostics(uri, diagnostics)


def _run_generic_analysis(file_path: str, text: str) -> List[Issue]:
    """Run generic pattern analysis not specific to any framework."""
    from .analyzer import Issue, IssueSeverity, IssueCategory
    
    issues: List[Issue] = []
    lines = text.splitlines()
    matcher = PatternMatcher(text)
    
    # Check for secrets
    for pattern, line_num, col, match in matcher.find_matches(SECRET_PATTERNS):
        # Skip if in environment variable context
        line = lines[line_num] if line_num < len(lines) else ""
        if "os.environ" in line or "getenv" in line or "env[" in line.lower():
            continue
        
        # Skip if in comment
        if matcher.is_in_skip_context(line_num):
            continue
        
        issues.append(Issue(
            rule_id="FK007",
            message=f"Hardcoded {pattern.description} detected. Use environment variables instead.",
            severity=IssueSeverity.ERROR,
            category=IssueCategory.SECURITY,
            line=line_num,
            column=col,
            end_line=line_num,
            end_column=col + len(match.group()),
            file_path=file_path,
            data={"secret_type": pattern.name},
        ))
    
    # Check for tool calls without receipts (generic patterns)
    for pattern, line_num, col, match in matcher.find_matches(TOOL_PATTERNS):
        if pattern.requires_receipt:
            if matcher.is_in_skip_context(line_num):
                continue
            
            # Check if receipt exists nearby
            if not matcher.has_pattern_nearby(
                [p for p in matcher.find_matches.__self__.__class__.__init__.__globals__.get('RECEIPT_PATTERNS', [])],  # type: ignore
                line_num,
                search_range=15
            ):
                # This is a simplified check; the framework analyzers do more thorough analysis
                pass  # Skip generic tool pattern warnings, let framework analyzers handle
    
    return issues


def _is_test_file(file_path: str) -> bool:
    """Check if a file is a test file."""
    test_patterns = [
        r"test_",
        r"_test\.py$",
        r"tests/",
        r"__tests__/",
        r"\.spec\.py$",
        r"conftest\.py$",
    ]
    return any(re.search(p, file_path, re.IGNORECASE) for p in test_patterns)


def main():
    """Main entry point for the language server."""
    parser = argparse.ArgumentParser(
        description="F.A.I.L. Kit Python Language Server"
    )
    parser.add_argument(
        "--stdio",
        action="store_true",
        help="Use stdio for communication (default)"
    )
    parser.add_argument(
        "--tcp",
        action="store_true",
        help="Use TCP for communication"
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="TCP host (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=2087,
        help="TCP port (default: 2087)"
    )
    parser.add_argument(
        "--log-level",
        choices=["debug", "info", "warning", "error"],
        default="info",
        help="Logging level (default: info)"
    )
    
    args = parser.parse_args()
    
    # Set log level
    log_levels = {
        "debug": logging.DEBUG,
        "info": logging.INFO,
        "warning": logging.WARNING,
        "error": logging.ERROR,
    }
    logging.getLogger().setLevel(log_levels[args.log_level])
    
    logger.info("Starting F.A.I.L. Kit Python Language Server...")
    
    if args.tcp:
        logger.info(f"Listening on {args.host}:{args.port}")
        server.start_tcp(args.host, args.port)
    else:
        logger.info("Using stdio for communication")
        server.start_io()


if __name__ == "__main__":
    main()
