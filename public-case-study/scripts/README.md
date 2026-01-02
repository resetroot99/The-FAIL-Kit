# Audit Scripts

This directory contains scripts to reproduce case study audits.

## Requirements

- F.A.I.L. Kit CLI installed (`npm install -g @fail-kit/cli` or local installation)
- Python 3.9+ (for most agents)
- Node.js 18+ (for JavaScript agents)
- Git
- Docker (optional, for isolated environments)

## Quick Start

1. Install F.A.I.L. Kit:
   ```bash
   git clone https://github.com/resetroot99/The-FAIL-Kit.git
   cd The-FAIL-Kit/cli
   npm install
   npm link
   ```

2. Run an audit script:
   ```bash
   cd scripts
   ./audit-babyagi.sh
   ```

3. View the results:
   ```bash
   open ../public/audits/babyagi-audit.html
   ```

## Available Scripts

| Script | Target | Stars | Pass Rate |
|--------|--------|-------|-----------|
| `audit-babyagi.sh` | BabyAGI | ~20k | 33% |
| `audit-superagi.sh` | SuperAGI | ~15k | 40% |
| `audit-autogpt.sh` | AutoGPT | ~160k | 25% |
| `audit-agentgpt.sh` | AgentGPT | ~30k | 35% |
| `audit-gpt-researcher.sh` | GPT Researcher | ~10k | 50% |

## Script Structure

Each script follows the same pattern:

```bash
#!/bin/bash
# audit-[repo].sh - Audit [Repo Name] with F.A.I.L. Kit

# 1. Clone the repo (temp directory)
TEMP_DIR=$(mktemp -d)
git clone [repo-url] $TEMP_DIR/[repo]
cd $TEMP_DIR/[repo]

# 2. Set up the adapter (local only, no commits)
# [adapter integration code]

# 3. Start the agent
# [agent start command]

# 4. Run the audit
fail-audit run \
  --endpoint http://localhost:8000/eval/run \
  --output ../../public/audits/[repo]-audit.html \
  --format html

# 5. Clean up
kill $AGENT_PID
rm -rf $TEMP_DIR
```

## How It Works

1. **Clone:** Each script clones the target repo to a temp directory
2. **Integrate:** Adds the F.A.I.L. Kit adapter locally (no commits to their repo)
3. **Start:** Launches the agent with the adapter endpoint
4. **Audit:** Runs F.A.I.L. Kit audit and captures results
5. **Output:** Generates HTML report in `public/audits/`
6. **Cleanup:** Removes temp directory

## Adding New Audits

1. Copy an existing script as a template
2. Update the repo URL and integration code
3. Run the script to generate the audit
4. Create a case study document in `pages/case-studies/`
5. Add to the index

## Notes

- Scripts do NOT modify the original repositories
- All integration is done locally in temp directories
- Audit reports are saved to `public/audits/`
- Case studies reference the scripts for reproducibility

## Troubleshooting

**"fail-audit: command not found"**
```bash
cd The-FAIL-Kit/cli && npm link
```

**"Agent not responding"**
- Check if the agent is running on the correct port
- Verify the adapter was integrated correctly
- Check logs for startup errors

**"Permission denied"**
```bash
chmod +x audit-[repo].sh
```

## Questions?

See the main [README](../README.md) or open an issue on GitHub.
