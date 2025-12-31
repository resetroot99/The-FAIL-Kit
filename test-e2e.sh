#!/bin/bash
# End-to-End Test Script for The F.A.I.L. Kit
# This script simulates a fresh buyer experience

set -e  # Exit on error

echo "=========================================="
echo "F.A.I.L. Kit End-to-End Test"
echo "=========================================="
echo ""

# Track test results
PASSED=0
FAILED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
  echo -e "${GREEN}[PASS]${NC} $1"
  ((PASSED++))
}

fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((FAILED++))
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# 1. Check prerequisites
echo "1. Checking prerequisites..."
if command -v node >/dev/null 2>&1; then
  pass "Node.js installed ($(node --version))"
else
  fail "Node.js not found"
fi

if command -v npm >/dev/null 2>&1; then
  pass "npm installed ($(npm --version))"
else
  fail "npm not found"
fi

echo ""

# 2. Check directory structure
echo "2. Checking directory structure..."
REQUIRED_DIRS=("cli" "cases" "middleware" "enforcement" "examples" "assets" "docs")
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    pass "Directory exists: $dir"
  else
    fail "Missing directory: $dir"
  fi
done

echo ""

# 3. Check critical files
echo "3. Checking critical files..."
REQUIRED_FILES=(
  "README.md"
  "QUICKSTART.md"
  "INSTALL.md"
  "INTEGRATION.md"
  "AUDIT_RUNBOOK.md"
  "RECEIPT_SCHEMA.json"
  "cli/package.json"
  "cli/src/index.js"
  "examples/reference-agent/server.js"
  "examples/reference-agent/package.json"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    pass "File exists: $file"
  else
    fail "Missing file: $file"
  fi
done

echo ""

# 4. Check case files
echo "4. Checking test case files..."
CASE_COUNT=$(find cases -name "*.yaml" -type f | wc -l | xargs)
if [ "$CASE_COUNT" -eq 50 ]; then
  pass "Found all 50 test cases"
elif [ "$CASE_COUNT" -gt 0 ]; then
  warn "Found $CASE_COUNT test cases (expected 50)"
else
  fail "No test case files found"
fi

echo ""

# 5. Check CLI dependencies
echo "5. Checking CLI dependencies..."
cd cli
if [ -d "node_modules" ]; then
  pass "CLI dependencies already installed"
else
  warn "Installing CLI dependencies..."
  npm install >/dev/null 2>&1
  if [ $? -eq 0 ]; then
    pass "CLI dependencies installed successfully"
  else
    fail "Failed to install CLI dependencies"
  fi
fi
cd ..

echo ""

# 6. Check reference agent dependencies
echo "6. Checking reference agent dependencies..."
cd examples/reference-agent
if [ -d "node_modules" ]; then
  pass "Reference agent dependencies already installed"
else
  warn "Installing reference agent dependencies..."
  npm install >/dev/null 2>&1
  if [ $? -eq 0 ]; then
    pass "Reference agent dependencies installed successfully"
  else
    fail "Failed to install reference agent dependencies"
  fi
fi
cd ../..

echo ""

# 7. Test CLI executable
echo "7. Testing CLI executable..."
if [ -x "cli/src/index.js" ]; then
  pass "CLI is executable"
else
  warn "CLI is not executable, fixing..."
  chmod +x cli/src/index.js
  pass "CLI made executable"
fi

# Test CLI help
OUTPUT=$(./cli/src/index.js --help 2>&1 || true)
if echo "$OUTPUT" | grep -q "F.A.I.L. Kit"; then
  pass "CLI help command works"
else
  fail "CLI help command failed"
fi

echo ""

# 8. Test reference agent startup
echo "8. Testing reference agent (5 seconds)..."
cd examples/reference-agent
npm start >/dev/null 2>&1 &
AGENT_PID=$!
sleep 3

if kill -0 $AGENT_PID 2>/dev/null; then
  pass "Reference agent started successfully"
  
  # Test health endpoint
  HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null || echo "FAIL")
  if echo "$HEALTH" | grep -q "ok"; then
    pass "Reference agent health check passed"
  else
    fail "Reference agent health check failed"
  fi
  
  # Clean up
  kill $AGENT_PID 2>/dev/null
  wait $AGENT_PID 2>/dev/null
else
  fail "Reference agent failed to start"
fi

cd ../..

echo ""

# 9. Check documentation completeness
echo "9. Checking documentation..."

# Check for placeholder emails
if grep -r "your-email@example.com" *.md >/dev/null 2>&1; then
  warn "Found placeholder email addresses in documentation"
else
  pass "No placeholder emails found"
fi

# Check for broken internal links
BROKEN_LINKS=0
for md in *.md; do
  while IFS= read -r link; do
    if [ ! -f "$link" ] && [ ! -d "$link" ]; then
      warn "Broken link in $md: $link"
      ((BROKEN_LINKS++))
    fi
  done < <(grep -oP '\[.*?\]\(\K[^)]+(?=\))' "$md" 2>/dev/null | grep -v '^http' || true)
done

if [ $BROKEN_LINKS -eq 0 ]; then
  pass "No broken internal links found"
else
  warn "Found $BROKEN_LINKS potentially broken links"
fi

echo ""

# 10. Check image optimization
echo "10. Checking image sizes..."
TOTAL_SIZE=$(du -sm assets 2>/dev/null | cut -f1)
if [ "$TOTAL_SIZE" -lt 10 ]; then
  pass "Assets directory size: ${TOTAL_SIZE}MB (< 10MB target)"
else
  warn "Assets directory size: ${TOTAL_SIZE}MB (exceeds 10MB target)"
fi

echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All critical tests passed!${NC}"
  echo "The F.A.I.L. Kit is ready for deployment."
  exit 0
else
  echo -e "${RED}✗ Some tests failed.${NC}"
  echo "Please review the failures above before deploying."
  exit 1
fi
