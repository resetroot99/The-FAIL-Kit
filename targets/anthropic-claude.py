#!/usr/bin/env python3
"""
Anthropic Claude Adapter for F.A.I.L. Kit

Wraps Claude API to expose /eval/run endpoint for security auditing.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python anthropic-claude.py

Then run:
    fail-audit run --endpoint http://localhost:8002/eval/run --cases cases/security/
"""

import os
import json
import hashlib
import time
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

try:
    import anthropic
except ImportError:
    print("Install anthropic: pip install anthropic")
    exit(1)

app = FastAPI(title="Anthropic Claude Adapter")

# Initialize client
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


class EvalRequest(BaseModel):
    prompt: Optional[str] = None
    inputs: Optional[dict] = None


def hash_data(data) -> str:
    serialized = json.dumps(data, sort_keys=True, default=str)
    return f"sha256:{hashlib.sha256(serialized.encode()).hexdigest()}"


@app.post("/eval/run")
async def evaluate(request: EvalRequest):
    """F.A.I.L. Kit evaluation endpoint"""
    
    prompt = request.prompt or (request.inputs.get("user", "") if request.inputs else "")
    
    if not prompt:
        raise HTTPException(status_code=400, detail="No prompt provided")
    
    start_time = time.time()
    receipts = []
    output_text = ""
    
    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        output_text = message.content[0].text if message.content else ""
        
        # Generate receipt
        latency_ms = int((time.time() - start_time) * 1000)
        receipts.append({
            "action_id": f"act_{message.id[:8] if message.id else 'unknown'}",
            "tool_name": "anthropic_claude",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": "success",
            "input_hash": hash_data({"prompt": prompt}),
            "output_hash": hash_data({"response": output_text}),
            "latency_ms": latency_ms,
            "metadata": {
                "model": "claude-3-haiku-20240307",
                "stop_reason": message.stop_reason,
                "input_tokens": message.usage.input_tokens,
                "output_tokens": message.usage.output_tokens
            }
        })
        
    except Exception as e:
        output_text = f"Error: {str(e)}"
        latency_ms = int((time.time() - start_time) * 1000)
        receipts.append({
            "action_id": f"act_error_{int(time.time())}",
            "tool_name": "anthropic_claude",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": "failed",
            "input_hash": hash_data({"prompt": prompt}),
            "output_hash": hash_data({"error": str(e)}),
            "latency_ms": latency_ms,
            "error_message": str(e)
        })
    
    return {
        "outputs": {
            "final_text": output_text,
            "decision": "PASS"
        },
        "actions": receipts,
        "policy": {
            "refuse": False,
            "abstain": False,
            "escalate": False,
            "reasons": []
        }
    }


@app.get("/health")
async def health():
    return {"status": "ok", "target": "anthropic-claude"}


if __name__ == "__main__":
    print("Starting Anthropic Claude Adapter on http://localhost:8002")
    print("Make sure ANTHROPIC_API_KEY is set")
    uvicorn.run(app, host="0.0.0.0", port=8002)
