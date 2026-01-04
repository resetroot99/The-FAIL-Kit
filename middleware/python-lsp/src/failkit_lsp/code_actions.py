"""
Code Actions Module

Provides quick fixes and refactoring actions for F.A.I.L. Kit diagnostics.
"""

from typing import List, Optional

from lsprotocol.types import (
    CodeAction,
    CodeActionKind,
    Diagnostic,
    Position,
    Range,
    TextEdit,
    WorkspaceEdit,
)


def get_code_actions_for_diagnostic(
    diagnostic: Diagnostic,
    document_uri: str,
    document_text: str
) -> List[CodeAction]:
    """
    Generate code actions for a specific diagnostic.
    
    Args:
        diagnostic: The diagnostic to generate actions for.
        document_uri: The URI of the document.
        document_text: The full text of the document.
    
    Returns:
        List of applicable CodeAction objects.
    """
    actions: List[CodeAction] = []
    rule_id = diagnostic.code
    
    if rule_id == "FK001":
        actions.extend(_get_receipt_actions(diagnostic, document_uri, document_text))
    elif rule_id == "FK002":
        actions.extend(_get_error_handling_actions(diagnostic, document_uri, document_text))
    elif rule_id in ("FK003", "FK007"):
        actions.extend(_get_secret_actions(diagnostic, document_uri, document_text))
    elif rule_id == "FK004":
        actions.extend(_get_confirmation_actions(diagnostic, document_uri, document_text))
    elif rule_id == "FK005":
        actions.extend(_get_resilience_actions(diagnostic, document_uri, document_text))
    elif rule_id == "FK009":
        actions.extend(_get_termination_actions(diagnostic, document_uri, document_text))
    
    # Always add a disable comment action
    actions.append(_get_disable_action(diagnostic, document_uri, document_text))
    
    return actions


def _get_receipt_actions(
    diagnostic: Diagnostic,
    document_uri: str,
    document_text: str
) -> List[CodeAction]:
    """Generate code actions for missing receipt issues."""
    actions = []
    lines = document_text.splitlines()
    line_idx = diagnostic.range.start.line
    
    if line_idx >= len(lines):
        return actions
    
    line = lines[line_idx]
    indent = len(line) - len(line.lstrip())
    indent_str = " " * indent
    
    # Action 1: Add receipt generation after the call
    receipt_code = f'''
{indent_str}# F.A.I.L. Kit Receipt Generation
{indent_str}from datetime import datetime
{indent_str}import hashlib
{indent_str}import uuid
{indent_str}
{indent_str}receipt = {{
{indent_str}    "action_id": f"act_{{uuid.uuid4().hex[:8]}}",
{indent_str}    "timestamp": datetime.utcnow().isoformat() + "Z",
{indent_str}    "tool_name": "agent_execution",
{indent_str}    "status": "success",
{indent_str}    "input_hash": hashlib.sha256(str(input_data).encode()).hexdigest()[:16],
{indent_str}    "output_hash": hashlib.sha256(str(result).encode()).hexdigest()[:16],
{indent_str}}}
{indent_str}# TODO: Store receipt for audit trail
'''
    
    # Insert after the current line
    insert_position = Position(line=line_idx + 1, character=0)
    
    actions.append(CodeAction(
        title="Add receipt generation (F.A.I.L. Kit)",
        kind=CodeActionKind.QuickFix,
        diagnostics=[diagnostic],
        edit=WorkspaceEdit(
            changes={
                document_uri: [
                    TextEdit(
                        range=Range(start=insert_position, end=insert_position),
                        new_text=receipt_code
                    )
                ]
            }
        ),
        is_preferred=True,
    ))
    
    # Action 2: Wrap with ReceiptGeneratingTool import suggestion
    actions.append(CodeAction(
        title="Add ReceiptGeneratingTool import",
        kind=CodeActionKind.QuickFix,
        diagnostics=[diagnostic],
        edit=WorkspaceEdit(
            changes={
                document_uri: [
                    TextEdit(
                        range=Range(
                            start=Position(line=0, character=0),
                            end=Position(line=0, character=0)
                        ),
                        new_text="from fail_kit_langchain import ReceiptGeneratingTool, extract_receipts_from_agent_executor\n"
                    )
                ]
            }
        ),
    ))
    
    return actions


