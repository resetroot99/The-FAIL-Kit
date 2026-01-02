"""
F.A.I.L. Kit FastAPI Example

A simple document search agent that demonstrates
proper action receipts for API operations.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any
import hashlib

app = FastAPI(
    title="F.A.I.L. Kit FastAPI Example",
    description="Demo agent for F.A.I.L. Kit testing",
    version="1.0.0"
)

# =============================================================================
# Mock Database
# =============================================================================

DOCUMENTS = {
    "doc-001": {
        "id": "doc-001",
        "title": "Company Policy",
        "content": "All employees must complete security training within 30 days of hire.",
        "category": "policy"
    },
    "doc-002": {
        "id": "doc-002", 
        "title": "Expense Guidelines",
        "content": "Travel expenses over $500 require manager approval before booking.",
        "category": "finance"
    },
    "doc-003": {
        "id": "doc-003",
        "title": "Remote Work Policy",
        "content": "Employees may work remotely up to 3 days per week with manager approval.",
        "category": "policy"
    }
}

# =============================================================================
# Request/Response Models
# =============================================================================

class EvalRequest(BaseModel):
    inputs: Dict[str, str]
    context: Optional[Dict[str, Any]] = None

class ActionReceipt(BaseModel):
    action_id: str
    tool_name: str
    timestamp: str
    status: str
    input_hash: Optional[str] = None
    output_hash: Optional[str] = None
    latency_ms: int
    metadata: Optional[Dict[str, Any]] = None

class PolicyResponse(BaseModel):
    escalate: bool
    reasons: List[str]

class EvalResponse(BaseModel):
    outputs: Dict[str, Any]
    actions: List[ActionReceipt]
    policy: Optional[PolicyResponse] = None

# =============================================================================
# Helper Functions
# =============================================================================

def hash_content(content: str) -> str:
    """Generate a hash for content verification."""
    return f"sha256:{hashlib.sha256(content.encode()).hexdigest()[:16]}"

def search_documents(query: str) -> tuple[List[Dict], int]:
    """Search documents and return matches with latency."""
    start_time = datetime.now()
    
    query_lower = query.lower()
    matches = []
    
    for doc in DOCUMENTS.values():
        if (query_lower in doc["title"].lower() or 
            query_lower in doc["content"].lower() or
            query_lower in doc["category"].lower()):
            matches.append(doc)
    
    latency = int((datetime.now() - start_time).total_seconds() * 1000)
    return matches, latency

# =============================================================================
# Agent Logic
# =============================================================================

async def document_agent(prompt: str, context: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Simple document search agent.
    
    - Searches internal documents
    - Returns proper action receipts
    - Escalates delete/modify requests
    """
    actions = []
    prompt_lower = prompt.lower()
    
    # Check for high-stakes operations
    high_stakes_keywords = ["delete", "remove", "modify", "edit", "update"]
    if any(kw in prompt_lower for kw in high_stakes_keywords):
        return {
            "response": "Document modifications require admin approval. I've escalated your request.",
            "actions": [],
            "policy": {
                "escalate": True,
                "reasons": ["document modification requires approval", "high-stakes operation"]
            }
        }
    
    # Search documents
    matches, latency = search_documents(prompt)
    
    # Create action receipt for the search
    action = ActionReceipt(
        action_id=f"act_search_{int(datetime.now().timestamp())}",
        tool_name="document_search",
        timestamp=datetime.now().isoformat(),
        status="success",
        input_hash=hash_content(prompt),
        output_hash=hash_content(str(matches)) if matches else None,
        latency_ms=latency,
        metadata={
            "documents_found": len(matches),
            "query_terms": prompt.split()[:5]
        }
    )
    actions.append(action)
    
    # Generate response
    if matches:
        response_parts = ["I found the following documents:\n"]
        for doc in matches:
            response_parts.append(f"- **{doc['title']}**: {doc['content']}")
        response = "\n".join(response_parts)
    else:
        response = "I couldn't find any documents matching your query. Try searching for 'policy', 'expense', or 'remote work'."
    
    return {
        "response": response,
        "actions": [a.model_dump() for a in actions],
        "policy": None
    }

# =============================================================================
# Endpoints
# =============================================================================

@app.post("/eval/run", response_model=EvalResponse)
async def evaluate(request: EvalRequest):
    """
    F.A.I.L. Kit evaluation endpoint.
    
    This endpoint is called by the F.A.I.L. Kit CLI to audit your agent.
    """
    prompt = request.inputs.get("user", "")
    context = request.context
    
    result = await document_agent(prompt, context)
    
    return EvalResponse(
        outputs={
            "final_text": result["response"],
            "decision": "PASS" if not result.get("policy") else "NEEDS_REVIEW"
        },
        actions=[ActionReceipt(**a) for a in result["actions"]],
        policy=PolicyResponse(**result["policy"]) if result.get("policy") else None
    )

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}

@app.get("/")
async def root():
    """Root endpoint with usage info."""
    return {
        "name": "F.A.I.L. Kit FastAPI Example",
        "endpoints": {
            "POST /eval/run": "F.A.I.L. Kit evaluation endpoint",
            "GET /health": "Health check"
        },
        "test_command": 'curl -X POST http://localhost:8000/eval/run -H "Content-Type: application/json" -d \'{"inputs": {"user": "Find expense policy"}}\''
    }

# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    print("""
╔══════════════════════════════════════════════════════════════╗
║  F.A.I.L. Kit FastAPI Example                                ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:8000                     ║
║  F.A.I.L. Kit endpoint: http://localhost:8000/eval/run       ║
║  Health check: http://localhost:8000/health                  ║
║  Docs: http://localhost:8000/docs                            ║
╠══════════════════════════════════════════════════════════════╣
║  To run the audit:                                           ║
║    fail-audit scan && fail-audit run --format html           ║
╚══════════════════════════════════════════════════════════════╝
    """)
    uvicorn.run(app, host="0.0.0.0", port=8000)
