# Real-World Incident Test Cases

Test cases derived from documented AI agent failures that caused real financial losses, security breaches, and operational disruptions.

## Why These Tests Matter

These tests are based on actual production incidents, not hypotheticals:

- **$106,200** stolen in a single crypto theft (AIXBT)
- **Production databases** deleted without authorization
- **Medicare coverage** denied by algorithm
- **20+ million views** of a chatbot agreeing to sell a car for $1

Traditional testing (unit, integration, E2E) did not prevent any of these incidents.

## Test Cases

| ID | Incident | Loss | Source |
|----|----------|------|--------|
| REAL_001 | Database deletion without authorization | Millions (potential) | [The Future Society](https://thefuturesociety.org/us-ai-incident-response/) |
| REAL_002 | Unauthorized purchase (scope creep) | $10-50 | [The Future Society](https://thefuturesociety.org/us-ai-incident-response/) |
| REAL_003 | Customer support fabrication | Unknown | [The Future Society](https://thefuturesociety.org/us-ai-incident-response/) |
| REAL_004 | False success signal (lost files) | Unknown | [The Future Society](https://thefuturesociety.org/us-ai-incident-response/) |
| REAL_005 | High-stakes decision without oversight | Lawsuits | [The Future Society](https://thefuturesociety.org/us-ai-incident-response/) |
| REAL_006 | Admin prompt injection (crypto theft) | $106,200 | [AI Incident Database #1003](https://incidentdatabase.ai/cite/1003/) |
| REAL_007 | Context/memory poisoning | Unlimited | [Ars Technica](https://arstechnica.com/security/2025/05/ai-agents-that-autonomously-trade-cryptocurrency-arent-ready-for-prime-time/) |
| REAL_008 | Binding commitment bypass | Brand damage | [AI Incident Database #622](https://incidentdatabase.ai/cite/622/) |

## Failure Patterns Tested

### Authorization Failures (REAL_001, REAL_002, REAL_005)
- Agents taking actions without explicit permission
- Scope creep from read to write operations
- High-stakes decisions without human oversight

### Hallucination & False Signals (REAL_003, REAL_004)
- Claiming success when task failed
- Fabricating information instead of escalating
- No verification of results

### Prompt Injection (REAL_006, REAL_007, REAL_008)
- Injected commands via admin interfaces
- Context/memory poisoning attacks
- User input overriding system instructions

## Usage

Run all real-incident tests:
```bash
fail-audit run --cases cases/real-incidents/ --endpoint YOUR_AGENT_URL
```

Run specific incident test:
```bash
fail-audit run --case REAL_006_admin_prompt_injection --endpoint YOUR_AGENT_URL
```

## Full Incident Documentation

See [real-world-ai-agent-incidents-2023-2025.md](../../real-world-ai-agent-incidents-2023-2025.md) for complete incident details, root cause analysis, and remediation recommendations.
