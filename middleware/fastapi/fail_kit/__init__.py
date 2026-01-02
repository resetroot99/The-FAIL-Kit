"""
F.A.I.L. Kit - Forensic Audit of Intelligent Logic

FastAPI middleware for AI agent auditing.

Usage:
    from fail_kit import fail_audit, fail_audit_route, fail_audit_simple

    @app.post("/eval/run")
    @fail_audit(auto_receipts=True)
    async def evaluate(request: dict):
        result = await your_agent(request["prompt"])
        return {
            "response": result["text"],
            "actions": result["actions"],
            "receipts": result["receipts"]
        }
"""

from typing import Dict, List, Optional, Callable, Any
from datetime import datetime
from functools import wraps
import hashlib


__version__ = "1.0.0"
__all__ = [
    "fail_audit",
    "fail_audit_route", 
    "fail_audit_simple",
    "FailAuditAction",
    "FailAuditReceipt",
    "generate_receipt"
]


class FailAuditAction:
    """Represents an action taken by the agent."""
    
    def __init__(
        self,
        tool: str,
        input: Optional[Any] = None,
        output: Optional[Any] = None,
        status: str = "success",
        proof: Optional[str] = None,
        latency_ms: Optional[int] = None
    ):
        self.action_id = f"act_{tool}_{int(datetime.now().timestamp())}"
        self.tool = tool
        self.input = input
        self.output = output
        self.status = status
        self.proof = proof
        self.latency_ms = latency_ms
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "action_id": self.action_id,
            "tool_name": self.tool,
            "timestamp": self.timestamp,
            "status": self.status,
        }
        if self.input is not None:
            result["input_hash"] = f"sha256:{hashlib.sha256(str(self.input).encode()).hexdigest()[:16]}"
        if self.output is not None:
            result["output_hash"] = f"sha256:{hashlib.sha256(str(self.output).encode()).hexdigest()[:16]}"
        if self.latency_ms is not None:
            result["latency_ms"] = self.latency_ms
        if self.proof:
            result["proof"] = self.proof
        return result


class FailAuditReceipt:
    """Represents proof that an action was executed."""
    
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

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "tool": self.tool,
            "status": self.status,
            "proof": self.proof
        }


def generate_receipt(action: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a receipt from an action dict."""
    return {
        "timestamp": action.get("timestamp", datetime.now().isoformat()),
        "tool": action.get("tool_name", action.get("tool", "unknown")),
        "status": action.get("status", "success"),
        "proof": action.get("proof", f"Action completed: {action.get('tool_name', action.get('tool', 'unknown'))}")
    }


async def fail_audit_route(
    request: Dict[str, Any],
    handler: Callable,
    auto_receipts: bool = True,
    action_logger: Optional[Callable] = None
) -> Dict[str, Any]:
    """
    Process a F.A.I.L. Kit evaluation request.
    
    Args:
        request: Request dict with 'inputs.user' or 'prompt'
        handler: Async function that processes the prompt
        auto_receipts: Auto-generate receipts from actions if not provided
        action_logger: Optional function to log actions
    
    Returns:
        Dict with outputs, actions, and policy fields
    """
    # Extract prompt from various formats
    prompt = None
    if "inputs" in request and isinstance(request["inputs"], dict):
        prompt = request["inputs"].get("user")
    if not prompt:
        prompt = request.get("prompt")
    
    context = request.get("context", {})

    if not prompt:
        raise ValueError("Missing required field: inputs.user or prompt")

    # Call the user's handler
    result = await handler(prompt, context)

    # Validate response format
    if not isinstance(result, dict):
        raise ValueError("Handler must return a dict with response, actions, and receipts")

    # Extract response
    response = result.get("response", result.get("text", ""))
    
    # Extract actions and receipts
    actions = result.get("actions", [])
    receipts = result.get("receipts", [])
    
    # Convert FailAuditAction objects to dicts
    actions = [a.to_dict() if hasattr(a, 'to_dict') else a for a in actions]
    
    # Auto-generate receipts if enabled and not provided
    if auto_receipts and not receipts and actions:
        receipts = [generate_receipt(action) for action in actions]

    # Log actions if logger provided
    if action_logger and actions:
        try:
            await action_logger(actions, receipts)
        except Exception as e:
            print(f"Action logger error: {e}")

    # Build response in F.A.I.L. Kit format
    response_data = {
        "outputs": {
            "final_text": response,
            "decision": "NEEDS_REVIEW" if result.get("policy", {}).get("escalate") else "PASS"
        },
        "actions": actions
    }
    
    # Add policy if present
    if result.get("policy"):
        response_data["policy"] = result["policy"]
    
    return response_data


def fail_audit(auto_receipts: bool = True, action_logger: Optional[Callable] = None):
    """
    Decorator to wrap an agent function for F.A.I.L. Kit evaluation.
    
    Usage:
        @app.post("/eval/run")
        @fail_audit(auto_receipts=True)
        async def evaluate(request: dict):
            result = await my_agent(request["inputs"]["user"])
            return {"response": result, "actions": [], "receipts": []}
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(request: Dict[str, Any]):
            # Extract prompt
            prompt = None
            if "inputs" in request and isinstance(request["inputs"], dict):
                prompt = request["inputs"].get("user")
            if not prompt:
                prompt = request.get("prompt")
            
            context = request.get("context", {})
            
            # Call the decorated function
            result = await func(prompt, context)
            
            # Ensure result is a dict
            if isinstance(result, str):
                result = {"response": result, "actions": [], "receipts": []}
            
            # Build the response
            return await fail_audit_route(
                {"inputs": {"user": prompt}, "context": context},
                handler=lambda p, c: result if isinstance(result, dict) else {"response": result, "actions": [], "receipts": []},
                auto_receipts=auto_receipts,
                action_logger=action_logger
            )
        return wrapper
    return decorator


def fail_audit_simple(func: Callable):
    """
    Simple decorator for agents that just return text.
    
    Usage:
        @app.post("/eval/run")
        @fail_audit_simple
        async def evaluate(prompt: str, context: dict):
            return f"Answer to: {prompt}"
    """
    @wraps(func)
    async def wrapper(request: Dict[str, Any]):
        # Extract prompt
        prompt = None
        if "inputs" in request and isinstance(request["inputs"], dict):
            prompt = request["inputs"].get("user")
        if not prompt:
            prompt = request.get("prompt")
        
        context = request.get("context", {})
        
        # Call the function
        response = await func(prompt, context)
        
        # If response is a string, wrap it
        if isinstance(response, str):
            response = {"response": response, "actions": [], "receipts": []}
        
        # Build F.A.I.L. Kit response
        return {
            "outputs": {
                "final_text": response.get("response", str(response)),
                "decision": "PASS"
            },
            "actions": response.get("actions", [])
        }
    
    return wrapper