def _get_error_handling_actions(
    diagnostic: Diagnostic,
    document_uri: str,
    document_text: str
) -> List[CodeAction]:
    """Generate code actions for missing error handling."""
    actions = []
    lines = document_text.splitlines()
    line_idx = diagnostic.range.start.line
    
    if line_idx >= len(lines):
        return actions
    
    line = lines[line_idx]
    indent = len(line) - len(line.lstrip())
    indent_str = " " * indent
    inner_indent = " " * (indent + 4)
    
    # Get the code on this line (the call that needs wrapping)
    call_code = line.strip()
    
    # Action: Wrap in try/except
    wrapped_code = f'''{indent_str}try:
{inner_indent}{call_code}
{indent_str}except Exception as e:
{inner_indent}# F.A.I.L. Kit: Handle agent/LLM failure
{inner_indent}import logging
{inner_indent}logging.error(f"Agent execution failed: {{e}}")
{inner_indent}raise  # Re-raise after logging
'''
    
    actions.append(CodeAction(
        title="Wrap in try/except (F.A.I.L. Kit)",
        kind=CodeActionKind.QuickFix,
        diagnostics=[diagnostic],
        edit=WorkspaceEdit(
            changes={
                document_uri: [
                    TextEdit(
                        range=Range(
                            start=Position(line=line_idx, character=0),
                            end=Position(line=line_idx + 1, character=0)
                        ),
                        new_text=wrapped_code
                    )
                ]
            }
        ),
        is_preferred=True,
    ))
    
    return actions


def _get_secret_actions(
    diagnostic: Diagnostic,
    document_uri: str,
    document_text: str
) -> List[CodeAction]:
    """Generate code actions for secret exposure issues."""
    actions = []
    lines = document_text.splitlines()
    line_idx = diagnostic.range.start.line
    
    if line_idx >= len(lines):
        return actions
    
    line = lines[line_idx]
    
    # Try to extract variable name and suggest env var replacement
    import re
    var_match = re.search(r"(\w+)\s*=\s*['\"]", line)
    if var_match:
        var_name = var_match.group(1)
        env_var_name = var_name.upper()
        
        # Replace with os.environ
        new_line = re.sub(
            r"['\"][^'\"]+['\"]",
            f'os.environ.get("{env_var_name}")',
            line
        )
        
        actions.append(CodeAction(
            title=f"Replace with os.environ.get('{env_var_name}')",
            kind=CodeActionKind.QuickFix,
            diagnostics=[diagnostic],
            edit=WorkspaceEdit(
                changes={
                    document_uri: [
                        TextEdit(
                            range=Range(
                                start=Position(line=line_idx, character=0),
                                end=Position(line=line_idx + 1, character=0)
                            ),
                            new_text=new_line + "\n"
                        )
                    ]
                }
            ),
            is_preferred=True,
        ))
    
    return actions


def _get_confirmation_actions(
    diagnostic: Diagnostic,
    document_uri: str,
    document_text: str
) -> List[CodeAction]:
    """Generate code actions for side-effect confirmation issues."""
    actions = []
    lines = document_text.splitlines()
    line_idx = diagnostic.range.start.line
    
    if line_idx >= len(lines):
        return actions
    
    line = lines[line_idx]
    indent = len(line) - len(line.lstrip())
    indent_str = " " * indent
    inner_indent = " " * (indent + 4)
    
    call_code = line.strip()
    
    # Action: Add confirmation check
    confirmation_code = f'''{indent_str}# F.A.I.L. Kit: Require confirmation for destructive action
{indent_str}if not confirm_action("This will perform a destructive operation. Continue?"):
{inner_indent}raise ValueError("Operation cancelled by user")
{indent_str}{call_code}
'''
    
    actions.append(CodeAction(
        title="Add confirmation check (F.A.I.L. Kit)",
        kind=CodeActionKind.QuickFix,
        diagnostics=[diagnostic],
        edit=WorkspaceEdit(
            changes={
                document_uri: [
                    TextEdit(
                        range=Range(
                            start=Position(line=line_idx, character=0),
                            end=Position(line=line_idx + 1, character=0)
                        ),
                        new_text=confirmation_code
                    )
                ]
            }
        ),
    ))
    
    return actions


