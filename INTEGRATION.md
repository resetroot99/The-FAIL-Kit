# Integration Guide

How to add the F.A.I.L. Kit evaluation endpoint to your existing agent codebase.

## The Pattern

The kit needs a single HTTP endpoint that accepts a prompt and returns a structured response. That's it.

**Endpoint:** `POST /eval/run`

**Request:**
```json
{
  "prompt": "Send an email to john@example.com",
  "context": {}
}
```

**Response:**
```json
{
  "response": "I sent the email.",
  "actions": [{
    "tool": "email_sender",
    "status": "success"
  }],
  "receipts": [{
    "timestamp": "2025-01-01T00:00:00.000Z",
    "tool": "email_sender",
    "status": "success",
    "message_id": "msg_123",
    "proof": "SMTP confirmation received"
  }]
}
```

Add this endpoint to your agent, point the F.A.I.L. Kit at it, and run the audit.

---

## LangChain

### Python (LangChain + FastAPI)

```python
from fastapi import FastAPI
from langchain.agents import AgentExecutor
from langchain.tools import Tool
from datetime import datetime

app = FastAPI()

# Your existing LangChain agent
agent_executor = AgentExecutor(...)

@app.post("/eval/run")
async def evaluate(request: dict):
    prompt = request["prompt"]
    
    # Run the agent
    result = await agent_executor.ainvoke({"input": prompt})
    
    # Extract actions and receipts from intermediate steps
    actions = []
    receipts = []
    
    if "intermediate_steps" in result:
        for action, observation in result["intermediate_steps"]:
            actions.append({
                "tool": action.tool,
                "input": action.tool_input,
                "output": observation
            })
            
            # Generate receipt for each action
            receipts.append({
                "timestamp": datetime.now().isoformat(),
                "tool": action.tool,
                "status": "success" if observation else "failed",
                "proof": f"Tool returned: {observation}"
            })
    
    return {
        "response": result.get("output", ""),
        "actions": actions,
        "receipts": receipts
    }
```

### JavaScript (LangChain.js + Express)

```javascript
const express = require('express');
const { AgentExecutor } = require('langchain/agents');

const app = express();
app.use(express.json());

// Your existing LangChain agent
const agentExecutor = new AgentExecutor({...});

app.post('/eval/run', async (req, res) => {
  const { prompt } = req.body;
  
  // Run the agent
  const result = await agentExecutor.call({ input: prompt });
  
  // Extract actions and receipts
  const actions = [];
  const receipts = [];
  
  if (result.intermediateSteps) {
    for (const step of result.intermediateSteps) {
      actions.push({
        tool: step.action.tool,
        input: step.action.toolInput,
        output: step.observation
      });
      
      receipts.push({
        timestamp: new Date().toISOString(),
        tool: step.action.tool,
        status: step.observation ? 'success' : 'failed',
        proof: `Tool returned: ${step.observation}`
      });
    }
  }
  
  res.json({
    response: result.output,
    actions,
    receipts
  });
});

app.listen(8000);
```

---

## CrewAI

```python
from fastapi import FastAPI
from crewai import Crew, Agent, Task
from datetime import datetime

app = FastAPI()

# Your existing CrewAI setup
crew = Crew(agents=[...], tasks=[...])

@app.post("/eval/run")
async def evaluate(request: dict):
    prompt = request["prompt"]
    
    # Run the crew
    result = crew.kickoff(inputs={"prompt": prompt})
    
    # CrewAI doesn't expose intermediate steps by default
    # You need to instrument your tools to log actions
    
    # Option 1: Use a global action log
    from your_tools import action_log
    
    actions = []
    receipts = []
    
    for logged_action in action_log:
        actions.append({
            "tool": logged_action["tool"],
            "input": logged_action["input"],
            "output": logged_action["output"]
        })
        
        receipts.append({
            "timestamp": logged_action["timestamp"],
            "tool": logged_action["tool"],
            "status": logged_action["status"],
            "proof": logged_action.get("proof", "")
        })
    
    # Clear the log for next run
    action_log.clear()
    
    return {
        "response": str(result),
        "actions": actions,
        "receipts": receipts
    }
```

**Instrumenting CrewAI Tools:**

```python
# your_tools.py
from crewai import Tool
from datetime import datetime

# Global action log (thread-safe in production)
action_log = []

def send_email_tool(to: str, subject: str, body: str) -> str:
    # Your actual email logic
    result = send_email(to, subject, body)
    
    # Log the action
    action_log.append({
        "timestamp": datetime.now().isoformat(),
        "tool": "send_email",
        "input": {"to": to, "subject": subject},
        "output": result,
        "status": "success" if result else "failed",
        "proof": f"Message ID: {result.message_id}"
    })
    
    return f"Email sent to {to}"

email_tool = Tool(
    name="send_email",
    func=send_email_tool,
    description="Send an email"
)
```

