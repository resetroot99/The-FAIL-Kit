"""
Receipt Standard - Python SDK
Validate and generate receipts for AI agent actions
"""

import hashlib
import json
import re
import secrets
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


def validate_receipt(receipt: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate a receipt against the schema.
    
    Args:
        receipt: Dictionary containing receipt data
        
    Returns:
        Dict with 'valid' (bool) and optionally 'errors' (list of str)
    """
    errors = []
    
    # Check required fields
    if not receipt.get("action_id"):
        errors.append("Missing action_id")
    if not receipt.get("tool_name"):
        errors.append("Missing tool_name")
    if not receipt.get("timestamp"):
        errors.append("Missing timestamp")
    if not receipt.get("status"):
        errors.append("Missing status")
    if not receipt.get("input_hash"):
        errors.append("Missing input_hash")
    if not receipt.get("output_hash"):
        errors.append("Missing output_hash")
    
    # Validate action_id format
    if receipt.get("action_id") and not re.match(r'^[a-zA-Z0-9_-]+$', receipt["action_id"]):
        errors.append("Invalid action_id format")
    
    # Validate timestamp format (ISO-8601)
    if receipt.get("timestamp"):
        try:
            datetime.fromisoformat(receipt["timestamp"].replace('Z', '+00:00'))
        except ValueError:
            errors.append("Invalid timestamp format (must be ISO-8601)")
    
    # Validate status enum
    if receipt.get("status") and receipt["status"] not in ["success", "failed"]:
        errors.append('Invalid status (must be "success" or "failed")')
    
    # Validate hash format
    hash_pattern = re.compile(r'^sha256:[a-f0-9]{64}$')
    if receipt.get("input_hash") and not hash_pattern.match(receipt["input_hash"]):
        errors.append("Invalid input_hash format (must be sha256:...)")
    if receipt.get("output_hash") and not hash_pattern.match(receipt["output_hash"]):
        errors.append("Invalid output_hash format (must be sha256:...)")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors if len(errors) > 0 else None
    }


def hash_data(data: Any) -> str:
    """
    Generate SHA256 hash of data.
    
    Args:
        data: Data to hash (will be JSON serialized)
        
    Returns:
        Hash string in format 'sha256:...'
    """
    # Sort keys for deterministic hashing
    json_str = json.dumps(data, sort_keys=True, separators=(',', ':'))
    hash_obj = hashlib.sha256(json_str.encode('utf-8'))
    return f"sha256:{hash_obj.hexdigest()}"


def generate_action_id() -> str:
    """
    Generate a unique action ID.
    
    Returns:
        Action ID string
    """
    return f"act_{secrets.token_hex(8)}"


def generate_receipt(
    tool_name: str,
    input_data: Any,
    output_data: Any,
    status: str,
    trace_id: Optional[str] = None,
    latency_ms: Optional[int] = None,
    error_message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate a receipt from tool invocation data.
    
    Args:
        tool_name: Name of the tool that was invoked
        input_data: Input data sent to the tool
        output_data: Output data returned from the tool
        status: "success" or "failed"
        trace_id: Optional trace ID
        latency_ms: Optional latency in milliseconds
        error_message: Optional error message if status is "failed"
        metadata: Optional additional metadata
        
    Returns:
        Receipt dictionary
    """
    receipt = {
        "action_id": generate_action_id(),
        "tool_name": tool_name,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "status": status,
        "input_hash": hash_data(input_data),
        "output_hash": hash_data(output_data)
    }
    
    if trace_id:
        receipt["trace_id"] = trace_id
    if latency_ms is not None:
        receipt["latency_ms"] = latency_ms
    if error_message:
        receipt["error_message"] = error_message
    if metadata:
        receipt["metadata"] = metadata
    
    return receipt


def receipts_match(receipt1: Dict[str, Any], receipt2: Dict[str, Any]) -> bool:
    """
    Verify that two receipts have the same input/output.
    
    Args:
        receipt1: First receipt
        receipt2: Second receipt
        
    Returns:
        True if receipts match
    """
    return (
        receipt1.get("input_hash") == receipt2.get("input_hash") and
        receipt1.get("output_hash") == receipt2.get("output_hash") and
        receipt1.get("tool_name") == receipt2.get("tool_name")
    )


def proves_action(receipt: Dict[str, Any], expected_tool_name: str) -> bool:
    """
    Check if receipt proves a specific action was taken.
    
    Args:
        receipt: Receipt to check
        expected_tool_name: Expected tool name
        
    Returns:
        True if receipt proves the action
    """
    return (
        receipt.get("tool_name") == expected_tool_name and
        receipt.get("status") == "success" and
        validate_receipt(receipt)["valid"]
    )


__all__ = [
    "validate_receipt",
    "generate_receipt",
    "hash_data",
    "generate_action_id",
    "receipts_match",
    "proves_action"
]
