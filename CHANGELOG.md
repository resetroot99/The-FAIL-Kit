# Changelog

All notable changes to The F.A.I.L. Kit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-01-02

### Fixed
- Improved error handling in CLI for malformed YAML files
- Fixed receipt verification logic in dashboard reporter
- Corrected version display inconsistencies across documentation

### Changed
- Enhanced HTML report dashboard with better performance metrics
- Updated LICENSE with proper copyright and contact information
- Standardized package.json metadata across all middleware packages

## [1.5.0] - 2025-12-31

### Added
- **Automatic test case generation** with `fail-audit scan` command
- Codebase scanner that detects endpoints, agent functions, and tool calls
- Auto-generates receipt, error handling, hallucination, and integrity tests
- **Zero-config middleware** for Express, Next.js, and FastAPI
- Enhanced HTML reports with error explanations and suggested fixes
- `--install` flag for automatic middleware installation
- Smart defaults: auto-scan if no test cases exist

### Changed
- Improved dashboard reporter with severity-based categorization
- Enhanced provenance tracking with git integration
- Better failure clustering detection

## [1.4.1] - 2025-12-28

### Fixed
- CLI timeout handling for slow endpoints
- Report generation for large result sets
- Windows path compatibility issues

### Changed
- Improved error messages with actionable suggestions
- Updated documentation with more integration examples

## [1.4.0] - 2025-12-20

### Added
- Custom case generator for domain-specific tests
- JUnit XML report format for CI/CD integration
- Markdown report format
- `fail-audit doctor` command for diagnostics

### Changed
- Refactored report generation into modular system
- Improved test case organization with INDEX.md

## [1.3.0] - 2025-12-10

### Added
- Receipt standard open-sourced under MIT license
- TypeScript and Python SDK for receipt validation
- Policy pack examples for enforcement

### Changed
- Separated receipt standard into independent package
- Updated documentation structure

## [1.2.0] - 2025-12-01

### Added
- Interactive configuration wizard with `fail-audit init`
- Support for multiple audit levels (smoke, interrogation, red-team)
- Framework detection and setup assistance

### Changed
- Improved CLI UX with better prompts and validation
- Enhanced error reporting

## [1.1.0] - 2025-11-15

### Added
- FastAPI middleware and examples
- Next.js middleware and examples
- Enforcement gates for production use

### Changed
- Expanded test case library to 50 cases
- Improved documentation

## [1.0.0] - 2025-11-01

### Added
- Initial production release
- 40 curated test cases (execution integrity suite)
- CLI tool with init, run, report commands
- Express middleware
- Reference agent implementation
- 3-level audit structure (smoke, interrogation, red-team)
- HTML report generation
- Comprehensive documentation
- Windows/macOS/Linux support

---

## Version History Summary

- **1.5.x** - Auto-scan and zero-config middleware
- **1.4.x** - Custom case generation and CI/CD integration
- **1.3.x** - Receipt standard open-sourced
- **1.2.x** - Interactive setup and multi-level audits
- **1.1.x** - Multi-framework support
- **1.0.x** - Initial release

---

For detailed release notes, see individual RELEASE_*.md files in the repository.

[1.5.1]: https://github.com/resetroot99/The-FAIL-Kit/releases/tag/v1.5.1
[1.5.0]: https://github.com/resetroot99/The-FAIL-Kit/releases/tag/v1.5.0
[1.4.1]: https://github.com/resetroot99/The-FAIL-Kit/releases/tag/v1.4.1
[1.4.0]: https://github.com/resetroot99/The-FAIL-Kit/releases/tag/v1.4.0
[1.3.0]: https://github.com/resetroot99/The-FAIL-Kit/releases/tag/v1.3.0
[1.2.0]: https://github.com/resetroot99/The-FAIL-Kit/releases/tag/v1.2.0
[1.1.0]: https://github.com/resetroot99/The-FAIL-Kit/releases/tag/v1.1.0
[1.0.0]: https://github.com/resetroot99/The-FAIL-Kit/releases/tag/v1.0.0
