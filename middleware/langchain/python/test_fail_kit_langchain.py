"""Tests for F.A.I.L. Kit LangChain adapter"""

import pytest
from datetime import datetime
from fail_kit_langchain import (
    ReceiptGeneratingTool,
    hash_data,
    extract_receipts_from_agent_executor,
    wrap_tool_with_receipts
)


class TestHashData:
    """Test hash_data function"""
    
    def test_hash_consistency(self):
        """Hash should be consistent for same input"""
        data = {"key": "value", "number": 123}
        hash1 = hash_data(data)
        hash2 = hash_data(data)
        assert hash1 == hash2
    
    def test_hash_format(self):
        """Hash should be in correct format"""
        data = {"test": "data"}
        result = hash_data(data)
        assert result.startswith("sha256:")
        assert len(result) == 71  # "sha256:" + 64 hex chars
    
    def test_hash_different_data(self):
        """Different data should produce different hashes"""
        hash1 = hash_data({"a": 1})
        hash2 = hash_data({"a": 2})
        assert hash1 != hash2


class TestReceiptGeneratingTool:
    """Test ReceiptGeneratingTool base class"""
    
    def test_tool_execution_success(self):
        """Tool should generate receipt on successful execution"""
        class TestTool(ReceiptGeneratingTool):
            name = "test_tool"
            description = "A test tool"
            
            def _execute(self, arg1: str):
                return {"result": f"processed_{arg1}"}
        
        tool = TestTool()
        result = tool._run(arg1="test")
        
        assert result == {"result": "processed_test"}
        receipts = tool.get_receipts()
        assert len(receipts) == 1
        
        receipt = receipts[0]
        assert receipt["tool_name"] == "test_tool"
        assert receipt["status"] == "success"
        assert "action_id" in receipt
        assert "timestamp" in receipt
        assert "input_hash" in receipt
        assert "output_hash" in receipt
    
    def test_tool_execution_failure(self):
        """Tool should generate receipt on failure"""
        class FailingTool(ReceiptGeneratingTool):
            name = "failing_tool"
            description = "A tool that fails"
            
            def _execute(self, arg1: str):
                raise ValueError("Test error")
        
        tool = FailingTool()
        
        with pytest.raises(Exception) as exc_info:
            tool._run(arg1="test")
        
        assert "Test error" in str(exc_info.value)
        
        receipts = tool.get_receipts()
        assert len(receipts) == 1
        
        receipt = receipts[0]
        assert receipt["status"] == "failed"
        assert receipt["error_message"] == "Test error"
    
    def test_tool_metadata(self):
        """Tool should include custom metadata in receipt"""
        class MetadataTool(ReceiptGeneratingTool):
            name = "metadata_tool"
            description = "A tool with metadata"
            
            def _execute(self, arg1: str):
                return {
                    "result": "done",
                    "metadata": {"custom_field": "custom_value"}
                }
        
        tool = MetadataTool()
        tool._run(arg1="test")
        
        receipts = tool.get_receipts()
        assert receipts[0]["metadata"]["custom_field"] == "custom_value"
    
    def test_receipt_clearing(self):
        """Should be able to clear receipts"""
        class TestTool(ReceiptGeneratingTool):
            name = "test_tool"
            description = "Test"
            
            def _execute(self, arg1: str):
                return {"result": "done"}
        
        tool = TestTool()
        tool._run(arg1="test1")
        tool._run(arg1="test2")
        
        assert len(tool.get_receipts()) == 2
        
        tool.clear_receipts()
        assert len(tool.get_receipts()) == 0


class TestWrapToolWithReceipts:
    """Test wrap_tool_with_receipts function"""
    
    def test_wrap_function_tool(self):
        """Should wrap a function-based tool"""
        from langchain.tools import Tool
        
        def my_function(arg: str) -> str:
            return f"result_{arg}"
        
        legacy_tool = Tool(
            name="my_tool",
            func=my_function,
            description="My tool"
        )
        
        wrapped = wrap_tool_with_receipts(legacy_tool)
        
        assert isinstance(wrapped, ReceiptGeneratingTool)
        assert wrapped.name == "my_tool"
        assert wrapped.description == "My tool"
        
        result = wrapped._run(arg="test")
        assert result == "result_test"
        assert len(wrapped.get_receipts()) == 1


@pytest.mark.asyncio
async def test_create_fail_kit_endpoint():
    """Test endpoint creation"""
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    from fail_kit_langchain import create_fail_kit_endpoint
    from langchain.agents import AgentExecutor
    from langchain_core.agents import AgentFinish
    
    # Mock agent executor
    class MockAgentExecutor:
        return_intermediate_steps = True
        tools = []
        
        async def ainvoke(self, inputs):
            return {
                "output": "Test response",
                "intermediate_steps": []
            }
    
    app = FastAPI()
    mock_executor = MockAgentExecutor()
    
    # Monkey patch to pass AgentExecutor check
    mock_executor.__class__.__name__ = "AgentExecutor"
    
    app.include_router(
        create_fail_kit_endpoint(mock_executor),
        prefix="/eval"
    )
    
    client = TestClient(app)
    
    response = client.post(
        "/eval/run",
        json={"prompt": "Test prompt"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "outputs" in data
    assert "actions" in data
    assert "policy" in data
    assert data["outputs"]["final_text"] == "Test response"


def test_receipt_schema_compliance():
    """Ensure receipts comply with RECEIPT_SCHEMA.json"""
    class TestTool(ReceiptGeneratingTool):
        name = "test_tool"
        description = "Test"
        
        def _execute(self, arg: str):
            return {"result": "done"}
    
    tool = TestTool()
    tool._run(arg="test")
    
    receipts = tool.get_receipts()
    receipt = receipts[0]
    
    # Required fields per RECEIPT_SCHEMA.json
    required_fields = [
        "action_id",
        "tool_name",
        "timestamp",
        "status",
        "input_hash",
        "output_hash"
    ]
    
    for field in required_fields:
        assert field in receipt, f"Missing required field: {field}"
    
    # Validate formats
    assert isinstance(receipt["action_id"], str)
    assert isinstance(receipt["tool_name"], str)
    assert isinstance(receipt["timestamp"], str)
    assert receipt["status"] in ["success", "failed"]
    assert receipt["input_hash"].startswith("sha256:")
    assert receipt["output_hash"].startswith("sha256:")
    
    # Optional fields
    if "latency_ms" in receipt:
        assert isinstance(receipt["latency_ms"], int)
        assert receipt["latency_ms"] >= 0
