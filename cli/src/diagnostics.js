/**
 * F.A.I.L. Kit - Diagnostics
 * Health checks and troubleshooting utilities.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yaml = require('js-yaml');
const { loadConfig, configExists, findConfigFile, validateConfig } = require('./config');

const MIN_NODE_VERSION = 16;
const RECOMMENDED_NODE_VERSION = 18;
const MIN_DISK_SPACE_MB = 100;

/**
 * Check result structure
 */
function createCheck(name, status, message, suggestion = null) {
  return { name, status, message, suggestion };
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  
  if (major < MIN_NODE_VERSION) {
    return createCheck(
      'Node.js Version',
      'fail',
      `Node.js ${version} is below minimum (v${MIN_NODE_VERSION})`,
      `Upgrade to Node.js v${RECOMMENDED_NODE_VERSION}+ for best compatibility`
    );
  }
  
  if (major < RECOMMENDED_NODE_VERSION) {
    return createCheck(
      'Node.js Version',
      'warn',
      `Node.js ${version} works but v${RECOMMENDED_NODE_VERSION}+ is recommended`,
      `Consider upgrading to Node.js v${RECOMMENDED_NODE_VERSION}+`
    );
  }
  
  return createCheck('Node.js Version', 'pass', `Node.js ${version}`);
}

/**
 * Check configuration file
 */
function checkConfigFile() {
  const configPath = findConfigFile();
  
  if (!configPath) {
    return createCheck(
      'Configuration File',
      'fail',
      'No fail-audit.config.json found',
      'Run: fail-audit init'
    );
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    const validation = validateConfig(config);
    
    if (!validation.valid) {
      return createCheck(
        'Configuration File',
        'fail',
        `Invalid config: ${validation.errors.join(', ')}`,
        'Edit fail-audit.config.json to fix the errors'
      );
    }
    
    if (validation.warnings.length > 0) {
      return createCheck(
        'Configuration File',
        'warn',
        `Config has warnings: ${validation.warnings.join(', ')}`,
        'Review fail-audit.config.json'
      );
    }
    
    return createCheck(
      'Configuration File',
      'pass',
      `Found at ${configPath}`
    );
  } catch (error) {
    return createCheck(
      'Configuration File',
      'fail',
      `Cannot parse config: ${error.message}`,
      'Check fail-audit.config.json for JSON syntax errors'
    );
  }
}

/**
 * Check cases directory
 */
function checkCasesDirectory() {
  const { config, error } = loadConfig();
  
  if (error || !config) {
    return createCheck(
      'Test Cases',
      'skip',
      'Skipped (no valid config)',
      null
    );
  }
  
  const casesDir = path.resolve(process.cwd(), config.cases_dir);
  
  if (!fs.existsSync(casesDir)) {
    return createCheck(
      'Test Cases',
      'fail',
      `Cases directory not found: ${casesDir}`,
      `Create the directory or update cases_dir in config`
    );
  }
  
  const yamlFiles = fs.readdirSync(casesDir).filter(f => f.endsWith('.yaml'));
  
  if (yamlFiles.length === 0) {
    return createCheck(
      'Test Cases',
      'fail',
      `No .yaml files in ${casesDir}`,
      'Add test case files or check the cases_dir path'
    );
  }
  
  // Validate YAML syntax for a sample of files
  let invalidFiles = [];
  for (const file of yamlFiles.slice(0, 10)) {
    try {
      const content = fs.readFileSync(path.join(casesDir, file), 'utf8');
      yaml.load(content);
    } catch (e) {
      invalidFiles.push(file);
    }
  }
  
  if (invalidFiles.length > 0) {
    return createCheck(
      'Test Cases',
      'warn',
      `${invalidFiles.length} files have YAML syntax errors`,
      `Check: ${invalidFiles.join(', ')}`
    );
  }
  
  return createCheck(
    'Test Cases',
    'pass',
    `${yamlFiles.length} test cases found`
  );
}

/**
 * Check endpoint connectivity
 */
async function checkEndpointConnectivity() {
  const { config, error } = loadConfig();
  
  if (error || !config) {
    return createCheck(
      'Endpoint Connectivity',
      'skip',
      'Skipped (no valid config)',
      null
    );
  }
  
  const endpoint = config.endpoint;
  
  try {
    // Just try a simple POST to see if the endpoint responds
    const response = await axios.post(endpoint, { inputs: { user: 'health check' } }, {
      timeout: 5000,
      validateStatus: () => true // Accept any status
    });
    
    if (response.status >= 200 && response.status < 500) {
      return createCheck(
        'Endpoint Connectivity',
        'pass',
        `Endpoint reachable: ${endpoint}`
      );
    }
    
    return createCheck(
      'Endpoint Connectivity',
      'warn',
      `Endpoint returned ${response.status}`,
      'The endpoint is reachable but may not be configured correctly'
    );
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return createCheck(
        'Endpoint Connectivity',
        'fail',
        `Connection refused: ${endpoint}`,
        'Start your agent server or update the endpoint in config'
      );
    }
    
    if (error.code === 'ENOTFOUND') {
      return createCheck(
        'Endpoint Connectivity',
        'fail',
        `Host not found: ${endpoint}`,
        'Check the endpoint URL in your config'
      );
    }
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return createCheck(
        'Endpoint Connectivity',
        'fail',
        `Connection timed out: ${endpoint}`,
        'Ensure the server is running and accessible'
      );
    }
    
    return createCheck(
      'Endpoint Connectivity',
      'fail',
      `Cannot connect: ${error.message}`,
      'Check your network and endpoint configuration'
    );
  }
}

