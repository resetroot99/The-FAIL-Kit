# Troubleshooting Guide

Common issues and how to fix them.

## Installation Issues

### npm install fails with permission errors

**Problem:** Cannot install CLI globally due to permission errors.

**Solution:**

```bash
# Option 1: Use npx (no install needed)
npx @fail-kit/cli run

# Option 2: Install without sudo using npm prefix
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm install -g @fail-kit/cli

# Option 3: Use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
npm install -g @fail-kit/cli
```

---

### Module not found errors

**Problem:** `Error: Cannot find module 'xyz'`

**Solution:**

```bash
# Reinstall dependencies
cd cli
rm -rf node_modules package-lock.json
npm install

# Or use npm ci for clean install
npm ci
```

---

## Connection Issues

### ECONNREFUSED when running audit

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:8000`

**Cause:** Your agent is not running or listening on wrong port.

**Solution:**

1. Start your agent:
   ```bash
   cd examples/reference-agent
   npm start
   ```

2. Verify it's running:
   ```bash
   curl http://localhost:8000/health
   ```

3. Check the port in your config:
   ```bash
   cat fail-audit.config.json
   ```

---

### Request failed with status code 404 (Next.js)

**Problem:** All tests fail with `Error: Request failed with status code 404`. The dev server is running on the expected port.

**Cause:** The eval route does not exist or is at a different path. The CLI calls `POST /api/eval/run` (Next.js) or `POST /eval/run` (Express/FastAPI).

**Solution for Next.js App Router:**

1. **Create the route** at `app/api/eval/run/route.ts`:

   ```bash
   mkdir -p app/api/eval/run
   ```

2. **Add the handler** (use `@fail-kit/middleware-nextjs`):

   ```ts
   // app/api/eval/run/route.ts
   import { failAuditRoute } from '@fail-kit/middleware-nextjs';

   export const POST = failAuditRoute(async (prompt, context) => {
     const result = await yourAgent.process(prompt);
     return {
       response: result.text,
       actions: result.actions ?? [],
       receipts: result.receipts ?? []
     };
   });
   ```

3. **Confirm the dev server is running** (e.g. `npm run dev` on port 3000).

4. **Test the endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/eval/run \
     -H "Content-Type: application/json" \
     -d '{"inputs":{"user":"hello"}}'
   ```
   You should get JSON (not 404).

5. **Re-run the audit:**
   ```bash
   npx @fail-kit/cli run --endpoint http://localhost:3000/api/eval/run
   ```

If you use **Pages Router**, use `pages/api/eval/run.ts` instead and export a default request handler that accepts POST and forwards `inputs.user` as the prompt.

---

### Timeout errors

**Problem:** Tests timeout with `ETIMEDOUT` or `ESOCKETTIMEDOUT`

**Cause:** Agent is too slow or endpoint is unreachable.

**Solution:**

1. Increase timeout in config:
   ```json
   {
     "timeout": 60000
   }
   ```

2. Or use CLI flag:
   ```bash
   fail-audit run --timeout 60000
   ```

3. Check agent performance:
   ```bash
   time curl -X POST http://localhost:8000/eval/run \
     -H "Content-Type: application/json" \
     -d '{"prompt": "hello"}'
   ```

---

### SSL/TLS certificate errors

**Problem:** `Error: unable to verify the first certificate`

**Cause:** Self-signed certificate or corporate proxy.

**Solution:**

```bash
# Temporary fix (not recommended for production)
export NODE_TLS_REJECT_UNAUTHORIZED=0
fail-audit run

# Better: Add certificate to Node.js
export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem
fail-audit run
```

---

## Test Failures

### All tests fail with "Invalid response format"

**Problem:** Every test fails with schema validation error.

**Cause:** Your agent is not returning the expected response format.

**Solution:**

1. Check your response structure:
   ```json
   {
     "response": "string (required)",
     "actions": [],
     "receipts": []
   }
   ```

2. Test manually:
   ```bash
   curl -X POST http://localhost:8000/eval/run \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Say hello", "context": {}}' | jq
   ```

3. See [API_REFERENCE.md](API_REFERENCE.md) for complete schema.

---

### Tests fail with "Missing receipt"

**Problem:** `CONTRACT_0003` or similar receipt tests fail.

**Cause:** Your agent claims actions but doesn't provide receipts.

**Solution:**

Add receipts to your response:

```javascript
{
  response: "I sent the email",
  actions: [{
    action_id: "act_123",
    tool_name: "email_sender",
    timestamp: new Date().toISOString(),
    status: "success",
    input_hash: "sha256:...",
    output_hash: "sha256:...",
    latency_ms: 245
  }],
  receipts: [{
    timestamp: new Date().toISOString(),
    tool: "email_sender",
    status: "success",
    proof: "SMTP confirmation: message_id=abc123"
  }]
}
```

---

### Intermittent failures

**Problem:** Tests pass sometimes, fail other times.

**Cause:** Non-deterministic agent behavior or race conditions.

