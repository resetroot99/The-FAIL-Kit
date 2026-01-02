#!/usr/bin/env python3
"""
LangChain Agent Adapter for F.A.I.L. Kit

Creates a LangChain ReAct agent with tools and exposes /eval/run for security auditing.

Usage:
    export OPENAI_API_KEY=sk-...
    python langchain-agent.py

Then run:
    fail-audit run --endpoint http://localhost:8003/eval/run --cases cases/security/
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
    from langchain_openai import ChatOpenAI
    from langchain.agents import AgentExecutor, create_react_agent
    from langchain.tools import Tool
    from langchain import hub
except ImportError:
    print("Install langchain: pip install langchain langchain-openai langchainhub")
    exit(1)

app = FastAPI(title="LangChain Agent Adapter")

# Initialize LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# Define some tools for testing
def search_tool(query: str) -> str:
    """Simulated search tool"""
    return f"Search results for: {query}"

def calculator_tool(expression: str) -> str:
    """Simulated calculator"""
    try:
        result = eval(expression)  # Intentionally unsafe for testing
        return str(result)
    except Exception as e:
        return f"Error: {e}"

def file_reader(path: str) -> str:
    """Simulated file reader"""
    # Intentionally no path validation for testing
    try:
        with open(path, 'r') as f:
            return f.read()[:500]
    except Exception as e:
        return f"Error reading file: {e}"

tools = [
    Tool(name="search", func=search_tool, description="Search for information"),
    Tool(name="calculator", func=calculator_tool, description="Calculate math expressions"),
    Tool(name="file_reader", func=file_reader, description="Read file contents"),
]

# Create agent
try:
    prompt = hub.pull("hwchase17/react")
    agent = create_react_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)
except Exception as e:
    print(f"Warning: Could not create agent: {e}")
    agent_executor = None


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
        if agent_executor:
            result = agent_executor.invoke({"input": prompt})
            output_text = result.get("output", "")
        else:
            # Fallback to direct LLM call
            response = llm.invoke(prompt)
            output_text = response.content
        
        # Generate receipt
        latency_ms = int((time.time() - start_time) * 1000)
        receipts.append({
            "action_id": f"act_lc_{int(time.time())}",
            "tool_name": "langchain_agent",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "status": "success",
            "input_hash": hash_data({"prompt": prompt}),
            "output_hash": hash_data({"response": output_text}),
            "latency_ms": latency_ms,
            "metadata": {
                "framework": "langchain",
                "agent_type": "react"
            }
        })
        
    except Exception as e:
        output_text = f"Error: {str(e)}"
        latency_ms = int((time.time() - start_time) * 1000)
        receipts.append({
            "action_id": f"act_error_{int(time.time())}",
            "tool_name": "langchain_agent",
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
    return {"status": "ok", "target": "langchain-agent"}


if __name__ == "__main__":
    print("Starting LangChain Agent Adapter on http://localhost:8003")
    print("Make sure OPENAI_API_KEY is set")
    uvicorn.run(app, host="0.0.0.0", port=8003)
