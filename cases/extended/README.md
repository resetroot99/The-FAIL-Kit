# Extended Test Cases

This directory contains additional test cases synchronized from the [Alis-book-of-fail](https://github.com/resetroot99/Alis-book-of-fail) repository. These cases provide comprehensive coverage beyond the core curated test suite.

## What's Here

The extended test cases include:

- **Adversarial Cases:** Additional prompt injection, jailbreak, and policy bypass tests
- **Agentic Cases:** Extended agent behavior tests including tool loops, goal hijacking, and permission escalation
- **Contract Cases:** Additional benign test cases to validate proper system behavior
- **Multimodal Cases:** Tests for image, audio, and video processing
- **Performance Cases:** Latency, cost, and efficiency tests
- **RAG Cases:** Additional retrieval-augmented generation tests
- **Regression Cases:** Tests derived from real-world incidents
- **Scenario Cases:** Complex, multi-step workflow tests
- **Shift Cases:** Tests for handling degraded or corrupted inputs

## Usage

These test cases are automatically included when you run the full audit suite:

```bash
fail-audit run --extended
```

Or run specific extended suites:

```bash
fail-audit run --suite extended/adversarial
fail-audit run --suite extended/agentic
```

## Synchronization

These cases are periodically synchronized from the open-source Alis-book-of-fail repository to ensure The F.A.I.L. Kit maintains comprehensive coverage of known failure modes.

Last synchronized: 2026-01-04

## Contributing

While the core test cases in The F.A.I.L. Kit are commercially curated, these extended cases come from the open-source community. To contribute new test cases, please submit them to the [Alis-book-of-fail repository](https://github.com/resetroot99/Alis-book-of-fail).
