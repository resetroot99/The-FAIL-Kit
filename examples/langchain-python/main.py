"""
Complete LangChain + FastAPI Example with F.A.I.L. Kit Integration

This example shows a full working agent with:
- Custom tools with receipt generation
- FastAPI endpoint for F.A.I.L. Kit audits
- Email and calendar scheduling capabilities
"""

from fastapi import FastAPI
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
import os

# Import F.A.I.L. Kit adapter
import sys
sys.path.append('../../middleware/langchain/python')
from fail_kit_langchain import (
    create_fail_kit_endpoint,
    ReceiptGeneratingTool,
    FailKitConfig
)

# ============================================================================
# Define Tools with Automatic Receipt Generation
# ============================================================================

class EmailTool(ReceiptGeneratingTool):
    """Send emails with receipt tracking"""
    
    name = "email_sender"
    description = """Send an email to a recipient. 
    Input should be a dict with 'to', 'subject', and 'body' fields."""
    
    def _execute(self, to: str, subject: str, body: str):
        """
        Simulate sending an email.
        In production, replace with actual email service (SendGrid, SES, etc.)
        """
        # Simulate email sending
        message_id = f"msg_{hash(to + subject)}"
        
        print(f"📧 Sending email to {to}")
        print(f"   Subject: {subject}")
        print(f"   Body: {body[:50]}...")
        
        # Return structured output with metadata
        return {
            "status": "sent",
            "message_id": message_id,
            "to": to,
            "metadata": {
                "smtp_server": "smtp.example.com",
                "priority": "normal",
                "encrypted": True
            }
        }


class CalendarTool(ReceiptGeneratingTool):
    """Schedule calendar events with receipt tracking"""
    
    name = "calendar_scheduler"
    description = """Schedule a calendar event.
    Input should be a dict with 'title', 'date', 'time', and 'attendees' fields."""
    
    def _execute(self, title: str, date: str, time: str, attendees: str):
        """
        Simulate scheduling a calendar event.
        In production, replace with Google Calendar API, Outlook API, etc.
        """
        event_id = f"evt_{hash(title + date)}"
        
        print(f"📅 Scheduling event: {title}")
        print(f"   Date: {date} at {time}")
        print(f"   Attendees: {attendees}")
        
        return {
            "status": "scheduled",
            "event_id": event_id,
            "title": title,
            "date": date,
            "time": time,
            "metadata": {
                "calendar": "primary",
                "timezone": "America/New_York",
                "reminders": ["15m", "1h"]
            }
        }


class DatabaseTool(ReceiptGeneratingTool):
    """Database operations with receipt tracking"""
    
    name = "database_writer"
    description = """Write data to the database.
    Input should be a dict with 'table', 'operation', and 'data' fields."""
    
    def _execute(self, table: str, operation: str, data: dict):
        """
        Simulate database write.
        In production, replace with actual database calls.
        """
        # Simulate error for demonstration
        if operation == "delete" and "critical" in str(data):
            raise ValueError("Cannot delete critical data without confirmation")
        
        record_id = f"rec_{hash(str(data))}"
        
        print(f"💾 Database {operation}: {table}")
        print(f"   Data: {data}")
        
        return {
            "status": "success",
            "operation": operation,
            "record_id": record_id,
            "table": table,
            "metadata": {
                "database": "production",
                "affected_rows": 1
            }
        }


# ============================================================================
# Create the Agent
# ============================================================================

# Initialize LLM
llm = ChatOpenAI(
    model="gpt-4",
    temperature=0,
    api_key=os.getenv("OPENAI_API_KEY")
)

# Create tools
tools = [
    EmailTool(),
    CalendarTool(),
    DatabaseTool()
]

# Create prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful AI assistant that can send emails, 
    schedule calendar events, and write to databases.
    
    When you take an action, always confirm what you did with specific details.
    If a tool fails, explain the error to the user clearly."""),
    ("user", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

# Create agent
agent = create_openai_functions_agent(llm, tools, prompt)

# Create agent executor with intermediate steps enabled (required for receipts)
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    return_intermediate_steps=True  # ← Required for receipt extraction
)


# ============================================================================
# Create FastAPI App with F.A.I.L. Kit Endpoint
# ============================================================================

app = FastAPI(
    title="LangChain Agent with F.A.I.L. Kit",
    description="Example agent with automatic receipt generation",
    version="1.0.0"
)

# Add F.A.I.L. Kit evaluation endpoint
app.include_router(
    create_fail_kit_endpoint(
        agent_executor,
        config=FailKitConfig(
            auto_receipts=True,
            include_metadata=True,
            track_latency=True
        )
    ),
    prefix="/eval",
    tags=["F.A.I.L. Kit Audit"]
)


# Optional: Add a test endpoint for manual testing
@app.post("/chat")
async def chat(prompt: str):
    """
    Simple chat endpoint for manual testing.
    Not used by F.A.I.L. Kit - just for convenience.
    """
    result = await agent_executor.ainvoke({"input": prompt})
    return {
        "response": result["output"],
        "steps": len(result.get("intermediate_steps", []))
    }


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "LangChain Agent with F.A.I.L. Kit",
        "endpoints": {
            "audit": "/eval/run",
            "chat": "/chat"
        }
    }


# ============================================================================
# Run the Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting LangChain agent with F.A.I.L. Kit integration")
    print("📍 Audit endpoint: http://localhost:8000/eval/run")
    print("💬 Chat endpoint: http://localhost:8000/chat")
    print()
    print("Test with:")
    print('  curl -X POST http://localhost:8000/eval/run \\')
    print('    -H "Content-Type: application/json" \\')
    print('    -d \'{"prompt": "Send an email to john@example.com saying hello"}\'')
    print()
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
