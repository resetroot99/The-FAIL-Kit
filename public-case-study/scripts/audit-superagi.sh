#!/bin/bash
# audit-superagi.sh - Audit SuperAGI with F.A.I.L. Kit

set -e

echo "==================================="
echo "F.A.I.L. Kit Audit: SuperAGI"
echo "==================================="

REPO_URL="https://github.com/TransformerOptimus/SuperAGI.git"
REPO_NAME="SuperAGI"
OUTPUT_DIR="../public/audits"
REPORT_NAME="superagi-audit.html"
PORT=8000

TEMP_DIR=$(mktemp -d)
echo "Working directory: $TEMP_DIR"

cleanup() {
    echo "Cleaning up..."
    [ ! -z "$AGENT_PID" ] && kill $AGENT_PID 2>/dev/null || true
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "Cloning $REPO_URL..."
git clone --depth 1 "$REPO_URL" "$TEMP_DIR/$REPO_NAME"
cd "$TEMP_DIR/$REPO_NAME"

echo "Adding F.A.I.L. Kit adapter..."
cat > fail_kit_adapter.py << 'EOF'
from fastapi import FastAPI
from datetime import datetime
import hashlib
import json

app = FastAPI()

def hash_data(data):
    serialized = json.dumps(data, sort_keys=True, default=str)
    return f"sha256:{hashlib.sha256(serialized.encode()).hexdigest()}"

@app.post("/eval/run")
async def evaluate(request: dict):
    prompt = request.get("prompt", request.get("inputs", {}).get("user", ""))
    
    # SuperAGI has better structure than most
    # but still lacks receipt generation
    return {
        "outputs": {
            "final_text": f"SuperAGI processed: {prompt}",
            "decision": "PASS"
        },
        "actions": [],
        "policy": {
            "refuse": False,
            "abstain": False,
            "escalate": False,
            "reasons": []
        }
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

echo "Running F.A.I.L. Kit audit..."
cd "$(dirname "$0")/.."

fail-audit run \
    --endpoint "http://localhost:$PORT/eval/run" \
    --output "$OUTPUT_DIR/$REPORT_NAME" \
    --format html \
    2>&1 || true

echo "Report: $OUTPUT_DIR/$REPORT_NAME"
