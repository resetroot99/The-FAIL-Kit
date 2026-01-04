"""
F.A.I.L. Kit Python Pattern Definitions

Regex patterns for detecting tool calls, LLM calls, and issues.
"""

from typing import List, Tuple

# Tool call patterns: (regex, category)
TOOL_PATTERNS: List[Tuple[str, str]] = [
    # Database
    (r"\.execute\s*\(", "database"),
    (r"\.query\s*\(", "database"),
    (r"cursor\.", "database"),
    (r"session\.(add|delete|commit)", "database"),
    (r"\.filter\(.*\)\.(delete|update)", "database"),
    
    # HTTP
    (r"requests\.(get|post|put|delete|patch)", "http"),
    (r"httpx\.(get|post|put|delete|patch)", "http"),
    (r"aiohttp\.", "http"),
    (r"urllib\.", "http"),
    
    # File system
    (r"open\s*\(", "file"),
    (r"os\.(remove|unlink|rmdir|rename)", "file"),
    (r"shutil\.(rmtree|move|copy)", "file"),
    (r"pathlib.*\.(unlink|rmdir|write)", "file"),
    
    # Email
    (r"smtplib\.", "email"),
    (r"sendgrid\.", "email"),
    (r"send_mail\(", "email"),
    (r"EmailMessage\(", "email"),
    
    # Payment
    (r"stripe\.", "payment"),
    (r"paypal\.", "payment"),
    (r"\.charge\s*\(", "payment"),
    (r"\.transfer\s*\(", "payment"),
    
    # Cloud storage
    (r"boto3\.", "cloud"),
    (r"s3\.(put_object|delete_object|upload)", "cloud"),
    (r"gcs\.", "cloud"),
    (r"azure\.storage", "cloud"),
    
    # LangChain tools
    (r"\.run\s*\(", "langchain_tool"),
    (r"tool\.invoke\s*\(", "langchain_tool"),
    (r"ToolNode\(", "langchain_tool"),
    (r"BaseTool\.run", "langchain_tool"),
]

# LLM call patterns: (regex, provider)
LLM_PATTERNS: List[Tuple[str, str]] = [
    # OpenAI
    (r"openai\.", "openai"),
    (r"ChatOpenAI\(", "openai"),
    (r"OpenAI\(", "openai"),
    (r"client\.chat\.completions\.create", "openai"),
    
    # Anthropic
    (r"anthropic\.", "anthropic"),
    (r"ChatAnthropic\(", "anthropic"),
    (r"Anthropic\(", "anthropic"),
    (r"client\.messages\.create", "anthropic"),
    
    # Google
    (r"vertexai\.", "google"),
    (r"ChatVertexAI\(", "google"),
    (r"genai\.", "google"),
    
    # Cohere
    (r"cohere\.", "cohere"),
    (r"ChatCohere\(", "cohere"),
    
    # Generic LangChain
    (r"\.invoke\s*\(", "langchain"),
    (r"\.ainvoke\s*\(", "langchain"),
    (r"llm\.(call|generate|predict)", "langchain"),
    (r"chat_model\.", "langchain"),
]

# Agent framework patterns: (regex, framework)
AGENT_PATTERNS: List[Tuple[str, str]] = [
    # LangChain
    (r"AgentExecutor\(", "langchain"),
    (r"create_react_agent\(", "langchain"),
    (r"create_openai_functions_agent\(", "langchain"),
    (r"create_tool_calling_agent\(", "langchain"),
    
    # LangGraph
    (r"StateGraph\(", "langgraph"),
    (r"CompiledGraph\.", "langgraph"),
    (r"graph\.(add_node|add_edge)", "langgraph"),
    
    # CrewAI
    (r"Crew\(", "crewai"),
    (r"Agent\(.*role=", "crewai"),
    (r"Task\(.*agent=", "crewai"),
    (r"crew\.kickoff\(", "crewai"),
    
    # AutoGen
    (r"AssistantAgent\(", "autogen"),
    (r"UserProxyAgent\(", "autogen"),
    (r"GroupChat\(", "autogen"),
    (r"initiate_chat\(", "autogen"),
    
    # Haystack
    (r"Pipeline\(", "haystack"),
    (r"Agent\(.*tools=", "haystack"),
]

# Secret patterns: (regex, name)
SECRET_PATTERNS: List[Tuple[str, str]] = [
    (r"api_?key", "API key"),
    (r"secret_?key", "secret key"),
    (r"password", "password"),
    (r"token", "token"),
    (r"auth", "authentication credential"),
    (r"credential", "credential"),
    (r"private_?key", "private key"),
    (r"access_?key", "access key"),
]

# Side effect patterns (destructive operations)
SIDE_EFFECT_PATTERNS: List[str] = [
    r"\.delete\s*\(",
    r"\.remove\s*\(",
    r"\.drop\s*\(",
    r"\.truncate\s*\(",
    r"os\.remove\s*\(",
    r"shutil\.rmtree\s*\(",
    r"\.destroy\s*\(",
    r"\.purge\s*\(",
]

# Receipt/audit patterns
RECEIPT_PATTERNS: List[str] = [
    r"receipt",
    r"action_id",
    r"audit_log",
    r"log_action",
    r"create_receipt",
    r"generate_receipt",
    r"AuditLogger",
    r"ActionReceipt",
]

# Error handling patterns
ERROR_HANDLING_PATTERNS: List[str] = [
    r"try\s*:",
    r"except\s*:",
    r"\.catch\s*\(",
    r"on_error",
    r"error_callback",
    r"handle_error",
]
