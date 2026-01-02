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

**✨ NEW: Drop-in LangChain adapter available!**

The F.A.I.L. Kit now includes dedicated adapters for LangChain (Python) and LangChain.js (JavaScript/TypeScript) that automatically generate receipts from tool executions.

### Quick Start with Adapter

**Python:**
```python
from fastapi import FastAPI
from fail_kit_langchain import create_fail_kit_endpoint, ReceiptGeneratingTool

app = FastAPI()

class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email"
    
    def _execute(self, to: str, subject: str):
        send_email(to, subject)
        return {"status": "sent"}

agent_executor = AgentExecutor(agent=agent, tools=[EmailTool()])
app.include_router(create_fail_kit_endpoint(agent_executor), prefix="/eval")
```

**JavaScript:**
```typescript
import { createFailKitRouter, ReceiptGeneratingTool } from '@fail-kit/langchain-adapter';

class EmailTool extends ReceiptGeneratingTool {
  name = 'email_sender';
  async _execute(input) {
    await sendEmail(input.to, input.subject);
    return { status: 'sent' };
  }
}

app.use('/eval', createFailKitRouter(agentExecutor));
```

**📚 See [LangChain Integration Guide](docs/LANGCHAIN_INTEGRATION.md) for complete documentation.**

**📦 Adapter locations:**
- Python: `middleware/langchain/python/`
- JavaScript: `middleware/langchain/javascript/`

**🎯 Examples:**
- [Python Example](examples/langchain-python/)
- [JavaScript Example](examples/langchain-javascript/)

### Manual Integration (Without Adapter)

If you prefer not to use the adapter, you can manually implement the endpoint:

**Python (LangChain + FastAPI):**

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

**JavaScript (LangChain.js + Express):**

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

## Semantic Kernel (Microsoft)

### Python

```python
from fastapi import FastAPI
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion
from semantic_kernel.functions import KernelFunction
import hashlib
import json
from datetime import datetime

app = FastAPI()

# Initialize Semantic Kernel
kernel = Kernel()
kernel.add_service(OpenAIChatCompletion(service_id="default"))

def hash_data(data):
    serialized = json.dumps(data, sort_keys=True)
    hash_hex = hashlib.sha256(serialized.encode()).hexdigest()
    return f"sha256:{hash_hex}"

# Define a plugin with functions
class EmailPlugin:
    @staticmethod
    async def send_email(to: str, subject: str) -> str:
        """Send an email"""
        # Your actual email logic
        return f"Email sent to {to}"

# Register the plugin
kernel.add_plugin(EmailPlugin(), "EmailPlugin")

@app.post("/eval/run")
async def evaluate(request: dict):
    prompt = request.get("inputs", {}).get("user", request.get("prompt", ""))
    
    # Create a function that logs actions
    actions = []
    
    # Execute with Semantic Kernel
    result = await kernel.invoke_prompt(
        function_name="process_request",
        plugin_name="core",
        prompt=prompt
    )
    
    # Extract function calls from kernel history
    if hasattr(result, 'function_results'):
        for func_result in result.function_results:
            tool_input = {"prompt": prompt, **func_result.arguments}
            tool_output = {"result": str(func_result.value)}
            
            actions.append({
                "action_id": f"act_{func_result.function.name}_{datetime.now().timestamp()}",
                "tool_name": func_result.function.name,
                "timestamp": datetime.now().isoformat(),
                "status": "success" if func_result.value else "failed",
                "input_hash": hash_data(tool_input),
                "output_hash": hash_data(tool_output),
                "latency_ms": 300,
                "metadata": {"function": func_result.function.name}
            })
    
    return {
        "outputs": {
            "final_text": str(result),
            "decision": "PASS"
        },
        "actions": actions,
        "policy": {
            "refuse": False,
            "abstain": False,
            "escalate": False,
            "reasons": []
        }
    }
```

### C# (.NET)

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

[ApiController]
[Route("eval")]
public class EvalController : ControllerBase
{
    private readonly Kernel _kernel;
    
    public EvalController()
    {
        var builder = Kernel.CreateBuilder();
        builder.AddOpenAIChatCompletion("gpt-4", Environment.GetEnvironmentVariable("OPENAI_API_KEY"));
        _kernel = builder.Build();
        
        // Register plugins
        _kernel.ImportPluginFromType<EmailPlugin>();
    }
    
