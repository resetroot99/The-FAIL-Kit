"""
F.A.I.L. Kit Language Server

Language Server Protocol implementation using pygls.
"""

import logging
from typing import Optional, List

from lsprotocol import types as lsp
from pygls.server import LanguageServer
from pygls.workspace import TextDocument

from .analyzer import analyze_document, Issue, AnalysisResult
from .fixers import get_fix_for_issue


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fail-kit-lsp")


class FailKitLanguageServer(LanguageServer):
    """F.A.I.L. Kit Language Server for Python AI agent analysis."""

    def __init__(self):
        super().__init__("fail-kit-lsp", "v1.0.0")
        self.analysis_cache: dict[str, AnalysisResult] = {}

    def get_diagnostics(self, document: TextDocument) -> List[lsp.Diagnostic]:
        """Analyze document and return diagnostics."""
        text = document.source
        uri = document.uri

        # Analyze document
        result = analyze_document(text, uri)
        self.analysis_cache[uri] = result

        # Convert issues to diagnostics
        diagnostics = []
        for issue in result.issues:
            diagnostic = lsp.Diagnostic(
                range=lsp.Range(
                    start=lsp.Position(line=issue.line, character=issue.column),
                    end=lsp.Position(line=issue.end_line, character=issue.end_column),
                ),
                message=issue.message,
                severity=self._get_severity(issue.severity),
                code=issue.rule_id,
                source="fail-kit",
                tags=self._get_tags(issue),
            )
            diagnostics.append(diagnostic)

        return diagnostics

    def _get_severity(self, severity: str) -> lsp.DiagnosticSeverity:
        """Convert severity string to LSP severity."""
        mapping = {
            "error": lsp.DiagnosticSeverity.Error,
            "warning": lsp.DiagnosticSeverity.Warning,
            "info": lsp.DiagnosticSeverity.Information,
            "hint": lsp.DiagnosticSeverity.Hint,
        }
        return mapping.get(severity, lsp.DiagnosticSeverity.Warning)

    def _get_tags(self, issue: Issue) -> Optional[List[lsp.DiagnosticTag]]:
        """Get diagnostic tags for an issue."""
        tags = []
        if issue.category == "security":
            tags.append(lsp.DiagnosticTag.Unnecessary)  # Will show with strike-through
        return tags if tags else None


# Create server instance
server = FailKitLanguageServer()


@server.feature(lsp.TEXT_DOCUMENT_DID_OPEN)
async def did_open(params: lsp.DidOpenTextDocumentParams) -> None:
    """Handle document open event."""
    document = server.workspace.get_text_document(params.text_document.uri)
    diagnostics = server.get_diagnostics(document)
    
    server.publish_diagnostics(
        params.text_document.uri,
        diagnostics,
    )
    logger.info(f"Opened: {params.text_document.uri}, {len(diagnostics)} issues")


@server.feature(lsp.TEXT_DOCUMENT_DID_CHANGE)
async def did_change(params: lsp.DidChangeTextDocumentParams) -> None:
    """Handle document change event."""
    document = server.workspace.get_text_document(params.text_document.uri)
    diagnostics = server.get_diagnostics(document)
    
    server.publish_diagnostics(
        params.text_document.uri,
        diagnostics,
    )


@server.feature(lsp.TEXT_DOCUMENT_DID_SAVE)
async def did_save(params: lsp.DidSaveTextDocumentParams) -> None:
    """Handle document save event."""
    document = server.workspace.get_text_document(params.text_document.uri)
    diagnostics = server.get_diagnostics(document)
    
    server.publish_diagnostics(
        params.text_document.uri,
        diagnostics,
    )
    logger.info(f"Saved: {params.text_document.uri}, {len(diagnostics)} issues")


