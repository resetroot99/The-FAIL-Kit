# Publishing LangChain Adapters to PyPI and npm

## Python Package (PyPI)

### Prerequisites

1. Install build tools:
```bash
pip install build twine
```

2. Create PyPI account at https://pypi.org/account/register/

3. Create API token at https://pypi.org/manage/account/token/

### Build and Publish

```bash
cd middleware/langchain/python

# Build the package
python -m build

# Upload to PyPI (production)
twine upload dist/*

# Or upload to TestPyPI first (recommended)
twine upload --repository testpypi dist/*
```

### Installation (after publishing)

```bash
pip install fail-kit-langchain
```

---

## JavaScript Package (npm)

### Prerequisites

1. Create npm account at https://www.npmjs.com/signup

2. Login to npm:
```bash
npm login
```

### Build and Publish

```bash
cd middleware/langchain/javascript

# Install dependencies
npm install

# Build the package
npm run build

# Publish to npm
npm publish --access public
```

### Installation (after publishing)

```bash
npm install @fail-kit/langchain-adapter
```

---

## Package Information

### Python Package
- **Name:** `fail-kit-langchain`
- **Version:** 1.0.0
- **PyPI URL:** https://pypi.org/project/fail-kit-langchain/ (after publishing)

### JavaScript Package
- **Name:** `@fail-kit/langchain-adapter`
- **Version:** 1.0.0
- **npm URL:** https://www.npmjs.com/package/@fail-kit/langchain-adapter (after publishing)

---

## Pre-Publish Checklist

### Python
- [x] pyproject.toml configured
- [x] README.md included
- [x] LICENSE.txt referenced
- [x] Tests written
- [x] GitHub URLs updated
- [ ] Build package (`python -m build`)
- [ ] Test installation locally
- [ ] Upload to PyPI

### JavaScript
- [x] package.json configured
- [x] TypeScript configured
- [x] README.md included
- [x] LICENSE.txt referenced
- [x] Tests written
- [x] GitHub URLs updated
- [ ] Build package (`npm run build`)
- [ ] Test installation locally
- [ ] Publish to npm

---

## Testing Packages Locally

### Python
```bash
cd middleware/langchain/python
python -m build
pip install dist/fail_kit_langchain-1.0.0-py3-none-any.whl
```

### JavaScript
```bash
cd middleware/langchain/javascript
npm run build
npm pack
npm install -g fail-kit-langchain-adapter-1.0.0.tgz
```

---

## Updating Package Versions

When releasing updates:

### Python
Edit `middleware/langchain/python/pyproject.toml`:
```toml
version = "1.0.1"  # Increment version
```

### JavaScript
```bash
cd middleware/langchain/javascript
npm version patch  # or minor, or major
```

---

## Notes

- Both packages are configured to work in development mode with `pip install -e .` and `npm link`
- The packages include comprehensive documentation and examples
- All dependencies are peer dependencies to avoid version conflicts
- GitHub repository URLs point to the correct resetroot99/The-FAIL-Kit repo
