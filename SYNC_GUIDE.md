# Synchronization Guide

This guide explains how to keep The F.A.I.L. Kit synchronized with the upstream Alis-book-of-fail repository.

## Why Synchronization Matters

The F.A.I.L. Kit is built on top of [Alis-book-of-fail](https://github.com/resetroot99/Alis-book-of-fail), which serves as the open-source foundation and doctrinal framework. As new test cases, failure modes, and improvements are added to the upstream repository, they should be periodically integrated into The F.A.I.L. Kit to maintain comprehensive coverage.

## What Gets Synchronized

### Test Cases

Test cases from `Alis-book-of-fail/eval/cases/` are synchronized to `The-FAIL-Kit/cases/extended/`. This ensures that the commercial product benefits from community-contributed test cases while maintaining its curated core suite.

**Frequency:** Monthly or when significant new cases are added upstream.

### Documentation

Key documentation from `Alis-book-of-fail/docs/` should be reviewed and integrated into `The-FAIL-Kit/docs/` as appropriate. This includes:

- Doctrine updates
- Failure taxonomy expansions
- New failure modes
- Best practices

**Frequency:** Quarterly or when major doctrine updates occur.

## Synchronization Process

### 1. Test Case Sync

```bash
# Clone or update both repositories
cd ~/projects
git clone https://github.com/resetroot99/Alis-book-of-fail.git
git clone https://github.com/resetroot99/The-FAIL-Kit.git

# Run the sync script
cd The-FAIL-Kit
./scripts/sync-test-cases.sh
```

The sync script will:
1. Identify new test cases in Alis-book-of-fail
2. Copy them to `cases/extended/`
3. Update the extended cases README
4. Create a summary report

### 2. Manual Review

After running the sync script:

1. Review the new test cases in `cases/extended/`
2. Test them against your reference implementation
3. Update the CLI if new test categories are introduced
4. Update documentation to reference new failure modes

### 3. Commit and Release

```bash
git add cases/extended/
git commit -m "Sync test cases from Alis-book-of-fail (YYYY-MM-DD)"
git push origin main
```

Update the version number if this is a significant sync:

```bash
# In cli/package.json
npm version minor
npm publish
```

## Creating the Sync Script

Create `scripts/sync-test-cases.sh`:

```bash
#!/bin/bash

# Sync test cases from Alis-book-of-fail to The-FAIL-Kit

set -e

BOOK_PATH="../Alis-book-of-fail"
KIT_PATH="."

if [ ! -d "$BOOK_PATH" ]; then
  echo "Error: Alis-book-of-fail repository not found at $BOOK_PATH"
  exit 1
fi

echo "Syncing test cases from Alis-book-of-fail..."

# Create extended directory if it doesn't exist
mkdir -p "$KIT_PATH/cases/extended"

# Count existing files
existing_count=$(find "$KIT_PATH/cases/extended" -name "*.yaml" | wc -l)

# Copy new test cases
for file in "$BOOK_PATH/eval/cases"/*/*.yaml; do
  basename_file=$(basename "$file")
  
  # Skip if already exists in core cases
  if [ -f "$KIT_PATH/cases/$basename_file" ]; then
    continue
  fi
  
  # Copy to extended
  cp "$file" "$KIT_PATH/cases/extended/$basename_file"
done

# Count new files
new_count=$(find "$KIT_PATH/cases/extended" -name "*.yaml" | wc -l)
added=$((new_count - existing_count))

echo "Sync complete!"
echo "  - Added: $added new test cases"
echo "  - Total extended cases: $new_count"

# Update README
cat > "$KIT_PATH/cases/extended/README.md" << EOF
# Extended Test Cases

This directory contains additional test cases synchronized from the [Alis-book-of-fail](https://github.com/resetroot99/Alis-book-of-fail) repository.

Last synchronized: $(date +%Y-%m-%d)

Total extended cases: $new_count

See the main repository README for usage instructions.
EOF

echo "Updated cases/extended/README.md"
```

Make it executable:

```bash
chmod +x scripts/sync-test-cases.sh
```

## Handling Conflicts

If a test case exists in both repositories but has diverged:

1. **Prefer the Alis-book-of-fail version** for the extended suite
2. **Keep the curated version** in the core cases
3. Document any intentional divergences in `CHANGELOG.md`

## Version Compatibility

Ensure that:
- Test case schema versions match
- The CLI can parse all synchronized cases
- Gate configurations are compatible

If schema changes occur in Alis-book-of-fail, update the CLI parser accordingly before syncing.

## Reporting Sync Issues

If you encounter issues during synchronization:

1. Check the schema compatibility
2. Verify file paths and naming conventions
3. Review the CLI logs for parsing errors
4. Open an issue in the appropriate repository

## Best Practices

- **Test before committing:** Always run the full test suite after syncing
- **Document changes:** Update CHANGELOG.md with sync details
- **Review carefully:** Not all upstream cases may be appropriate for the commercial product
- **Maintain quality:** Curate the extended cases to ensure they meet quality standards
- **Keep licenses clear:** Extended cases remain MIT licensed as they come from the open-source repository

## Contact

For questions about synchronization, contact ali@jakvan.io.
