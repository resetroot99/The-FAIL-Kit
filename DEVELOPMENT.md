# Development Guide

This guide will help you set up your development environment and understand the project structure for contributing to The F.A.I.L. Kit.

## Prerequisites

- **Node.js:** 16.0.0 or higher
- **Python:** 3.10 or higher
- **Git:** Latest version
- **VSCode:** Recommended (with recommended extensions)

## Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/resetroot99/The-FAIL-Kit.git
cd The-FAIL-Kit
```

### 2. Install Dependencies

#### CLI
```bash
cd cli
npm install
cd ..
```

#### Middleware
```bash
cd middleware
npm install
cd ..
```

#### VSCode Extension
```bash
cd vscode-extension
npm install
cd ..
```

#### Python Components
```bash
# FastAPI middleware
cd middleware/fastapi
pip install -e .
cd ../..

# Python LSP
cd python-lsp
pip install -e .
cd ..
```

### 3. Open in VSCode

When you open the repository in VSCode, you'll be prompted to install recommended extensions. Accept this to get the optimal development experience.

## Project Structure

```
The-FAIL-Kit/
├── cli/                    # Main CLI tool (@fail-kit/cli)
├── middleware/             # Framework integrations
│   ├── express/           # Express.js middleware
│   ├── nextjs/            # Next.js middleware
│   ├── fastapi/           # FastAPI middleware
│   ├── langchain/         # LangChain adapters
│   └── proxy/             # Universal proxy
├── vscode-extension/       # VSCode extension for real-time analysis
├── python-lsp/            # Python Language Server Protocol implementation
├── cases/                 # Test case suites
│   ├── extended/          # Extended cases from Alis-book-of-fail
│   ├── security/          # Security-focused test cases
│   └── real-incidents/    # Cases based on real-world incidents
├── docs/                  # Documentation
├── examples/              # Integration examples
├── enforcement/           # Production gates and policies
└── receipt-standard/      # Open-source receipt standard

```

## Development Workflow

### Running Tests

```bash
# CLI tests
cd cli
npm test

# End-to-end tests
./test-e2e.sh
```

### Code Style

The project uses:
- **Prettier** for JavaScript/TypeScript formatting
- **Black** for Python formatting
- **ESLint** for JavaScript/TypeScript linting
- **Flake8** for Python linting

Formatting happens automatically on save if you're using VSCode with the recommended extensions.

### Making Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test your changes locally
4. Commit with clear messages
5. Push and create a pull request

## VSCode Configuration

The repository includes VSCode settings that:
- Format code on save
- Run linters automatically
- Exclude build artifacts from search
- Configure Python and Node.js environments

If you're not using VSCode, the `.editorconfig` file will help maintain consistent formatting.

## Testing Your Changes

### CLI

```bash
cd cli
npm link
fail-audit --version
```

### Middleware

```bash
cd examples/express-example
npm install
npm start
# In another terminal
fail-audit run --base-url http://localhost:3000
```

### VSCode Extension

1. Open `vscode-extension/` in VSCode
2. Press F5 to launch Extension Development Host
3. Open a sample project
4. Test the extension features

## Common Issues

### Node Modules Not Found

```bash
rm -rf node_modules package-lock.json
npm install
```

### Python Import Errors

```bash
pip install -e .
```

### VSCode Extension Not Loading

1. Reload VSCode window (Cmd+Shift+P > Reload Window)
2. Check the Output panel for errors
3. Ensure all dependencies are installed

## Architecture Notes

### CLI Architecture

The CLI (`cli/src/index.js`) is the main entry point. It:
1. Scans your codebase for agent code
2. Generates test cases
3. Runs audits against your system
4. Generates reports

### Middleware Architecture

Each middleware package wraps your agent endpoint and:
1. Captures execution traces
2. Validates receipts
3. Enforces gates
4. Returns structured responses

### VSCode Extension Architecture

The extension provides:
1. Real-time static analysis
2. Auto-fix suggestions
3. Inline diagnostics
4. Integration with CI/CD

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## License

See [LICENSE.txt](LICENSE.txt) for licensing information.