    private string HashData(object data)
    {
        var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = false });
        var bytes = Encoding.UTF8.GetBytes(json);
        var hash = SHA256.HashData(bytes);
        return $"sha256:{BitConverter.ToString(hash).Replace("-", "").ToLower()}";
    }
    
    [HttpPost("run")]
    public async Task<IActionResult> Run([FromBody] EvalRequest request)
    {
        var prompt = request.Inputs?.User ?? request.Prompt ?? "";
        
        var actions = new List<ActionReceipt>();
        
        // Execute with function calling
        var settings = new OpenAIPromptExecutionSettings
        {
            ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
        };
        
        var result = await _kernel.InvokePromptAsync(prompt, new(settings));
        
        // Extract function invocations
        var functionResults = result.Metadata?["FunctionResults"] as List<FunctionResult>;
        if (functionResults != null)
        {
            foreach (var funcResult in functionResults)
            {
                var toolInput = new { prompt, arguments = funcResult.Arguments };
                var toolOutput = new { result = funcResult.Value?.ToString() };
                
                actions.Add(new ActionReceipt
                {
                    ActionId = $"act_{funcResult.FunctionName}_{DateTimeOffset.Now.ToUnixTimeMilliseconds()}",
                    ToolName = funcResult.FunctionName,
                    Timestamp = DateTime.UtcNow.ToString("O"),
                    Status = "success",
                    InputHash = HashData(toolInput),
                    OutputHash = HashData(toolOutput),
                    LatencyMs = 300,
                    Metadata = new { function = funcResult.FunctionName }
                });
            }
        }
        
        return Ok(new
        {
            outputs = new
            {
                final_text = result.ToString(),
                decision = "PASS"
            },
            actions,
            policy = new
            {
                refuse = false,
                abstain = false,
                escalate = false,
                reasons = new string[] { }
            }
        });
    }
}

public class EmailPlugin
{
    [KernelFunction, Description("Send an email")]
    public string SendEmail(string to, string subject)
    {
        // Your actual email logic
        return $"Email sent to {to}";
    }
}
```

---

## Bare OpenAI API (No Framework)

If you're using the OpenAI API directly without a framework:

### Python + FastAPI

```python
from fastapi import FastAPI
from openai import OpenAI
import hashlib
import json
from datetime import datetime

app = FastAPI()
client = OpenAI(api_key="your-api-key")

def hash_data(data):
    """Generate SHA256 hash for receipts"""
    serialized = json.dumps(data, sort_keys=True)
    hash_hex = hashlib.sha256(serialized.encode()).hexdigest()
    return f"sha256:{hash_hex}"

@app.post("/eval/run")
async def evaluate(request: dict):
    prompt = request.get("inputs", {}).get("user", request.get("prompt", ""))
    
    # Define tools
    tools = [
        {
            "type": "function",
            "function": {
                "name": "send_email",
                "description": "Send an email",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "to": {"type": "string"},
                        "subject": {"type": "string"}
                    }
                }
            }
        }
    ]
    
    # Call OpenAI
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        tools=tools
    )
    
    actions = []
    message = response.choices[0].message
    
    # Check if tools were called
    if message.tool_calls:
        for tool_call in message.tool_calls:
            tool_input = json.loads(tool_call.function.arguments)
            
            # Execute the actual tool
            if tool_call.function.name == "send_email":
                tool_output = {"status": "sent", "message_id": f"msg_{tool_call.id}"}
            else:
                tool_output = {"status": "unknown"}
            
            # Generate receipt per RECEIPT_SCHEMA.json
            actions.append({
                "action_id": f"act_{tool_call.id}",
                "tool_name": tool_call.function.name,
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "input_hash": hash_data(tool_input),
                "output_hash": hash_data(tool_output),
                "latency_ms": 250,
                "metadata": tool_output
            })
    
    return {
        "outputs": {
            "final_text": message.content or "I completed the requested actions.",
            "decision": "PASS"
        },
        "actions": actions,
        "policy": {
            "refuse": False,
            "abstain": False,
            "escalate": False,
            "reasons": []
        }
    }
```

### Node.js + Express

```javascript
const express = require('express');
const OpenAI = require('openai');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function hashData(data) {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');
  return `sha256:${hash}`;
}

app.post('/eval/run', async (req, res) => {
  const prompt = req.body.inputs?.user || req.body.prompt || '';
  
  // Define tools
  const tools = [
    {
      type: 'function',
      function: {
        name: 'send_email',
        description: 'Send an email',
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'string' },
            subject: { type: 'string' }
          }
        }
      }
    }
  ];
  
  // Call OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    tools
  });
  
  const actions = [];
  const message = response.choices[0].message;
  
  // Check if tools were called
  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      const toolInput = JSON.parse(toolCall.function.arguments);
      
      // Execute the actual tool
      let toolOutput;
      if (toolCall.function.name === 'send_email') {
        toolOutput = { status: 'sent', message_id: `msg_${toolCall.id}` };
      } else {
        toolOutput = { status: 'unknown' };
      }
      
      // Generate receipt per RECEIPT_SCHEMA.json
      actions.push({
        action_id: `act_${toolCall.id}`,
        tool_name: toolCall.function.name,
        timestamp: new Date().toISOString(),
        status: 'success',
        input_hash: hashData(toolInput),
        output_hash: hashData(toolOutput),
        latency_ms: 250,
        metadata: toolOutput
      });
    }
  }
  
  res.json({
    outputs: {
      final_text: message.content || 'I completed the requested actions.',
      decision: 'PASS'
    },
    actions,
    policy: {
      refuse: false,
      abstain: false,
      escalate: false,
      reasons: []
    }
  });
});

app.listen(8000);
```

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
