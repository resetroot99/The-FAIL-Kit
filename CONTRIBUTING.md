# Contributing to The F.A.I.L. Kit

Thanks for your interest in contributing to The F.A.I.L. Kit! This is an open-source project under the MIT License, and we welcome contributions from the community.

## Open Source Project

The F.A.I.L. Kit is fully open source. All components are available under the MIT License:

- CLI tools and audit framework
- Test cases and runbook
- Enforcement code and policy packs
- Receipt Standard
- Integration examples and middleware
- VSCode extension

## Ways to Contribute

### 1. Bug Reports

If you find a bug, please report it:

**Where:** [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)

**Include:**

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, framework)
- Relevant logs or error messages

### 2. Feature Requests

Have an idea for a new feature? Open a [GitHub Discussion](https://github.com/resetroot99/The-FAIL-Kit/discussions) or issue.

**Good feature requests include:**

- Use case description
- Why this would be valuable
- Proposed implementation (if you have ideas)

### 3. Test Cases

We welcome new test cases for:

- New failure modes you've discovered
- Framework-specific patterns
- Real-world incidents
- Edge cases

Submit test cases in `cases/` directory following the existing YAML format.

### 4. Documentation

Improvements welcome:

- Fixing typos or grammatical errors
- Clarifying confusing sections
- Adding examples or use cases
- Improving installation instructions
- Translating documentation

### 5. Code Contributions

We accept pull requests for:

- Bug fixes
- New detection rules
- Framework integrations
- Auto-fix improvements
- Performance optimizations
- Test coverage

### 6. Integration Examples

If you've integrated F.A.I.L. Kit with a new framework or tool:

- Submit an example in `examples/` directory
- Include a README explaining the integration
- Ensure it follows the existing example structure

### 7. Receipt Standard Contributions

The Receipt Standard is designed for industry-wide adoption. Contributions welcome:

- Schema improvements
- SDK enhancements (TypeScript, Python)
- Additional language SDKs
- Validation logic improvements

See `receipt-standard/CONTRIBUTING.md` for details.

## Getting Started

### Fork and Clone

```bash
# Fork the repository on GitHub
git clone https://github.com/YOUR_USERNAME/The-FAIL-Kit.git
cd The-FAIL-Kit
```

### CLI Development

```bash
cd cli
npm install
npm test
npm link  # Test locally
```

### VSCode Extension Development

```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

### Python Package Development

```bash
cd middleware/langchain/python
pip install -e ".[dev]"
pytest
```

## Submitting Changes

### 1. Create a Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/issue-123
```

### 2. Make Your Changes

- Write clear, descriptive commit messages
- Follow existing code style
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run tests
npm test  # For Node.js packages
pytest    # For Python packages

# Run end-to-end tests
./test-e2e.sh
```

### 4. Submit a Pull Request

- Push your branch to your fork
- Open a pull request against `main`
- Provide a clear description of changes
- Reference any related issues

## Code Style

### TypeScript/JavaScript

- Use 2-space indentation
- Use single quotes for strings
- Add types for all function parameters and returns
- Follow existing patterns in the codebase
- Use meaningful variable names

### Python

- Follow PEP 8
- Use type hints
- Add docstrings for public functions
- Use 4-space indentation

### YAML Test Cases

```yaml
id: CATEGORY_NNNN_description
severity: critical|high|medium|low
category: agent|contract|rag|security|etc
description: Clear one-line description
scenario: |
  Multi-line scenario description
expected_behavior: What should happen
failure_mode: What can go wrong
detection: How F.A.I.L. Kit catches it
```

## Testing Guidelines

- Write tests for all new features
- Ensure existing tests pass
- Aim for >80% code coverage
- Test edge cases and error conditions

## Documentation Requirements

For new features:

- Update README.md
- Add examples in `examples/`
- Document configuration options
- Update relevant guides in `docs/`

## Review Process

1. **Submission:** You submit a PR
2. **CI Checks:** Automated tests run
3. **Review:** Maintainer reviews within 5 business days
4. **Feedback:** Address any requested changes
5. **Merge:** PR is merged once approved

## Commit Message Format

Use clear, descriptive commit messages:

```
feat: Add support for custom receipt validators
fix: Resolve phantom success detection false positives
docs: Update installation guide for Python 3.12
test: Add coverage for tool hallucination detection
```

Prefixes:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `test:` - Adding or updating tests
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `perf:` - Performance improvement
- `chore:` - Maintenance tasks

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

Be professional, respectful, and inclusive:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other contributors

Violations will result in removal from the project.

## Need Help?

- **Questions:** [GitHub Discussions](https://github.com/resetroot99/The-FAIL-Kit/discussions)
- **Bugs:** [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)
- **Security:** Email ali@jakvan.io (private)
- **General:** Join our community discussions

## Recognition

Contributors are recognized in:

- `CHANGELOG.md` for significant contributions
- GitHub contributors page
- Release notes

Thank you for contributing to making AI agents more reliable!

---

**No trace, no ship.**
