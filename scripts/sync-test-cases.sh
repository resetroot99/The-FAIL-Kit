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
existing_count=$(find "$KIT_PATH/cases/extended" -name "*.yaml" 2>/dev/null | wc -l)

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
new_count=$(find "$KIT_PATH/cases/extended" -name "*.yaml" 2>/dev/null | wc -l)
added=$((new_count - existing_count))

echo "Sync complete!"
echo "  - Added: $added new test cases"
echo "  - Total extended cases: $new_count"

# Update README
cat > "$KIT_PATH/cases/extended/README.md" << INNEREOF
# Extended Test Cases

This directory contains additional test cases synchronized from the [Alis-book-of-fail](https://github.com/resetroot99/Alis-book-of-fail) repository.

Last synchronized: $(date +%Y-%m-%d)

Total extended cases: $new_count

See the main repository README for usage instructions.
INNEREOF

echo "Updated cases/extended/README.md"
