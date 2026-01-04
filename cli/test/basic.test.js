const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');

const cliPath = path.join(__dirname, '../src/index.js');

describe('CLI Basic Tests', () => {
  it('should show help output', () => {
    try {
      const output = execSync(`node ${cliPath} --help`).toString();
      assert.ok(output.includes('Usage: fail-audit'));
      assert.ok(output.includes('Options:'));
    } catch (error) {
      assert.fail(`CLI execution failed: ${error.message}`);
    }
  });

  it('should show version', () => {
    try {
      const output = execSync(`node ${cliPath} --version`).toString();
      assert.ok(output.match(/\d+\.\d+\.\d+/));
    } catch (error) {
      assert.fail(`CLI execution failed: ${error.message}`);
    }
  });
});
