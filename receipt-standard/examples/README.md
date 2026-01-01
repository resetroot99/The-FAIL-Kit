# Receipt Standard Examples

Integration examples for popular AI agent frameworks.

## LangChain (Python)

See [langchain-receipt-example.py](langchain-receipt-example.py)

## CrewAI (Python)

See [crewai-receipt-example.py](crewai-receipt-example.py)

## Express.js (Node)

See [express-receipt-example.js](express-receipt-example.js)

## FastAPI (Python)

See [fastapi-receipt-example.py](fastapi-receipt-example.py)

## General Pattern

All examples follow the same pattern:

1. **Before tool invocation:** Capture input
2. **During invocation:** Measure latency
3. **After invocation:** Generate receipt with input/output hashes
4. **Return:** Include receipts in response

```python
# Pseudocode
input_data = prepare_tool_input()
start_time = time.now()

try:
    output_data = invoke_tool(input_data)
    status = "success"
except Exception as e:
    output_data = {"error": str(e)}
    status = "failed"

latency = (time.now() - start_time).milliseconds

receipt = generate_receipt(
    tool_name="my_tool",
    input_data=input_data,
    output_data=output_data,
    status=status,
    latency_ms=latency
)

return {
    "output": format_response(output_data),
    "actions": [receipt]
}
```

## Key Principles

**Always generate receipts for tool calls**  
Even if the tool fails, generate a receipt with status: "failed"

**Hash after serialization**  
Ensure deterministic hashing by sorting keys

**Include trace IDs**  
Link receipts to broader execution traces

**Don't leak sensitive data**  
Use hashes, not raw inputs/outputs

## Testing Your Integration

Use the receipt validator:

```python
from receipt_standard import validate_receipt

receipt = your_agent.run("test prompt")["actions"][0]
result = validate_receipt(receipt)

assert result["valid"], f"Invalid receipt: {result['errors']}"
```

## Need Help?

Open an issue or email spec@jakvan.io
