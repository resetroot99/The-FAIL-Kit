# Security Policy

## Supported Versions

We actively support the following versions of The F.A.I.L. Kit:

| Version | Supported          |
| ------- | ------------------ |
| 1.5.x   | :white_check_mark: |
| 1.4.x   | :white_check_mark: |
| < 1.4   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in The F.A.I.L. Kit, please report it responsibly.

**DO NOT** open a public GitHub issue for security vulnerabilities.

### How to Report

Send details to: **ali@jakvan.io**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### What to Expect

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 5 business days
- **Fix timeline:** Depends on severity
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: Next release cycle

### Disclosure Policy

We follow coordinated disclosure:
1. You report the issue privately
2. We confirm and develop a fix
3. We release a patched version
4. We publicly disclose the issue (with credit to you, if desired)

### Security Best Practices

When using The F.A.I.L. Kit:

1. **Keep it updated:** Always use the latest version
2. **Secure your endpoint:** The `/eval/run` endpoint should not be publicly exposed in production
3. **Validate inputs:** Sanitize all user inputs before passing to your agent
4. **Protect receipts:** Receipt data may contain sensitive information; store securely
5. **Review test cases:** Some test cases include adversarial inputs; understand them before deployment

### Out of Scope

The following are not considered security vulnerabilities:
- Test cases that intentionally include malicious inputs (that's the point)
- Agents failing audit tests (that's expected behavior)
- Performance issues or resource exhaustion from running audits
- Issues in third-party dependencies (report to the upstream project)

## Contact

For security concerns: **ali@jakvan.io**

For general support: [GitHub Issues](https://github.com/resetroot99/The-FAIL-Kit/issues)
