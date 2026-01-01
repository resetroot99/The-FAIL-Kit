"""
LangChain Receipt Integration Example
Generate receipts for LangChain agent tool calls
"""

from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.tools import BaseTool
from langchain_openai import ChatOpenAI
from receipt_standard import generate_receipt
import time

class ReceiptGeneratingTool(BaseTool):
    """Wrapper that generates receipts for tool invocations"""
    
    def _run(self, *args, **kwargs):
        """Execute tool and generate receipt"""
        input_data = {"args": args, "kwargs": kwargs}
        start_time = time.time()
        
        try:
            # Call the actual tool logic
            output_data = self._execute(*args, **kwargs)
            status = "success"
            error_message = None
        except Exception as e:
            output_data = {"error": str(e)}
            status = "failed"
            error_message = str(e)
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Generate receipt
        receipt = generate_receipt(
            tool_name=self.name,
            input_data=input_data,
            output_data=output_data,
            status=status,
            latency_ms=latency_ms,
            error_message=error_message
        )
        
        # Store receipt for later retrieval
        self._last_receipt = receipt
        
        if status == "failed":
            raise Exception(error_message)
        
        return output_data
    
    def _execute(self, *args, **kwargs):
        """Override this with your tool logic"""
        raise NotImplementedError

# Example usage
class EmailTool(ReceiptGeneratingTool):
    name = "email_sender"
    description = "Send an email to a recipient"
    
    def _execute(self, to: str, subject: str, body: str):
        # Your email sending logic here
        result = send_email_api(to, subject, body)
        return {"message_id": result.id, "status": "sent"}

# Create agent with receipt-generating tools
llm = ChatOpenAI(model="gpt-4")
tools = [EmailTool()]
agent = create_openai_functions_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools)

# Run agent and collect receipts
result = agent_executor.invoke({"input": "Email my boss that the project is done"})

# Extract receipts from tools
receipts = [tool._last_receipt for tool in tools if hasattr(tool, '_last_receipt')]

# Return with receipts
response = {
    "outputs": {
        "final_text": result["output"],
        "decision": "PASS"
    },
    "actions": receipts
}
