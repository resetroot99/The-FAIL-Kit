# F.A.I.L. Kit Publishing Guide

This guide covers publishing all F.A.I.L. Kit packages to their respective registries.

## Package Versions (v1.5.0)

| Package | Registry | Status |
|---------|----------|--------|
| `@fail-kit/core` | npm | Ready |
| `@fail-kit/langchain` | npm | Ready |
| `fail-kit-langchain` | PyPI | Ready |
| `fail-kit-vscode` | VS Code Marketplace | v0.2.0 Ready |

## Prerequisites

### npm Packages

```bash
# Login to npm
npm login

# Verify you're logged in
npm whoami
```

### PyPI Package

```bash
# Install build tools
pip install build twine

# Configure ~/.pypirc or use token
# export TWINE_USERNAME=__token__
# export TWINE_PASSWORD=pypi-xxxxx
```

### VS Code Extension

```bash
# Install vsce
npm install -g @vscode/vsce

# Login to publisher
vsce login AliJakvani
# Enter your Personal Access Token
```

## Publishing Steps

### 1. @fail-kit/core (npm)

```bash
cd packages/core

# Install dependencies
npm install

# Build
npm run build

# Test (optional)
npm test

# Publish
npm publish --access public
```

### 2. @fail-kit/langchain (npm)

```bash
cd middleware/langchain/javascript

# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Publish
npm publish --access public
```

### 3. fail-kit-langchain (PyPI)

```bash
cd middleware/langchain/python

# Build
python -m build

# Check the package
twine check dist/*

# Upload to PyPI
twine upload dist/*

# Or upload to Test PyPI first
twine upload --repository testpypi dist/*
```

### 4. VS Code Extension

```bash
cd vscode-extension

# Install dependencies
npm install

# Compile
npm run compile

# Package (creates .vsix file)
vsce package

# Publish to marketplace
vsce publish

# Or publish with version bump
vsce publish minor
```

## Quick Publish Script

Create this script at the project root:

```bash
#!/bin/bash
# publish-all.sh

set -e

echo "🚀 Publishing F.A.I.L. Kit packages..."

# 1. @fail-kit/core
echo "📦 Publishing @fail-kit/core..."
cd packages/core
npm install && npm run build && npm publish --access public
cd ../..

# 2. @fail-kit/langchain
echo "📦 Publishing @fail-kit/langchain..."
cd middleware/langchain/javascript
npm install && npm run build && npm publish --access public
cd ../../..

# 3. fail-kit-langchain (PyPI)
echo "🐍 Publishing fail-kit-langchain to PyPI..."
cd middleware/langchain/python
python -m build
twine upload dist/*
cd ../../..

# 4. VS Code Extension
echo "💻 Publishing VS Code extension..."
cd vscode-extension
npm install && npm run compile && vsce publish
cd ..

echo "✅ All packages published successfully!"
```

## Verifying Published Packages

### npm

```bash
# Check @fail-kit/core
npm view @fail-kit/core

# Check @fail-kit/langchain
npm view @fail-kit/langchain
```

### PyPI

```bash
pip index versions fail-kit-langchain
```

### VS Code Marketplace

Visit: https://marketplace.visualstudio.com/items?itemName=AliJakvani.fail-kit-vscode

## Troubleshooting

### npm "403 Forbidden"

- Check you're logged in: `npm whoami`
- Check package name isn't taken: `npm view <package-name>`
- For scoped packages, ensure `--access public`

### PyPI "HTTPError 400"

- Check version isn't already published
- Verify package metadata in pyproject.toml
- Use `twine check dist/*` before uploading

### vsce "TF400813"

- Regenerate Personal Access Token
- Ensure token has "Marketplace > Manage" scope
- Run `vsce login <publisher>` again

## Post-Publish Checklist

- [ ] Verify npm packages are installable
- [ ] Verify PyPI package is installable
- [ ] Test VS Code extension from marketplace
- [ ] Update CHANGELOG.md
- [ ] Create GitHub release
- [ ] Announce on social media