/**
 * Check output directory
 */
function checkOutputDirectory() {
  const { config, error } = loadConfig();
  
  if (error || !config) {
    return createCheck(
      'Output Directory',
      'skip',
      'Skipped (no valid config)',
      null
    );
  }
  
  const outputDir = path.resolve(process.cwd(), config.output_dir);
  
  if (!fs.existsSync(outputDir)) {
    // Try to create it
    try {
      fs.mkdirSync(outputDir, { recursive: true });
      return createCheck(
        'Output Directory',
        'pass',
        `Created: ${outputDir}`
      );
    } catch (e) {
      return createCheck(
        'Output Directory',
        'fail',
        `Cannot create: ${outputDir}`,
        'Check directory permissions'
      );
    }
  }
  
  // Check if writable
  try {
    const testFile = path.join(outputDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return createCheck(
      'Output Directory',
      'pass',
      `Writable: ${outputDir}`
    );
  } catch (e) {
    return createCheck(
      'Output Directory',
      'fail',
      `Not writable: ${outputDir}`,
      'Check directory permissions'
    );
  }
}

/**
 * Check dependencies
 */
function checkDependencies() {
  const requiredModules = ['axios', 'chalk', 'commander', 'js-yaml'];
  const missing = [];
  
  for (const mod of requiredModules) {
    try {
      require.resolve(mod);
    } catch {
      missing.push(mod);
    }
  }
  
  if (missing.length > 0) {
    return createCheck(
      'Dependencies',
      'fail',
      `Missing: ${missing.join(', ')}`,
      'Run: npm install in the CLI directory'
    );
  }
  
  return createCheck('Dependencies', 'pass', 'All required modules installed');
}

/**
 * Run all diagnostics
 */
async function runDiagnostics(options = {}) {
  const checks = [];
  
  // Synchronous checks
  checks.push(checkNodeVersion());
  checks.push(checkDependencies());
  checks.push(checkConfigFile());
  checks.push(checkCasesDirectory());
  checks.push(checkOutputDirectory());
  
  // Async checks
  if (!options.skipNetwork) {
    checks.push(await checkEndpointConnectivity());
  }
  
  return checks;
}

/**
 * Format diagnostics output for terminal
 */
function formatDiagnostics(checks, chalk) {
  const lines = [];
  
  lines.push('');
  lines.push(chalk.bold.cyan('F.A.I.L. Kit Diagnostics'));
  lines.push('');
  
  let passes = 0;
  let warnings = 0;
  let failures = 0;
  let skipped = 0;
  
  for (const check of checks) {
    let icon, color;
    
    switch (check.status) {
      case 'pass':
        icon = '✓';
        color = chalk.green;
        passes++;
        break;
      case 'warn':
        icon = '⚠';
        color = chalk.yellow;
        warnings++;
        break;
      case 'fail':
        icon = '✗';
        color = chalk.red;
        failures++;
        break;
      case 'skip':
        icon = '○';
        color = chalk.gray;
        skipped++;
        break;
      default:
        icon = '?';
        color = chalk.white;
    }
    
    lines.push(`${color(`[${icon}]`)} ${chalk.bold(check.name)}`);
    lines.push(`    ${check.message}`);
    
    if (check.suggestion) {
      lines.push(chalk.dim(`    → ${check.suggestion}`));
    }
    
    lines.push('');
  }
  
  // Summary
  lines.push(chalk.bold('─'.repeat(40)));
  
  const summary = [];
  if (passes > 0) summary.push(chalk.green(`${passes} passed`));
  if (warnings > 0) summary.push(chalk.yellow(`${warnings} warnings`));
  if (failures > 0) summary.push(chalk.red(`${failures} failed`));
  if (skipped > 0) summary.push(chalk.gray(`${skipped} skipped`));
  
  lines.push(summary.join(', '));
  lines.push('');
  
  return {
    output: lines.join('\n'),
    passes,
    warnings,
    failures,
    skipped
  };
}

module.exports = {
  checkNodeVersion,
  checkConfigFile,
  checkCasesDirectory,
  checkEndpointConnectivity,
  checkOutputDirectory,
  checkDependencies,
  runDiagnostics,
  formatDiagnostics
};
