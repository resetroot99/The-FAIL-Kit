# F.A.I.L. Kit CI/CD Integration Guide

Run F.A.I.L. Kit audits automatically on every push, pull request, or deployment.

---

## Table of Contents

- [Quick Start](#quick-start)
- [GitHub Actions](#github-actions)
- [GitLab CI](#gitlab-ci)
- [Other CI Systems](#other-ci-systems)
- [Configuration Options](#configuration-options)
- [Handling Failures](#handling-failures)
- [Best Practices](#best-practices)

---

## Quick Start

### 1. Add the Audit Command to Your CI

```yaml
# Run the audit with CI-optimized output
- run: fail-audit run --ci --format junit
```

### 2. Fail on Critical Errors

The CLI exits with code 1 if any tests fail, which fails the CI build.

### 3. Upload Reports as Artifacts

Store HTML reports for easy review.

---

## GitHub Actions

### Basic Workflow

Create `.github/workflows/fail-audit.yml`:

```yaml
name: F.A.I.L. Kit Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install F.A.I.L. Kit
        run: npm install -g @fail-kit/cli
      
      - name: Start agent server
        run: npm start &
        env:
          PORT: 8000
      
      - name: Wait for server
        run: |
          for i in {1..30}; do
            curl -s http://localhost:8000/health && break
            sleep 1
          done
      
      - name: Run audit
        run: fail-audit run --ci --format html
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: audit-report
          path: audit-results/
```

### With Auto-Scan (No Manual Test Cases)

```yaml
name: F.A.I.L. Kit Audit (Auto-Scan)

on:
  push:
    branches: [main]
  pull_request:

jobs:
  audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install F.A.I.L. Kit
        run: npm install -g @fail-kit/cli
      
      - name: Start server
        run: npm start &
      
      - name: Wait for server
        run: sleep 5
      
      - name: Scan and generate tests
        run: fail-audit scan --output ./generated-cases
      
      - name: Run audit
        run: fail-audit run --ci --format junit --output audit-results/results.xml
      
      - name: Upload JUnit results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: junit-results
          path: audit-results/results.xml
      
      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: audit-results/results.xml
```

### PR Comment with Results

```yaml
name: F.A.I.L. Kit Audit with PR Comment

on:
  pull_request:

jobs:
  audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install and run
        run: |
          npm ci
          npm install -g @fail-kit/cli
          npm start &
          sleep 5
          fail-audit scan
          fail-audit run --ci --format markdown --output audit-results/summary.md || true
      
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const summary = fs.readFileSync('audit-results/summary.md', 'utf8');
            
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## F.A.I.L. Kit Audit Results\n\n${summary}`
            });
```

---

## GitLab CI

### Basic Configuration

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - audit

variables:
  NODE_VERSION: "20"

fail-audit:
  stage: audit
  image: node:${NODE_VERSION}
  
  before_script:
    - npm ci
    - npm install -g @fail-kit/cli
  
  script:
    # Start server in background
    - npm start &
    - sleep 5
    
    # Run audit
    - fail-audit scan
    - fail-audit run --ci --format junit --output audit-results/results.xml
  
  artifacts:
    when: always
    paths:
      - audit-results/
    reports:
      junit: audit-results/results.xml
  
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'
```

### With HTML Report

```yaml
fail-audit:
  stage: audit
  image: node:20
  
  script:
    - npm ci
    - npm install -g @fail-kit/cli
    - npm start &
    - sleep 5
    - fail-audit scan
    - fail-audit run --ci --format html
  
  artifacts:
    when: always
    paths:
      - audit-results/*.html
    expire_in: 1 week
  
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

---

## Other CI Systems

### Generic Script

Works with any CI system:

```bash
#!/bin/bash
set -e

# Install F.A.I.L. Kit
npm install -g @fail-kit/cli

# Start your server
npm start &
SERVER_PID=$!

# Wait for server
sleep 5

# Run audit
fail-audit scan
fail-audit run --ci --format junit --output results.xml

# Cleanup
kill $SERVER_PID

# Exit with audit result
exit $?
```

### CircleCI

```yaml
version: 2.1

jobs:
  audit:
    docker:
      - image: cimg/node:20.0
    
    steps:
      - checkout
      
      - run:
          name: Install dependencies
          command: npm ci
      
      - run:
          name: Install F.A.I.L. Kit
          command: npm install -g @fail-kit/cli
      
      - run:
          name: Start server
          command: npm start
          background: true
      
      - run:
          name: Wait for server
          command: sleep 5
      
      - run:
          name: Run audit
          command: |
            fail-audit scan
            fail-audit run --ci --format junit --output test-results/results.xml
      
      - store_test_results:
          path: test-results
      
      - store_artifacts:
          path: audit-results

workflows:
  main:
    jobs:
      - audit
```

### Jenkins

```groovy
pipeline {
    agent any
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
                sh 'npm install -g @fail-kit/cli'
            }
        }
        
        stage('Start Server') {
            steps {
                sh 'npm start &'
                sh 'sleep 5'
            }
        }
        
        stage('Audit') {
            steps {
                sh 'fail-audit scan'
                sh 'fail-audit run --ci --format junit --output audit-results/results.xml'
            }
            post {
                always {
                    junit 'audit-results/results.xml'
                    archiveArtifacts artifacts: 'audit-results/*'
                }
            }
        }
    }
}
```

---

## Configuration Options

### CLI Flags for CI

| Flag | Description |
|------|-------------|
| `--ci` | CI mode: no colors, exit code 1 on failures |
| `--format junit` | JUnit XML output (for test result integration) |
| `--format html` | HTML report for humans |
| `--format markdown` | Markdown summary (for PR comments) |
| `--output <file>` | Specify output file path |
| `--quiet` | Suppress progress output |

### Environment Variables

```bash
# Override endpoint
export FAIL_AUDIT_ENDPOINT=http://localhost:3000/eval/run

# Override timeout
export FAIL_AUDIT_TIMEOUT=30000

# Skip network checks in doctor
export FAIL_AUDIT_SKIP_NETWORK=true
```

### Configuration File

Create `fail-audit.config.json`:

```json
{
  "endpoint": "http://localhost:8000/eval/run",
  "timeout": 30000,
  "cases_dir": "./cases",
  "output_dir": "./audit-results",
  "levels": {
    "smoke_test": true,
    "interrogation": true,
    "red_team": true
  }
}
```

---

## Handling Failures

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | One or more tests failed |

### Allow Failures (Not Recommended)

```yaml
# GitHub Actions
- run: fail-audit run --ci || true

# GitLab CI
fail-audit:
  allow_failure: true
```

### Fail Only on Critical

```yaml
# Parse results and fail on critical only
- name: Check for critical failures
  run: |
    CRITICAL=$(cat audit-results/results.json | jq '.results[] | select(.severity == "critical" and .pass == false)' | wc -l)
    if [ "$CRITICAL" -gt 0 ]; then
      echo "Critical failures detected!"
      exit 1
    fi
```

---

## Best Practices

### 1. Run on Every PR

```yaml
on:
  pull_request:
    branches: [main, develop]
```

### 2. Cache Dependencies

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 3. Use Matrix for Multiple Configs

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
    
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### 4. Store Reports for Debugging

```yaml
- uses: actions/upload-artifact@v4
  if: always()  # Upload even on failure
  with:
    name: audit-report
    path: audit-results/
    retention-days: 30
```

### 5. Block Merges on Failure

In GitHub:
1. Settings → Branches → Branch protection rules
2. Require status checks: `F.A.I.L. Kit Audit`

### 6. Scheduled Audits

```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
```

---

## Troubleshooting

### Server Not Starting

```yaml
- name: Start and verify server
  run: |
    npm start &
    for i in {1..30}; do
      if curl -s http://localhost:8000/health; then
        echo "Server ready"
        break
      fi
      echo "Waiting for server... ($i)"
      sleep 1
    done
```

### Timeout Issues

Increase timeout in config:

```json
{
  "timeout": 60000
}
```

### Port Conflicts

Use a unique port:

```yaml
env:
  PORT: ${{ job.container.ports[0] }}
```

---

## Related

- [Easy Integration](EASY_INTEGRATION.md)
- [Examples](../examples/)
- [CLI Documentation](../cli/README.md)