**Solution:**

1. Enable retries in config:
   ```json
   {
     "retry": {
       "enabled": true,
       "max_attempts": 3,
       "backoff_ms": 1000
     }
   }
   ```

2. Add logging to your agent to debug:
   ```javascript
   console.log('Received prompt:', prompt);
   console.log('Returning response:', response);
   ```

3. Run tests multiple times:
   ```bash
   for i in {1..5}; do fail-audit run; done
   ```

---

## Configuration Issues

### "No test cases found"

**Problem:** CLI cannot find test case files.

**Cause:** Wrong `cases_dir` path in config.

**Solution:**

1. Use absolute path:
   ```json
   {
     "cases_dir": "/absolute/path/to/The-FAIL-Kit/cases"
   }
   ```

2. Or relative to project root:
   ```json
   {
     "cases_dir": "./cases"
   }
   ```

3. Verify files exist:
   ```bash
   ls -la cases/*.yaml
   ```

---

### "Invalid configuration"

**Problem:** Config validation fails on `fail-audit init` or `run`.

**Cause:** Malformed JSON or invalid values.

**Solution:**

1. Validate JSON syntax:
   ```bash
   cat fail-audit.config.json | jq
   ```

2. Check required fields:
   - `endpoint` must be a valid URL
   - `timeout` must be a positive number
   - `cases_dir` must be a valid path

3. Reset to defaults:
   ```bash
   rm fail-audit.config.json
   fail-audit init --yes
   ```

---

## Report Generation Issues

### HTML report is blank or broken

**Problem:** Report opens but shows nothing or looks broken.

**Cause:** Incomplete audit results or browser compatibility.

**Solution:**

1. Check results file:
   ```bash
   cat audit-results/results.json | jq
   ```

2. Regenerate report:
   ```bash
   fail-audit report audit-results/results.json --format html
   ```

3. Try different browser (Chrome, Firefox, Safari all supported).

---

### Cannot open report file

**Problem:** `ENOENT: no such file or directory`

**Cause:** Report was not generated or saved to wrong location.

**Solution:**

1. Check output directory:
   ```bash
   ls -la audit-results/
   ```

2. Specify output path explicitly:
   ```bash
   fail-audit run --format html --output ./my-report.html
   ```

---

## Platform-Specific Issues

### Windows: Command not found

**Problem:** `'fail-audit' is not recognized as an internal or external command`

**Cause:** npm global bin not in PATH.

**Solution:**

```powershell
# Add npm global bin to PATH
$env:Path += ";$env:APPDATA\npm"

# Or use npx
npx @fail-kit/cli run
```

---

### Windows: Path issues

**Problem:** Paths with backslashes cause errors.

**Solution:**

Use forward slashes in config:

```json
{
  "cases_dir": "./cases",
  "output_dir": "./audit-results"
}
```

---

### macOS: Permission denied

**Problem:** Cannot execute `fail-audit` after install.

**Solution:**

```bash
# Fix permissions
chmod +x $(which fail-audit)

# Or reinstall
npm uninstall -g @fail-kit/cli
npm install -g @fail-kit/cli
```

---

## Performance Issues

### Audit takes too long

**Problem:** 50 tests take 10+ minutes.

**Cause:** Sequential execution or slow agent.

**Solution:**

1. Enable parallel execution:
   ```bash
   fail-audit run --parallel 5
   ```

2. Run only specific levels:
   ```bash
   fail-audit run --level smoke
   ```

3. Optimize your agent response time.

---

### High memory usage

**Problem:** Node.js process uses excessive memory.

**Cause:** Large responses or memory leaks.

**Solution:**

1. Increase Node.js memory limit:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" fail-audit run
   ```

2. Run tests in smaller batches:
   ```bash
   fail-audit run --cases CONTRACT_0001,CONTRACT_0002
   ```

---

## Debugging Tips

### Enable verbose logging

```bash
export FAIL_AUDIT_VERBOSE=true
fail-audit run
```

### Check endpoint manually

```bash
curl -v -X POST http://localhost:8000/eval/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test prompt",
    "context": {"mode": "chat"}
  }' | jq
```

### Inspect test case

```bash
cat cases/CONTRACT_0001_output_schema.yaml
```

### Run single test

```bash
fail-audit run --cases CONTRACT_0001
```

### Check CLI version

```bash
fail-audit --version
```

### Run diagnostics

```bash
fail-audit doctor
```

---

## Getting Help

If you're still stuck:

1. **Check the docs:** [README.md](../README.md), [QUICKSTART.md](../QUICKSTART.md)
2. **Search issues:** [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)
3. **Ask the community:** [GitHub Discussions](https://github.com/resetroot99/The-FAIL-Kit/discussions)
4. **Email support:** ali@jakvan.io

When asking for help, include:
- Your OS and Node.js version
- CLI version (`fail-audit --version`)
- Full error message
- Steps to reproduce
- Relevant config files

---

**No trace, no ship.**
