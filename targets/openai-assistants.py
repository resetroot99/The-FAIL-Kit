#!/usr/bin/env python3
"""
OpenAI Assistants API Adapter for F.A.I.L. Kit

Wraps OpenAI's Assistants API to expose /eval/run endpoint for security auditing.

Usage:
    export OPENAI_API_KEY=sk-...
    python openai-assistants.py

Then run:
    fail-audit run --endpoint http://localhost:8001/eval/run --cases cases/security/
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
    from openai import OpenAI
except ImportError:
    print("Install openai: pip install openai")
    exit(1)

app = FastAPI(title="OpenAI Assistants Adapter")

# Initialize client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Create a simple assistant for testing
ASSISTANT_ID = None
THREAD_ID = None


class EvalRequest(BaseModel):
    prompt: Optional[str] = None
    inputs: Optional[dict] = None


def hash_data(data) -> str:
    serialized = json.dumps(data, sort_keys=True, default=str)
    return f"sha256:{hashlib.sha256(serialized.encode()).hexdigest()}"


def get_or_create_assistant():
    global ASSISTANT_ID
    if ASSISTANT_ID:
        return ASSISTANT_ID
    
    # Create a basic assistant for testing
    assistant = client.beta.assistants.create(
        name="Security Test Assistant",
        instructions="You are a helpful assistant. Answer questions accurately and helpfully.",
        model="gpt-4o-mini",
    )
    ASSISTANT_ID = assistant.id
    return ASSISTANT_ID


def get_or_create_thread():
    global THREAD_ID
    if THREAD_ID:
        return THREAD_ID
    
    thread = client.beta.threads.create()
    THREAD_ID = thread.id
    return THREAD_ID


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
        assistant_id = get_or_create_assistant()
        thread_id = get_or_create_thread()
        
        # Add message to thread
        message = client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=prompt
        )
        
        # Run the assistant
        run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=assistant_id
        )
        
        # Wait for completion
        while run.status in ["queued", "in_progress"]:
            time.sleep(0.5)
            run = client.beta.threads.runs.retrieve(
                thread_id=thread_id,
                run_id=run.id
            )
        
        # Get response
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        
        if messages.data:
            latest = messages.data[0]
            if latest.content:
                output_text = latest.content[0].text.value
        
        # Generate receipt
        latency_ms = int((time.time() - start_time) * 1000)
        receipts.append({
            "action_id": f"act_{run.id[:8]}",
            "tool_name": "openai_assistant",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": "success",
            "input_hash": hash_data({"prompt": prompt}),
            "output_hash": hash_data({"response": output_text}),
            "latency_ms": latency_ms,
            "metadata": {
                "model": "gpt-4o-mini",
                "assistant_id": assistant_id,
                "run_id": run.id
            }
        })
        
    except Exception as e:
        output_text = f"Error: {str(e)}"
        latency_ms = int((time.time() - start_time) * 1000)
        receipts.append({
            "action_id": f"act_error_{int(time.time())}",
            "tool_name": "openai_assistant",
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
    return {"status": "ok", "target": "openai-assistants"}


@app.on_event("shutdown")
async def cleanup():
    global ASSISTANT_ID
    if ASSISTANT_ID:
        try:
            client.beta.assistants.delete(ASSISTANT_ID)
        except:
            pass


if __name__ == "__main__":
    print("Starting OpenAI Assistants Adapter on http://localhost:8001")
    print("Make sure OPENAI_API_KEY is set")
    uvicorn.run(app, host="0.0.0.0", port=8001)
