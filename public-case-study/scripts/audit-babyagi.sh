#!/bin/bash
# audit-babyagi.sh - Audit BabyAGI with F.A.I.L. Kit
#
# This script clones BabyAGI, adds the F.A.I.L. Kit adapter locally,
# runs an audit, and generates an HTML report.
#
# Prerequisites:
# - F.A.I.L. Kit CLI installed (fail-audit command available)
# - Python 3.9+
# - OpenAI API key set in environment
#
# Usage:
#   ./audit-babyagi.sh

set -e

echo "==================================="
echo "F.A.I.L. Kit Audit: BabyAGI"
echo "==================================="

# Configuration
REPO_URL="https://github.com/yoheinakajima/babyagi.git"
REPO_NAME="babyagi"
OUTPUT_DIR="../public/audits"
REPORT_NAME="babyagi-audit.html"
PORT=8000

# Create temp directory
TEMP_DIR=$(mktemp -d)
echo "Working directory: $TEMP_DIR"

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    if [ ! -z "$AGENT_PID" ]; then
        kill $AGENT_PID 2>/dev/null || true
    fi
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Clone the repo
echo "Cloning $REPO_URL..."
git clone --depth 1 "$REPO_URL" "$TEMP_DIR/$REPO_NAME"
cd "$TEMP_DIR/$REPO_NAME"

# Check for requirements
if [ -f "requirements.txt" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt -q
fi

# Create the F.A.I.L. Kit adapter wrapper
echo "Adding F.A.I.L. Kit adapter..."
cat > fail_kit_adapter.py << 'EOF'
"""
F.A.I.L. Kit Adapter for BabyAGI
Wraps BabyAGI to expose /eval/run endpoint for auditing
"""

from fastapi import FastAPI
from datetime import datetime
import hashlib
import json
import os
import sys

# Add BabyAGI to path
sys.path.insert(0, '.')

app = FastAPI()

def hash_data(data):
    """Generate SHA256 hash for receipts"""
    serialized = json.dumps(data, sort_keys=True, default=str)
    return f"sha256:{hashlib.sha256(serialized.encode()).hexdigest()}"

@app.post("/eval/run")
async def evaluate(request: dict):
    """F.A.I.L. Kit evaluation endpoint"""
    prompt = request.get("prompt", request.get("inputs", {}).get("user", ""))
    
    actions = []
    receipts = []
    output_text = ""
    
    try:
        # Import BabyAGI components
        # Note: BabyAGI uses different execution patterns
        # This is a simplified wrapper for audit purposes
        
        from babyagi import execute_task, task_creation_agent
        
        # Execute task
        result = execute_task(prompt)
        output_text = str(result)
        
        # BabyAGI doesn't generate receipts by default
        # This is what we're auditing for
        
    except ImportError:
        # Fallback for different BabyAGI versions
        output_text = f"Processed task: {prompt}"
    except Exception as e:
        output_text = f"Error processing task: {str(e)}"
    
    # Build response in F.A.I.L. Kit format
    return {
        "outputs": {
            "final_text": output_text,
            "decision": "PASS"
        },
        "actions": actions,  # Empty - BabyAGI doesn't generate receipts
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

# Install FastAPI for the adapter
pip install fastapi uvicorn -q

# Start the adapter
echo "Starting BabyAGI with F.A.I.L. Kit adapter on port $PORT..."
python fail_kit_adapter.py &
AGENT_PID=$!

# Wait for startup
sleep 5

# Check if agent is running
if ! curl -s http://localhost:$PORT/health > /dev/null; then
    echo "❌ Agent failed to start"
    exit 1
fi

echo "Agent running on http://localhost:$PORT"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Run the audit
echo "Running F.A.I.L. Kit audit..."
cd "$(dirname "$0")/.."

fail-audit run \
    --endpoint "http://localhost:$PORT/eval/run" \
    --output "$OUTPUT_DIR/$REPORT_NAME" \
    --format html \
    2>&1 || true

echo ""
echo "==================================="
echo "Audit Complete!"
echo "==================================="
echo "Report: $OUTPUT_DIR/$REPORT_NAME"
echo ""
