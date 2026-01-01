# Audit Demos

Visual demonstrations of the F.A.I.L. Kit in action.

## Status

**VHS tape files ready. GIFs not yet generated.**

To generate demo GIFs, you need:
1. VHS installed (see below)
2. Reference agent running
3. Run `vhs` on each `.tape` file

## What's Here

Terminal recording scripts (VHS tape files):
1. **phantom-action.tape** - Agent claiming action without receipt (FAIL)
2. **all-passing.tape** - Clean audit with all gates passing

These will generate:
- `phantom-action.gif`
- `all-passing.gif`

These demos show real CLI output catching execution integrity failures.

## Regenerating Demos

We use [VHS](https://github.com/charmbracelet/vhs) for terminal recordings.

### Install VHS

```bash
# macOS
brew install vhs

# Linux
go install github.com/charmbracelet/vhs@latest

# Or download binary from releases
```

### Record a Demo

1. Create a VHS tape file (see examples below)
2. Run VHS to generate GIF

```bash
vhs demo-script.tape
```

### Example: phantom-action.tape

```tape
Output phantom-action.gif

Set Shell bash
Set FontSize 14
Set Width 1200
Set Height 600
Set Theme "Dracula"

Type "cd fail-kit/cli"
Enter
Sleep 1s

Type "./src/index.js run --cases CONTRACT_0003 --endpoint http://localhost:8000"
Enter
Sleep 3s

# Show the failure
Type "# Agent claimed action without receipt"
Enter
Sleep 2s

# Show the audit result
Type "./src/index.js report audit-results/audit-*.json | grep CONTRACT_0003 -A 5"
Enter
Sleep 3s
```

### Example: all-passing.tape

```tape
Output all-passing.gif

Set Shell bash
Set FontSize 14
Set Width 1200
Set Height 600
Set Theme "Dracula"

Type "cd fail-kit/cli"
Enter
Sleep 1s

Type "./src/index.js run --level smoke --endpoint http://localhost:8000"
Enter
Sleep 5s

# Show clean results
Type "# All smoke tests passed!"
Enter
Sleep 2s
```

## Demo Scripts

Place VHS tape files in this directory:
- `phantom-action.tape`
- `partial-evidence.tape`
- `all-passing.tape`

Run all demos:

```bash
for tape in *.tape; do
  vhs "$tape"
done
```

## Using Demos

Demos are referenced in README.md to show buyers what FAIL Kit catches.

Place them right after "What This Is" section for maximum impact.

## Alternative: Static Screenshots

If you prefer screenshots over GIFs:

1. Run audit
2. Take screenshot of terminal
3. Annotate with arrows/highlights
4. Save as PNG in this directory

Tools for annotation:
- macOS: Preview, Skitch
- Linux: GIMP, Inkscape
- Cross-platform: Figma, Excalidraw

## Tips for Good Demos

Keep it short (under 10 seconds per demo).

Show the failure clearly (highlight failing case).

Include context (what's being tested).

Use readable terminal theme and font size.

Export at 2x resolution for retina displays.

## Questions?

See [VHS documentation](https://github.com/charmbracelet/vhs) for advanced features.
