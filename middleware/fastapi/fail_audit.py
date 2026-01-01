"""
F.A.I.L. Kit FastAPI Middleware

Drop this into your existing FastAPI app to add the /eval/run endpoint.

Usage:

from fail_kit import fail_audit_route

@app.post("/eval/run")
async def evaluate(request: dict):
    return await fail_audit_route(request, handler=your_agent_function)

Or use the decorator:

from fail_kit import fail_audit

@fail_audit(auto_receipts=True)
async def your_agent_function(prompt: str, context: dict):
    # Your agent logic here
    return {
        "response": "I did the thing",
        "actions": [...],
        "receipts": [...]
    }
"""

from typing import Dict, List, Optional, Callable, Any
from datetime import datetime
from functools import wraps


class FailAuditAction:
    def __init__(
        self,
        tool: str,
        input: Optional[Any] = None,
        output: Optional[Any] = None,
        status: str = "success",
        proof: Optional[str] = None
    ):
        self.tool = tool
        self.input = input
        self.output = output
        self.status = status
        self.proof = proof

    def to_dict(self):
        return {
            "tool": self.tool,
            "input": self.input,
            "output": self.output,
            "status": self.status,
            "proof": self.proof
        }


class FailAuditReceipt:
    def __init__(
        self,
        tool: str,
        status: str,
        proof: str,
        timestamp: Optional[str] = None
    ):
        self.timestamp = timestamp or datetime.now().isoformat()
        self.tool = tool
        self.status = status
        self.proof = proof

    def to_dict(self):
        return {
            "timestamp": self.timestamp,
            "tool": self.tool,
            "status": self.status,
            "proof": self.proof
        }


async def fail_audit_route(
    request: Dict[str, Any],
    handler: Callable,
    auto_receipts: bool = True,
    action_logger: Optional[Callable] = None
) -> Dict[str, Any]:
    """
    Process a F.A.I.L. Kit evaluation request
    
    Args:
        request: Request dict with 'prompt' and optional 'context'
        handler: Async function that processes the prompt
        auto_receipts: Auto-generate receipts from actions if not provided
        action_logger: Optional function to log actions
    
    Returns:
        Dict with response, actions, and receipts
    """
    prompt = request.get("prompt")
    context = request.get("context", {})

    if not prompt:
        raise ValueError("Missing required field: prompt")

    # Call the user's handler
    result = await handler(prompt, context)

    # Validate response format
    if not isinstance(result, dict):
        raise ValueError("Handler must return a dict with response, actions, and receipts")

    # Auto-generate receipts if enabled and not provided
    receipts = result.get("receipts", [])
    actions = result.get("actions", [])
    
    if auto_receipts and not receipts and actions:
        receipts = [
            {
                "timestamp": datetime.now().isoformat(),
                "tool": action.get("tool", f"tool_{i}"),
                "status": action.get("status", "success"),
                "proof": action.get("proof", f"Action completed: {action.get('tool', 'unknown')}")
            }
            for i, action in enumerate(actions)
        ]

    # Log actions if logger provided
    if action_logger and actions:
        try:
            await action_logger(actions, receipts)
        except Exception as e:
            print(f"Action logger error: {e}")

    return {
        "response": result.get("response", ""),
        "actions": actions,
        "receipts": receipts
    }


def fail_audit(auto_receipts: bool = True, action_logger: Optional[Callable] = None):
    """
    Decorator to wrap an agent function for F.A.I.L. Kit evaluation
    
    Usage:
        @fail_audit(auto_receipts=True)
        async def my_agent(prompt: str, context: dict):
            return {"response": "...", "actions": [...], "receipts": [...]}
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(request: Dict[str, Any]):
            return await fail_audit_route(
                request,
                handler=lambda p, c: func(p, c),
                auto_receipts=auto_receipts,
                action_logger=action_logger
            )
        return wrapper
    return decorator


def fail_audit_simple(func: Callable):
    """
    Simple wrapper for agents that don't track actions
    Automatically wraps string responses
    """
    @wraps(func)
    async def wrapper(prompt: str, context: dict):
        response = await func(prompt, context)
        
        # If response is a string, wrap it
        if isinstance(response, str):
            return {
                "response": response,
                "actions": [],
                "receipts": []
            }
        
        # If response is already formatted, pass through
        return response
    
    return fail_audit(auto_receipts=True)(wrapper)