@server.feature(lsp.TEXT_DOCUMENT_CODE_ACTION)
async def code_action(params: lsp.CodeActionParams) -> Optional[List[lsp.CodeAction]]:
    """Provide code actions (quick fixes) for diagnostics."""
    document = server.workspace.get_text_document(params.text_document.uri)
    uri = params.text_document.uri
    
    # Get cached analysis
    result = server.analysis_cache.get(uri)
    if not result:
        return None

    actions = []
    
    for diagnostic in params.context.diagnostics:
        if diagnostic.source != "fail-kit":
            continue

        # Find matching issue
        for issue in result.issues:
            if issue.rule_id == diagnostic.code and issue.line == diagnostic.range.start.line:
                # Get fix for this issue
                fix = get_fix_for_issue(issue, document.source)
                if fix:
                    edit = lsp.WorkspaceEdit(
                        changes={
                            uri: [
                                lsp.TextEdit(
                                    range=lsp.Range(
                                        start=lsp.Position(line=fix.start_line, character=fix.start_column),
                                        end=lsp.Position(line=fix.end_line, character=fix.end_column),
                                    ),
                                    new_text=fix.replacement,
                                )
                            ]
                        }
                    )
                    
                    action = lsp.CodeAction(
                        title=fix.title,
                        kind=lsp.CodeActionKind.QuickFix,
                        diagnostics=[diagnostic],
                        edit=edit,
                        is_preferred=True,
                    )
                    actions.append(action)

    return actions if actions else None


@server.feature(lsp.TEXT_DOCUMENT_HOVER)
async def hover(params: lsp.HoverParams) -> Optional[lsp.Hover]:
    """Provide hover information."""
    uri = params.text_document.uri
    position = params.position
    
    result = server.analysis_cache.get(uri)
    if not result:
        return None

    # Find issue at position
    for issue in result.issues:
        if issue.line <= position.line <= issue.end_line:
            markdown = f"""### F.A.I.L. Kit: {issue.rule_id}

**{issue.category.upper()}**: {issue.message}

**Severity**: {issue.severity}

**Recommendation**: {issue.recommendation}

---
[Documentation](https://github.com/resetroot99/The-FAIL-Kit/blob/main/docs/RULES.md#{issue.rule_id.lower()})
"""
            return lsp.Hover(
                contents=lsp.MarkupContent(
                    kind=lsp.MarkupKind.Markdown,
                    value=markdown,
                )
            )

    return None


@server.command("fail-kit.analyzeWorkspace")
async def analyze_workspace(params: List[object]) -> dict:
    """Analyze all Python files in workspace."""
    issues_count = 0
    files_analyzed = 0
    
    for uri, document in server.workspace.text_documents.items():
        if uri.endswith(".py"):
            diagnostics = server.get_diagnostics(document)
            issues_count += len(diagnostics)
            files_analyzed += 1
            
            server.publish_diagnostics(uri, diagnostics)
    
    return {
        "files_analyzed": files_analyzed,
        "total_issues": issues_count,
    }


@server.command("fail-kit.generateReport")
async def generate_report(params: List[object]) -> dict:
    """Generate analysis report for all cached results."""
    all_issues = []
    
    for uri, result in server.analysis_cache.items():
        for issue in result.issues:
            all_issues.append({
                "file": uri,
                "line": issue.line,
                "rule_id": issue.rule_id,
                "message": issue.message,
                "severity": issue.severity,
                "category": issue.category,
            })
    
    # Summary
    by_severity = {}
    by_category = {}
    
    for issue in all_issues:
        by_severity[issue["severity"]] = by_severity.get(issue["severity"], 0) + 1
        by_category[issue["category"]] = by_category.get(issue["category"], 0) + 1
    
    return {
        "total_issues": len(all_issues),
        "by_severity": by_severity,
        "by_category": by_category,
        "issues": all_issues,
    }


def main() -> None:
    """Start the language server."""
    logger.info("Starting F.A.I.L. Kit Language Server for Python...")
    server.start_io()


if __name__ == "__main__":
    main()
