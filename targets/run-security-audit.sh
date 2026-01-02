#!/bin/bash
# run-security-audit.sh - Run F.A.I.L. Kit security audit against a target
#
# Usage:
#   ./run-security-audit.sh openai    # Audit OpenAI Assistants
#   ./run-security-audit.sh claude    # Audit Anthropic Claude
#   ./run-security-audit.sh langchain # Audit LangChain Agent
#   ./run-security-audit.sh all       # Audit all targets

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CASES_DIR="$SCRIPT_DIR/../cases/security"
OUTPUT_DIR="$SCRIPT_DIR/../audit-results/security"

mkdir -p "$OUTPUT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[+]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[-]${NC} $1"
}

audit_target() {
    local target=$1
    local port=$2
    local adapter=$3
    
    log "Starting $target adapter on port $port..."
    
    # Start adapter in background
    python3 "$SCRIPT_DIR/$adapter" &
    ADAPTER_PID=$!
    
    # Wait for adapter to start
    sleep 3
    
    # Check if running
    if ! curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        error "$target adapter failed to start"
        kill $ADAPTER_PID 2>/dev/null || true
        return 1
    fi
    
    log "$target adapter running"
    
    # Run audit
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    REPORT_FILE="$OUTPUT_DIR/${target}-security-audit-${TIMESTAMP}.html"
    JSON_FILE="$OUTPUT_DIR/${target}-security-audit-${TIMESTAMP}.json"
    
    log "Running security audit against $target..."
    
    fail-audit run \
        --endpoint "http://localhost:$port/eval/run" \
        --cases "$CASES_DIR" \
        --output "$REPORT_FILE" \
        --format html \
        2>&1 | tee "$OUTPUT_DIR/${target}-audit.log"
    
    # Also save JSON results
    fail-audit run \
        --endpoint "http://localhost:$port/eval/run" \
        --cases "$CASES_DIR" \
        --output "$JSON_FILE" \
        --format json \
        2>&1 || true
    
    # Stop adapter
    log "Stopping $target adapter..."
    kill $ADAPTER_PID 2>/dev/null || true
    
    log "Audit complete: $REPORT_FILE"
    
    return 0
}

case "$1" in
    openai)
        if [ -z "$OPENAI_API_KEY" ]; then
            error "OPENAI_API_KEY not set"
            exit 1
        fi
        audit_target "openai" 8001 "openai-assistants.py"
        ;;
    claude)
        if [ -z "$ANTHROPIC_API_KEY" ]; then
            error "ANTHROPIC_API_KEY not set"
            exit 1
        fi
        audit_target "claude" 8002 "anthropic-claude.py"
        ;;
    langchain)
        if [ -z "$OPENAI_API_KEY" ]; then
            error "OPENAI_API_KEY not set"
            exit 1
        fi
        audit_target "langchain" 8003 "langchain-agent.py"
        ;;
    flowise)
        if [ -z "$FLOWISE_CHATFLOW_ID" ]; then
            error "FLOWISE_CHATFLOW_ID not set"
            exit 1
        fi
        audit_target "flowise" 8004 "flowise-adapter.py"
        ;;
    all)
        log "Running all available audits..."
        
        if [ -n "$OPENAI_API_KEY" ]; then
            audit_target "openai" 8001 "openai-assistants.py" || warn "OpenAI audit failed"
            sleep 2
            audit_target "langchain" 8003 "langchain-agent.py" || warn "LangChain audit failed"
            sleep 2
        else
            warn "Skipping OpenAI/LangChain (OPENAI_API_KEY not set)"
        fi
        
        if [ -n "$ANTHROPIC_API_KEY" ]; then
            audit_target "claude" 8002 "anthropic-claude.py" || warn "Claude audit failed"
        else
            warn "Skipping Claude (ANTHROPIC_API_KEY not set)"
        fi
        
        log "All audits complete. Results in $OUTPUT_DIR"
        ;;
    *)
        echo "Usage: $0 {openai|claude|langchain|flowise|all}"
        echo ""
        echo "Environment variables required:"
        echo "  OPENAI_API_KEY     - For OpenAI and LangChain targets"
        echo "  ANTHROPIC_API_KEY  - For Claude target"
        echo "  FLOWISE_CHATFLOW_ID - For Flowise target"
        exit 1
        ;;
esac

# Summary
log ""
log "=========================================="
log "Security Audit Summary"
log "=========================================="
log "Reports saved to: $OUTPUT_DIR"
log ""
log "Next steps:"
log "1. Review HTML reports for failures"
log "2. Document interesting findings"
log "3. Update case studies with real data"
echo ""
