# Contributing to The F.A.I.L. Kit

Thanks for your interest in The F.A.I.L. Kit. This document explains how you can contribute.

## Commercial Product Notice

The F.A.I.L. Kit is a commercial product. The core test cases, runbook, enforcement code, and policy packs are commercially licensed and not open for public contribution.

However, we welcome certain types of contributions as outlined below.

## What You Can Contribute

### 1. Bug Reports

If you find a bug, please report it:

**Where:** [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)

**Include:**
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, framework)
- Relevant logs or error messages

### 2. Documentation Improvements

We accept pull requests for:
- Fixing typos or grammatical errors
- Clarifying confusing sections
- Adding examples or use cases
- Improving installation instructions

**Note:** Documentation changes should not alter the meaning or intent of the original content.

### 3. Integration Examples

If you have integrated The F.A.I.L. Kit with a framework or tool not currently covered, we would love to see it:

- Submit an example in `examples/` directory
- Include a README explaining the integration
- Ensure it follows the existing example structure

### 4. Receipt Standard Contributions

The Receipt Standard (in `receipt-standard/`) is open-source under MIT license. Contributions to the standard are welcome:

- Schema improvements
- SDK enhancements (TypeScript, Python)
- Additional language SDKs
- Validation logic improvements

See `receipt-standard/CONTRIBUTING.md` for details.

## What We Do Not Accept

We do not accept pull requests for:
- Test case modifications or additions (these are curated commercially)
- Changes to the audit logic or scoring
- Modifications to the enforcement gates
- Changes to the CLI core functionality
- Alterations to the report templates

If you have suggestions for these areas, please email ali@jakvan.io instead.

## How to Submit

### For Bug Reports

1. Check if the issue already exists
2. Create a new issue with the bug report template
3. Provide all requested information
4. Wait for maintainer response

### For Documentation PRs

1. Fork the repository
2. Create a branch: `git checkout -b docs/fix-typo-readme`
3. Make your changes
4. Test that all links work
5. Submit a pull request with a clear description

### For Examples

1. Fork the repository
2. Create your example in `examples/your-framework-example/`
3. Include a README.md
4. Test that it works end-to-end
5. Submit a pull request

## Code Style

If contributing code:
- Use 2-space indentation
- Follow existing code patterns
- Add comments for non-obvious logic
- Keep functions small and focused
- No unnecessary dependencies

## Testing

Before submitting:
- Run `./test-e2e.sh` to ensure nothing breaks
- Test your changes on your local setup
- Verify all documentation links work

## Review Process

1. **Submission:** You submit a PR or issue
2. **Review:** Maintainer reviews within 5 business days
3. **Feedback:** You address any requested changes
4. **Merge:** PR is merged or issue is resolved

## License

By contributing, you agree that your contributions will be licensed under the same license as the component you are contributing to:
- Receipt Standard contributions: MIT License
- Documentation and examples: MIT License
- Bug reports and issues: No license (public domain)

## Questions?

If you are unsure whether your contribution fits, email ali@jakvan.io before starting work.

## Code of Conduct

Be professional. Be respectful. No harassment, discrimination, or spam.

Violations will result in immediate ban from the project.

## Contact

- **Bugs and features:** [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)
- **Security issues:** ali@jakvan.io (private)
- **General questions:** [GitHub Discussions](https://github.com/resetroot99/The-FAIL-Kit/discussions)
- **Commercial inquiries:** ali@jakvan.io

---

**No trace, no ship.**
