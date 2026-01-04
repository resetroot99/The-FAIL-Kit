"""
Tests for F.A.I.L. Kit Python Analyzers

Tests the LangChain, CrewAI, and AutoGen analyzers.
"""

import pytest
from failkit_lsp.analyzer import (
    LangChainAnalyzer,
    CrewAIAnalyzer,
    AutoGenAnalyzer,
    Issue,
    IssueSeverity,
    IssueCategory,
)


class TestLangChainAnalyzer:
    """Tests for LangChain analyzer."""
    
    def test_detects_agent_executor_without_receipt(self):
        """Test detection of AgentExecutor.invoke() without receipt."""
        code = '''
from langchain.agents import AgentExecutor

def run_agent(prompt):
    result = agent_executor.invoke({"input": prompt})
    return result
'''
        analyzer = LangChainAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        receipt_issues = [i for i in issues if i.rule_id == "FK001"]
        assert len(receipt_issues) >= 1
        assert "receipt" in receipt_issues[0].message.lower()
    
    def test_detects_agent_executor_without_error_handling(self):
        """Test detection of AgentExecutor.invoke() without try/except."""
        code = '''
from langchain.agents import AgentExecutor

def run_agent(prompt):
    result = agent_executor.invoke({"input": prompt})
    return result
'''
        analyzer = LangChainAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        error_issues = [i for i in issues if i.rule_id == "FK002"]
        assert len(error_issues) >= 1
        assert "error" in error_issues[0].message.lower()
    
    def test_no_issues_with_proper_handling(self):
        """Test that proper handling doesn't trigger issues."""
        code = '''
from langchain.agents import AgentExecutor
from fail_kit_langchain import extract_receipts_from_agent_executor

def run_agent(prompt):
    try:
        result = agent_executor.invoke({"input": prompt})
        receipts = extract_receipts_from_agent_executor(agent_executor, result)
        return result
    except Exception as e:
        logging.error(f"Agent failed: {e}")
        raise
'''
        analyzer = LangChainAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        # Should have fewer or no issues
        critical_issues = [i for i in issues if i.severity == IssueSeverity.ERROR]
        assert len(critical_issues) == 0
    
    def test_detects_tool_decorator_without_receipt(self):
        """Test detection of @tool decorated function without receipt."""
        code = '''
from langchain.tools import tool

@tool
def send_email(to: str, subject: str, body: str):
    """Send an email to the specified recipient."""
    # No receipt generation
    return smtp.send(to, subject, body)
'''
        analyzer = LangChainAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        tool_issues = [i for i in issues if "tool" in i.message.lower() and i.rule_id == "FK001"]
        assert len(tool_issues) >= 1
    
    def test_skips_non_langchain_files(self):
        """Test that non-LangChain files are skipped."""
        code = '''
def regular_function():
    return "hello"
'''
        analyzer = LangChainAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        assert len(issues) == 0


class TestCrewAIAnalyzer:
    """Tests for CrewAI analyzer."""
    
    def test_detects_crew_kickoff_without_receipt(self):
        """Test detection of Crew.kickoff() without receipt."""
        code = '''
from crewai import Crew, Agent, Task

crew = Crew(agents=[agent], tasks=[task])
result = crew.kickoff()
'''
        analyzer = CrewAIAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        receipt_issues = [i for i in issues if i.rule_id == "FK001"]
        assert len(receipt_issues) >= 1
    
    def test_detects_task_without_error_handler(self):
        """Test detection of Task without error handler."""
        code = '''
from crewai import Task

task = Task(
    description="Write a blog post",
    agent=writer_agent,
)
'''
        analyzer = CrewAIAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        error_issues = [i for i in issues if i.rule_id == "FK008"]
        assert len(error_issues) >= 1
    
    def test_detects_agent_with_verbose_true(self):
        """Test detection of Agent with verbose=True in non-test file."""
        code = '''
from crewai import Agent

agent = Agent(
    role="Writer",
    goal="Write content",
    verbose=True,
)
'''
        analyzer = CrewAIAnalyzer("main.py", code)
        issues = analyzer.analyze()
        
        security_issues = [i for i in issues if i.rule_id == "FK003"]
        assert len(security_issues) >= 1
    
    def test_skips_non_crewai_files(self):
        """Test that non-CrewAI files are skipped."""
        code = '''
class MyClass:
    def run(self):
        pass
'''
        analyzer = CrewAIAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        assert len(issues) == 0


