"""
FastAPI Receipt Integration Example
Add receipt generation to FastAPI endpoints
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from receipt_standard import generate_receipt, validate_receipt
import time
from typing import Any, Dict, List, Callable

app = FastAPI()

class AgentRequest(BaseModel):
    prompt: str
    
class AgentResponse(BaseModel):
    outputs: Dict[str, Any]
    actions: List[Dict[str, Any]]

async def with_receipt(
    tool_name: str,
    input_data: Dict[str, Any],
    tool_function: Callable
) -> Dict[str, Any]:
    """Wrapper that generates receipts for tool invocations"""
    start_time = time.time()
    
    try:
        output_data = await tool_function(input_data)
        status = "success"
        error_message = None
    except Exception as e:
        output_data = {"error": str(e)}
        status = "failed"
        error_message = str(e)
    
    latency_ms = int((time.time() - start_time) * 1000)
    
    receipt = generate_receipt(
        tool_name=tool_name,
        input_data=input_data,
        output_data=output_data,
        status=status,
        latency_ms=latency_ms,
        error_message=error_message
    )
    
    return {
        "output_data": output_data,
        "receipt": receipt,
        "status": status
    }

@app.post("/agent/send-email")
async def send_email_endpoint(to: str, subject: str, body: str):
    """Send email with receipt generation"""
    
    result = await with_receipt(
        tool_name="email_sender",
        input_data={"to": to, "subject": subject, "body": body},
        tool_function=send_email_api
    )
    
    if result["status"] == "failed":
        raise HTTPException(status_code=500, detail="Email send failed")
    
    return {
        "outputs": {
            "final_text": f"Email sent successfully to {to}",
            "decision": "PASS"
        },
        "actions": [result["receipt"]]
    }

@app.post("/agent/run", response_model=AgentResponse)
async def run_agent(request: AgentRequest):
    """Main agent endpoint with receipt collection"""
    receipts = []
    
    # Simplified intent parsing
    if "email" in request.prompt.lower():
        result = await with_receipt(
            tool_name="email_sender",
            input_data={"to": "user@example.com", "subject": "Hello", "body": "Test"},
            tool_function=send_email_api
        )
        receipts.append(result["receipt"])
    
    if "ticket" in request.prompt.lower():
        result = await with_receipt(
            tool_name="ticket_creator",
            input_data={"title": "New issue", "priority": "high"},
            tool_function=create_ticket_api
        )
        receipts.append(result["receipt"])
    
    # Validate all receipts
    for receipt in receipts:
        validation = validate_receipt(receipt)
        if not validation["valid"]:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid receipt: {validation['errors']}"
            )
    
    return {
        "outputs": {
            "final_text": f"Completed {len(receipts)} actions",
            "decision": "PASS"
        },
        "actions": receipts
    }

# Example tool implementations
async def send_email_api(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Stub email API"""
    # Your email sending logic here
    return {"message_id": "msg_123", "status": "sent"}

async def create_ticket_api(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Stub ticket API"""
    # Your ticket creation logic here
    return {"ticket_id": "ticket_456", "status": "created"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