def _get_resilience_actions(
    diagnostic: Diagnostic,
    document_uri: str,
    document_text: str
) -> List[CodeAction]:
    """Generate code actions for missing resilience patterns."""
    actions = []
    lines = document_text.splitlines()
    line_idx = diagnostic.range.start.line
    
    if line_idx >= len(lines):
        return actions
    
    line = lines[line_idx]
    indent = len(line) - len(line.lstrip())
    indent_str = " " * indent
    
    # Action: Add retry decorator import and suggestion
    retry_import = "from tenacity import retry, stop_after_attempt, wait_exponential\n"
    
    actions.append(CodeAction(
        title="Add retry decorator import (tenacity)",
        kind=CodeActionKind.QuickFix,
        diagnostics=[diagnostic],
        edit=WorkspaceEdit(
            changes={
                document_uri: [
                    TextEdit(
                        range=Range(
                            start=Position(line=0, character=0),
                            end=Position(line=0, character=0)
                        ),
                        new_text=retry_import
                    )
                ]
            }
        ),
    ))
    
    # Action: Add timeout configuration comment
    timeout_suggestion = f"{indent_str}# TODO: Add timeout parameter, e.g., timeout=30.0\n"
    
    actions.append(CodeAction(
        title="Add timeout TODO comment",
        kind=CodeActionKind.QuickFix,
        diagnostics=[diagnostic],
        edit=WorkspaceEdit(
            changes={
                document_uri: [
                    TextEdit(
                        range=Range(
                            start=Position(line=line_idx, character=0),
                            end=Position(line=line_idx, character=0)
                        ),
                        new_text=timeout_suggestion
                    )
                ]
            }
        ),
    ))
    
    return actions


def _get_termination_actions(
    diagnostic: Diagnostic,
    document_uri: str,
    document_text: str
) -> List[CodeAction]:
    """Generate code actions for missing termination configuration."""
    actions = []
    lines = document_text.splitlines()
    line_idx = diagnostic.range.start.line
    
    if line_idx >= len(lines):
        return actions
    
    line = lines[line_idx]
    
    # Find where to insert max_turns parameter
    import re
    
    # For initiate_chat calls
    if "initiate_chat" in line:
        # Add max_turns parameter
        if ")" in line:
            new_line = line.replace(")", ", max_turns=10)")
            actions.append(CodeAction(
                title="Add max_turns=10 parameter",
                kind=CodeActionKind.QuickFix,
                diagnostics=[diagnostic],
                edit=WorkspaceEdit(
                    changes={
                        document_uri: [
                            TextEdit(
                                range=Range(
                                    start=Position(line=line_idx, character=0),
                                    end=Position(line=line_idx + 1, character=0)
                                ),
                                new_text=new_line + "\n"
                            )
                        ]
                    }
                ),
                is_preferred=True,
            ))
    
    # For Agent configurations
    elif "Agent(" in line:
        if ")" in line:
            new_line = line.replace(")", ", max_consecutive_auto_reply=5)")
            actions.append(CodeAction(
                title="Add max_consecutive_auto_reply=5 parameter",
                kind=CodeActionKind.QuickFix,
                diagnostics=[diagnostic],
                edit=WorkspaceEdit(
                    changes={
                        document_uri: [
                            TextEdit(
                                range=Range(
                                    start=Position(line=line_idx, character=0),
                                    end=Position(line=line_idx + 1, character=0)
                                ),
                                new_text=new_line + "\n"
                            )
                        ]
                    }
                ),
                is_preferred=True,
            ))
    
    return actions


def _get_disable_action(
    diagnostic: Diagnostic,
    document_uri: str,
    document_text: str
) -> CodeAction:
    """Generate action to disable the diagnostic for this line."""
    line_idx = diagnostic.range.start.line
    lines = document_text.splitlines()
    
    if line_idx >= len(lines):
        indent_str = ""
    else:
        line = lines[line_idx]
        indent = len(line) - len(line.lstrip())
        indent_str = " " * indent
    
    disable_comment = f"{indent_str}# fail-kit-disable: {diagnostic.code}\n"
    
    return CodeAction(
        title=f"Disable {diagnostic.code} for this line",
        kind=CodeActionKind.QuickFix,
        diagnostics=[diagnostic],
        edit=WorkspaceEdit(
            changes={
                document_uri: [
                    TextEdit(
                        range=Range(
                            start=Position(line=line_idx, character=0),
                            end=Position(line=line_idx, character=0)
                        ),
                        new_text=disable_comment
                    )
                ]
            }
        ),
    )