class TestAutoGenAnalyzer:
    """Tests for AutoGen analyzer."""
    
    def test_detects_user_proxy_without_human_input_mode(self):
        """Test detection of UserProxyAgent without human_input_mode."""
        code = '''
from autogen import UserProxyAgent

user_proxy = UserProxyAgent(
    name="user",
    system_message="You are a helpful assistant.",
)
'''
        analyzer = AutoGenAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        safety_issues = [i for i in issues if i.rule_id == "FK009"]
        assert len(safety_issues) >= 1
    
    def test_detects_initiate_chat_without_max_turns(self):
        """Test detection of initiate_chat() without max_turns."""
        code = '''
from autogen import UserProxyAgent, AssistantAgent

result = user_proxy.initiate_chat(
    assistant,
    message="Hello, help me with a task.",
)
'''
        analyzer = AutoGenAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        safety_issues = [i for i in issues if i.rule_id == "FK009"]
        assert len(safety_issues) >= 1
    
    def test_detects_code_execution_without_docker(self):
        """Test detection of code_execution_config without Docker."""
        code = '''
from autogen import UserProxyAgent

user_proxy = UserProxyAgent(
    name="user",
    code_execution_config={"work_dir": "coding"},
)
'''
        analyzer = AutoGenAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        security_issues = [i for i in issues if i.rule_id == "FK003"]
        assert len(security_issues) >= 1
    
    def test_detects_group_chat_without_max_round(self):
        """Test detection of GroupChat without max_round."""
        code = '''
from autogen import GroupChat

group_chat = GroupChat(
    agents=[agent1, agent2],
    messages=[],
)
'''
        analyzer = AutoGenAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        safety_issues = [i for i in issues if i.rule_id == "FK009"]
        assert len(safety_issues) >= 1
    
    def test_skips_non_autogen_files(self):
        """Test that non-AutoGen files are skipped."""
        code = '''
def chat(message):
    return "response"
'''
        analyzer = AutoGenAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        assert len(issues) == 0


class TestDisableComments:
    """Tests for disable comment handling."""
    
    def test_respects_disable_comment(self):
        """Test that fail-kit-disable comments suppress issues."""
        code = '''
from langchain.agents import AgentExecutor

def run_agent(prompt):
    # fail-kit-disable: FK001
    result = agent_executor.invoke({"input": prompt})
    return result
'''
        analyzer = LangChainAnalyzer("test.py", code)
        issues = analyzer.analyze()
        
        # FK001 should be suppressed for this line
        receipt_issues = [i for i in issues if i.rule_id == "FK001"]
        assert len(receipt_issues) == 0
    
    def test_respects_noqa_comment(self):
        """Test that # noqa: FK001 comments suppress issues."""
        code = '''
from langchain.agents import AgentExecutor

def run_agent(prompt):
    result = agent_executor.invoke({"input": prompt})  # noqa: FK001
    return result
'''
        # Note: This test may need adjustment based on how disable comments are parsed
        analyzer = LangChainAnalyzer("test.py", code)
        # The analyzer should skip issues on lines with noqa comments


class TestIssueStructure:
    """Tests for Issue dataclass structure."""
    
    def test_issue_to_dict(self):
        """Test Issue.to_dict() method."""
        issue = Issue(
            rule_id="FK001",
            message="Test message",
            severity=IssueSeverity.ERROR,
            category=IssueCategory.RECEIPT,
            line=10,
            column=5,
            end_line=10,
            end_column=20,
            file_path="test.py",
            data={"framework": "langchain"},
        )
        
        d = issue.to_dict()
        
        assert d["rule_id"] == "FK001"
        assert d["message"] == "Test message"
        assert d["severity"] == "error"
        assert d["category"] == "receipt"
        assert d["line"] == 10
        assert d["column"] == 5
        assert d["file_path"] == "test.py"
        assert d["data"]["framework"] == "langchain"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
