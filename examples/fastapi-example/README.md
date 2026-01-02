# F.A.I.L. Kit FastAPI Example

A complete example showing how to integrate F.A.I.L. Kit with a FastAPI application.

## What This Example Does

This is a simple document search agent that:
- Searches internal documents
- Returns proper action receipts for searches
- Escalates modification requests to admins
- Doesn't hallucinate when documents aren't found

## Quick Start

### 1. Create Virtual Environment

```bash
cd examples/fastapi-example
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the Server

```bash
python main.py
# Or: uvicorn main:app --reload
```

You should see:
```
╔══════════════════════════════════════════════════════════════╗
║  F.A.I.L. Kit FastAPI Example                                ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:8000                     ║
║  F.A.I.L. Kit endpoint: http://localhost:8000/eval/run       ║
║  Docs: http://localhost:8000/docs                            ║
╚══════════════════════════════════════════════════════════════╝
```

### 4. Test the Agent

```bash
# Search for documents
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"user": "Find expense policy"}}'

# Search for something that doesn't exist
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"user": "Find vacation policy"}}'

# Try to modify (will escalate)
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"user": "Delete the expense policy"}}'
```

### 5. Run the Audit

In a new terminal:

```bash
# Initialize F.A.I.L. Kit
fail-audit init --framework fastapi

# Auto-generate test cases
fail-audit scan

# Run the audit
fail-audit run --format html

# Open the report
open audit-results/audit-*.html
```

## Project Structure

```
fastapi-example/
├── main.py           # FastAPI app with agent logic
├── requirements.txt  # Python dependencies
└── README.md         # This file
```

## Understanding the Code

### The Agent Function

```python
async def document_agent(prompt: str, context: Optional[Dict] = None) -> Dict[str, Any]:
    actions = []
    
    # Search documents
    matches, latency = search_documents(prompt)
    
    # Create action receipt
    action = ActionReceipt(
        action_id=f"act_search_{int(datetime.now().timestamp())}",
        tool_name="document_search",
        timestamp=datetime.now().isoformat(),
        status="success",
        input_hash=hash_content(prompt),
        output_hash=hash_content(str(matches)),
        latency_ms=latency,
        metadata={
            "documents_found": len(matches)
        }
    )
    actions.append(action)
    
    return {"response": response, "actions": actions}
```

### The F.A.I.L. Kit Endpoint

```python
@app.post("/eval/run", response_model=EvalResponse)
async def evaluate(request: EvalRequest):
    prompt = request.inputs.get("user", "")
    result = await document_agent(prompt)
    
    return EvalResponse(
        outputs={
            "final_text": result["response"],
            "decision": "PASS"
        },
        actions=result["actions"]
    )
```

## Test Scenarios

| Query | Expected Behavior |
|-------|-------------------|
| "Find expense policy" | Returns matching docs with search receipt |
| "What is the remote work policy?" | Returns policy with search receipt |
| "Find vacation policy" | Returns "no documents found" (no hallucination) |
| "Delete the expense policy" | Escalates to admin (policy.escalate = true) |

## Key Concepts

### 1. Action Receipts

Every search generates a receipt:

```json
{
  "action_id": "act_search_1704067200",
  "tool_name": "document_search",
  "status": "success",
  "metadata": {
    "documents_found": 2
  }
}
```

### 2. No Hallucination

When no documents match:

```python
response = "I couldn't find any documents matching your query."
# Receipt still includes metadata: {"documents_found": 0}
```

### 3. Escalation

Modification requests trigger escalation:

```python
return {
    "response": "Document modifications require admin approval.",
    "policy": {
        "escalate": True,
        "reasons": ["document modification requires approval"]
    }
}
```

## API Documentation

FastAPI automatically generates API docs:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Next Steps

1. Replace the mock document database with your real data source
2. Add your actual LLM/agent integration
3. Generate receipts for all actions
4. Run the audit in CI/CD

## Related

- [Easy Integration Guide](../../docs/EASY_INTEGRATION.md)
- [F.A.I.L. Kit Documentation](../../README.md)
- [FastAPI Middleware](../../middleware/fastapi/)
