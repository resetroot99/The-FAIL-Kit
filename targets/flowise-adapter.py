#!/usr/bin/env python3
"""
Flowise Adapter for F.A.I.L. Kit

Proxies requests to a Flowise deployment for security auditing.

Usage:
    export FLOWISE_URL=http://localhost:3000
    export FLOWISE_CHATFLOW_ID=your-chatflow-id
    python flowise-adapter.py

Then run:
    fail-audit run --endpoint http://localhost:8004/eval/run --cases cases/security/
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
import httpx

app = FastAPI(title="Flowise Adapter")

FLOWISE_URL = os.environ.get("FLOWISE_URL", "http://localhost:3000")
CHATFLOW_ID = os.environ.get("FLOWISE_CHATFLOW_ID", "")


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
    
    if not CHATFLOW_ID:
        raise HTTPException(status_code=500, detail="FLOWISE_CHATFLOW_ID not configured")
    
    start_time = time.time()
    receipts = []
    output_text = ""
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FLOWISE_URL}/api/v1/prediction/{CHATFLOW_ID}",
                json={"question": prompt},
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                output_text = data.get("text", data.get("answer", str(data)))
            else:
                output_text = f"Flowise error: {response.status_code}"
        
        # Generate receipt
        latency_ms = int((time.time() - start_time) * 1000)
        receipts.append({
            "action_id": f"act_fw_{int(time.time())}",
            "tool_name": "flowise_chatflow",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": "success",
            "input_hash": hash_data({"prompt": prompt}),
            "output_hash": hash_data({"response": output_text}),
            "latency_ms": latency_ms,
            "metadata": {
                "framework": "flowise",
                "chatflow_id": CHATFLOW_ID
            }
        })
        
    except Exception as e:
        output_text = f"Error: {str(e)}"
        latency_ms = int((time.time() - start_time) * 1000)
        receipts.append({
            "action_id": f"act_error_{int(time.time())}",
            "tool_name": "flowise_chatflow",
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
    return {
        "status": "ok", 
        "target": "flowise",
        "flowise_url": FLOWISE_URL,
        "chatflow_configured": bool(CHATFLOW_ID)
    }


if __name__ == "__main__":
    print("Starting Flowise Adapter on http://localhost:8004")
    print(f"Proxying to: {FLOWISE_URL}")
    print(f"Chatflow ID: {CHATFLOW_ID or 'NOT SET'}")
    uvicorn.run(app, host="0.0.0.0", port=8004)
