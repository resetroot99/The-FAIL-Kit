# Security Test Cases Index

Adversarial security test suite for AI agent auditing.

## Summary

| Category | Count | Risk Level |
|----------|-------|------------|
| Prompt Injection | 15 | Critical/High |
| Data Exfiltration | 15 | Critical/High |
| Tool Abuse | 15 | Critical/High |
| Jailbreak | 15 | Critical/High |
| **Total** | **60** | |

## Categories

### Prompt Injection (INJECT_*)

Tests for prompt injection vulnerabilities that allow attackers to override system instructions.

| ID | Description | Risk |
|----|-------------|------|
| INJECT_001 | Delimiter escape (triple quotes) | Critical |
| INJECT_002 | XML/HTML tag escape | Critical |
| INJECT_003 | Newline visual separation | High |
| INJECT_004 | DAN roleplay attack | Critical |
| INJECT_005 | Direct instruction override | Critical |
| INJECT_006 | Base64 encoded payload | High |
| INJECT_007 | Unicode homoglyph attack | High |
| INJECT_008 | Markdown code block escape | High |
| INJECT_009 | Hypothetical scenario framing | High |
| INJECT_010 | Translation-based extraction | High |
| INJECT_011 | Fake developer mode | Critical |
| INJECT_012 | JSON structure injection | Critical |
| INJECT_013 | Completion hijacking | High |
| INJECT_014 | Sandwich attack | High |
| INJECT_015 | Few-shot example poisoning | Critical |

### Data Exfiltration (EXFIL_*)

Tests for unauthorized data extraction including credentials, PII, and system information.

| ID | Description | Risk |
|----|-------------|------|
| EXFIL_001 | Direct system prompt request | Critical |
| EXFIL_002 | API key extraction | Critical |
| EXFIL_003 | Environment variable leak | Critical |
| EXFIL_004 | Context window dump | High |
| EXFIL_005 | Tool credential extraction | Critical |
| EXFIL_006 | PII from training data | High |
| EXFIL_007 | File path disclosure | High |
| EXFIL_008 | Model configuration leak | Medium |
| EXFIL_009 | Cross-user data leak | Critical |
| EXFIL_010 | Debug output extraction | High |
| EXFIL_011 | Indirect prompt leak via summarization | High |
| EXFIL_012 | RAG source document leak | High |
| EXFIL_013 | Webhook-based exfiltration | Critical |
| EXFIL_014 | Encoding-based bypass | High |
| EXFIL_015 | Markdown image exfiltration | Critical |

### Tool Abuse (TOOL_*)

Tests for malicious use of agent tools including injection attacks and unauthorized actions.

| ID | Description | Risk |
|----|-------------|------|
| TOOL_001 | Basic SQL injection | Critical |
| TOOL_002 | SQL UNION injection | Critical |
| TOOL_003 | Command injection | Critical |
| TOOL_004 | Path traversal | Critical |
| TOOL_005 | SSRF (AWS metadata) | Critical |
| TOOL_006 | Unauthorized file write | Critical |
| TOOL_007 | Environment modification | Critical |
| TOOL_008 | Email spam/phishing | High |
| TOOL_009 | Financial API abuse | High |
| TOOL_010 | Arbitrary code execution | Critical |
| TOOL_011 | Rate limit bypass | Medium |
| TOOL_012 | Unauthorized data deletion | Critical |
| TOOL_013 | Privilege escalation | Critical |
| TOOL_014 | LDAP injection | Critical |
| TOOL_015 | XML XXE attack | Critical |

### Jailbreak (JAIL_*)

Tests for bypassing safety filters and content policies.

| ID | Description | Risk |
|----|-------------|------|
| JAIL_001 | Harmful instructions (weapons) | Critical |
| JAIL_002 | Malware code generation | Critical |
| JAIL_003 | Educational framing bypass | High |
| JAIL_004 | Fiction/story bypass | High |
| JAIL_005 | Persona switching | High |
| JAIL_006 | Split request obfuscation | High |
| JAIL_007 | Reverse psychology | High |
| JAIL_008 | Gradual escalation | High |
| JAIL_009 | Language switching | High |
| JAIL_010 | ASCII encoding bypass | High |
| JAIL_011 | Authority/legal threat | Medium |
| JAIL_012 | Fake emergency bypass | High |
| JAIL_013 | Output format manipulation | High |
| JAIL_014 | Hate speech generation | Critical |
| JAIL_015 | Self-harm information | Critical |

## Usage

Run all security tests:
```bash
fail-audit run --cases cases/security/ --endpoint YOUR_AGENT_URL
```

Run specific category:
```bash
fail-audit run --cases cases/security/INJECT_*.yaml --endpoint YOUR_AGENT_URL
```

Run critical tests only:
```bash
fail-audit run --cases cases/security/ --filter "risk:critical" --endpoint YOUR_AGENT_URL
```

## Responsible Disclosure

If these tests reveal vulnerabilities in production systems:

1. Do not publish exploit details publicly
2. Contact the vendor's security team
3. Allow 90 days for remediation
4. Coordinate disclosure timing

## Contributing

To add new test cases:

1. Follow the naming convention: `CATEGORY_XXX_description.yaml`
2. Include risk level (critical, high, medium, low)
3. Add comprehensive `must_not_match_patterns`
4. Tag appropriately for filtering
