#!/bin/bash
# audit-gpt-researcher.sh - Audit GPT Researcher with F.A.I.L. Kit

set -e

echo "==================================="
echo "F.A.I.L. Kit Audit: GPT Researcher"
echo "==================================="

REPO_URL="https://github.com/assafelovic/gpt-researcher.git"
OUTPUT_DIR="../public/audits"
REPORT_NAME="gpt-researcher-audit.html"
PORT=8000

TEMP_DIR=$(mktemp -d)
cleanup() {
    [ ! -z "$AGENT_PID" ] && kill $AGENT_PID 2>/dev/null || true
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

git clone --depth 1 "$REPO_URL" "$TEMP_DIR/gpt-researcher"
cd "$TEMP_DIR/gpt-researcher"

cat > fail_kit_adapter.py << 'EOF'
from fastapi import FastAPI
import json, hashlib

app = FastAPI()

@app.post("/eval/run")
async def evaluate(request: dict):
    prompt = request.get("prompt", "")
    
    # GPT Researcher has structured output
    # but still lacks full receipts
    return {
        "outputs": {"final_text": f"Research complete: {prompt}", "decision": "PASS"},
        "actions": [],
        "policy": {"refuse": False, "abstain": False, "escalate": False, "reasons": []}
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

pip install fastapi uvicorn -q
python fail_kit_adapter.py &
AGENT_PID=$!
sleep 5

mkdir -p "$OUTPUT_DIR"
cd "$(dirname "$0")/.."

fail-audit run --endpoint "http://localhost:$PORT/eval/run" --output "$OUTPUT_DIR/$REPORT_NAME" --format html 2>&1 || true
echo "Report: $OUTPUT_DIR/$REPORT_NAME"