---

## AutoGPT

```python
from fastapi import FastAPI
from autogpt.agent import Agent
from datetime import datetime

app = FastAPI()

# Your existing AutoGPT agent
agent = Agent(...)

@app.post("/eval/run")
async def evaluate(request: dict):
    prompt = request["prompt"]
    
    # Run the agent
    result = agent.run(prompt)
    
    # AutoGPT logs actions internally
    # Access the action history
    actions = []
    receipts = []
    
    for action in agent.action_history:
        actions.append({
            "tool": action.command,
            "input": action.args,
            "output": action.result
        })
        
        receipts.append({
            "timestamp": action.timestamp.isoformat(),
            "tool": action.command,
            "status": "success" if action.result else "failed",
            "proof": f"Command executed: {action.command}"
        })
    
    return {
        "response": result,
        "actions": actions,
        "receipts": receipts
    }
```

---

## Custom Agent (No Framework)

### Python

```python
from fastapi import FastAPI
from datetime import datetime

app = FastAPI()

@app.post("/eval/run")
async def evaluate(request: dict):
    prompt = request["prompt"]
    
    # Your agent logic
    response_text, actions_taken = await your_agent.process(prompt)
    
    # Generate receipts for each action
    receipts = []
    for action in actions_taken:
        receipts.append({
            "timestamp": datetime.now().isoformat(),
            "tool": action["tool"],
            "status": action["status"],
            "proof": action.get("proof", "Action completed")
        })
    
    return {
        "response": response_text,
        "actions": actions_taken,
        "receipts": receipts
    }
```

### Node.js

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/eval/run', async (req, res) => {
  const { prompt } = req.body;
  
  // Your agent logic
  const { response, actions } = await yourAgent.process(prompt);
  
  // Generate receipts
  const receipts = actions.map(action => ({
    timestamp: new Date().toISOString(),
    tool: action.tool,
    status: action.status,
    proof: action.proof || 'Action completed'
  }));
  
  res.json({
    response,
    actions,
    receipts
  });
});

app.listen(8000);
```

---

## Receipt Generation Best Practices

### What Makes a Good Receipt

A receipt proves an action happened. It should include:

1. **Timestamp** - When the action occurred
2. **Tool name** - What tool was used
3. **Status** - Success or failure
4. **Proof** - Evidence the action happened (message ID, transaction ID, file hash, API response)

**Good receipt:**
```json
{
  "timestamp": "2025-01-01T12:00:00.000Z",
  "tool": "email_sender",
  "status": "success",
  "message_id": "msg_abc123",
  "proof": "SMTP server returned 250 OK"
}
```

**Bad receipt:**
```json
{
  "tool": "email",
  "status": "ok"
}
```

### When to Generate Receipts

Generate a receipt for every external action:
- Sending emails
- Making API calls
- Writing files
- Updating databases
- Transferring money
- Creating tickets
- Scheduling events

Do not generate receipts for:
- Internal reasoning steps
- Memory lookups
- Planning
- Text generation

### Where to Store Receipts

**Option 1: In-memory (for evaluation)**
Store receipts in a list during agent execution, return them with the response.

**Option 2: Database (for production)**
Log receipts to a database for audit trails and compliance.

**Option 3: Both**
Log to database and return with response.

---

## Testing Your Integration

### Step 1: Start Your Agent

```bash
# Python
uvicorn your_agent:app --port 8000

# Node.js
node your_agent.js
```

### Step 2: Test the Endpoint Manually

```bash
curl -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Send an email to test@example.com"}'
```

Verify the response includes `actions` and `receipts`.

### Step 3: Run the F.A.I.L. Kit Audit

```bash
cd /path/to/The-FAIL-Kit
fail-audit init
# Edit fail-audit.config.json to point to http://localhost:8000/eval/run
fail-audit run
```

### Step 4: Review Failures

The audit will tell you which tests failed and why. Common failures:

- "Agent claimed action without receipt"
- "Tool failure not escalated"
- "High-stakes request not reviewed"

Fix your code and run the audit again.

---

## Common Issues

### "ECONNREFUSED"
Your agent is not running. Start it first.

### "Response missing 'receipts' field"
Your endpoint is not returning receipts. Add receipt generation.

### "All tests failed"
Your response format is wrong. Check the expected schema.

### "Agent timeout"
Your agent is taking too long. Increase the timeout in `fail-audit.config.json`.

---

## Next Steps

Once your integration is working:

1. Run the baseline audit (50 generic cases)
2. Generate custom cases for your specific tools (see CUSTOM_CASES.md)
3. Add the audit to your CI/CD pipeline
4. Enforce gates in production (see middleware/)

No trace, no ship.
