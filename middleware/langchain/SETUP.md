# Package Setup and Publishing Guide

## Current Status

The LangChain adapters are ready in the repository but need some setup before publishing to PyPI/npm.

## Quick Setup for Local Development

### Python Package

```bash
cd middleware/langchain/python

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install in development mode
pip install -e .

# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest
```

### JavaScript Package

```bash
cd middleware/langchain/javascript

# Install dependencies
npm install

# Build (once peer dependencies are installed in your project)
npm run build

# Run tests (once dependencies are available)
npm test
```

---

## Publishing to Package Registries

### Option 1: Local Installation Only (Current Setup)

Both packages are designed for local development:

**Python:**
```bash
cd middleware/langchain/python
pip install -e .
```

**JavaScript:**
```bash
cd middleware/langchain/javascript
npm install
npm link  # Makes it available globally
```

Then in your project:
```bash
npm link @fail-kit/langchain-adapter
```

### Option 2: Publish to PyPI and npm (Future)

When ready to publish:

#### Python to PyPI

1. Install publishing tools:
```bash
pip install build twine
```

2. Build:
```bash
cd middleware/langchain/python
python3 -m build
```

3. Test upload (TestPyPI):
```bash
twine upload --repository testpypi dist/*
```

4. Production upload:
```bash
twine upload dist/*
```

#### JavaScript to npm

1. Login to npm:
```bash
npm login
```

2. Build and publish:
```bash
cd middleware/langchain/javascript
npm run build
npm publish --access public
```

---

## Current Integration Method (Recommended)

Since the packages are in the same repository, users can use them directly:

### Python

```python
# Add to your project
import sys
sys.path.append('/path/to/The-FAIL-Kit/middleware/langchain/python')

from fail_kit_langchain import create_fail_kit_endpoint, ReceiptGeneratingTool
```

Or install locally:
```bash
pip install -e /path/to/The-FAIL-Kit/middleware/langchain/python
```

### JavaScript

Import directly from source:
```typescript
import { 
  createFailKitRouter, 
  ReceiptGeneratingTool 
} from '../../middleware/langchain/javascript/src/index';
```

Or install locally:
```bash
cd /path/to/your/project
npm install /path/to/The-FAIL-Kit/middleware/langchain/javascript
```

---

## Package Configuration

### Python Package (`fail-kit-langchain`)
- **Location:** `middleware/langchain/python/`
- **Config:** `pyproject.toml`
- **Version:** 1.0.0
- **Dependencies:** fastapi, langchain, langchain-core, pydantic

### JavaScript Package (`@fail-kit/langchain-adapter`)
- **Location:** `middleware/langchain/javascript/`
- **Config:** `package.json`
- **Version:** 1.0.0
- **Peer Dependencies:** express, langchain, @langchain/core

---

## For The-FAIL-Kit Users

### Recommended Approach

The adapters are designed to work directly from the repository:

1. **Clone The-FAIL-Kit:**
```bash
git clone https://github.com/resetroot99/The-FAIL-Kit.git
cd The-FAIL-Kit
```

2. **Use Python adapter:**
```bash
cd middleware/langchain/python
pip install -e .
```

3. **Use JavaScript adapter:**
```bash
cd middleware/langchain/javascript
npm install
```

4. **Run examples:**
```bash
# Python example
cd examples/langchain-python
pip install -r requirements.txt
export OPENAI_API_KEY="your-key"
python main.py

# JavaScript example
cd examples/langchain-javascript
npm install
echo "OPENAI_API_KEY=your-key" > .env
npm start
```

---

## Notes

- The packages are currently configured for local development and testing
- They can be published to PyPI/npm when ready for broader distribution
- All documentation assumes local installation from the repository
- Examples work out of the box with relative imports

---

## Publishing Checklist (When Ready)

### Before Publishing:
- [ ] Run all tests (Python and JavaScript)
- [ ] Verify examples work
- [ ] Update version numbers
- [ ] Create release notes
- [ ] Tag GitHub release
- [ ] Build packages locally and test
- [ ] Upload to test registries first

### After Publishing:
- [ ] Update documentation with installation commands
- [ ] Update examples to use published packages
- [ ] Announce release
- [ ] Monitor for issues

---

For now, the recommended approach is **local installation** from the repository, which gives users immediate access to the latest code and examples.
