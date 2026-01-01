/**
 * F.A.I.L. Kit - Configuration Management
 * Handles config file loading, validation, and environment variable overrides.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILENAME = 'fail-audit.config.json';

const DEFAULT_CONFIG = {
  endpoint: 'http://localhost:8000/eval/run',
  timeout: 30000,
  cases_dir: './cases',
  output_dir: './audit-results',
  levels: {
    smoke_test: true,
    interrogation: true,
    red_team: true
  }
};

const REQUIRED_FIELDS = ['endpoint', 'timeout', 'cases_dir', 'output_dir'];

/**
 * Environment variable mappings
 */
const ENV_MAPPINGS = {
  FAIL_AUDIT_ENDPOINT: 'endpoint',
  FAIL_AUDIT_TIMEOUT: 'timeout',
  FAIL_AUDIT_CASES_DIR: 'cases_dir',
  FAIL_AUDIT_OUTPUT_DIR: 'output_dir'
};

/**
 * Find config file by walking up directory tree
 */
function findConfigFile(startDir = process.cwd()) {
  let currentDir = startDir;
  
  while (currentDir !== path.dirname(currentDir)) {
    const configPath = path.join(currentDir, CONFIG_FILENAME);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    currentDir = path.dirname(currentDir);
  }
  
  return null;
}

/**
 * Validate configuration object
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateConfig(config) {
  const errors = [];
  const warnings = [];
  
  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (config[field] === undefined || config[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate endpoint URL
  if (config.endpoint) {
    try {
      new URL(config.endpoint);
    } catch {
      errors.push(`Invalid endpoint URL: ${config.endpoint}`);
    }
  }
  
  // Validate timeout
  if (config.timeout !== undefined) {
    const timeout = Number(config.timeout);
    if (isNaN(timeout) || timeout < 1000) {
      warnings.push('Timeout should be at least 1000ms');
    }
    if (timeout > 300000) {
      warnings.push('Timeout exceeds 5 minutes, this may cause issues');
    }
  }
  
  // Validate levels
  if (config.levels) {
    const validLevels = ['smoke_test', 'interrogation', 'red_team'];
    for (const level of Object.keys(config.levels)) {
      if (!validLevels.includes(level)) {
        warnings.push(`Unknown audit level: ${level}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Apply environment variable overrides
 */
function applyEnvOverrides(config) {
  const result = { ...config };
  
  for (const [envVar, configKey] of Object.entries(ENV_MAPPINGS)) {
    const value = process.env[envVar];
    if (value !== undefined) {
      if (configKey === 'timeout') {
        result[configKey] = parseInt(value, 10);
      } else {
        result[configKey] = value;
      }
    }
  }
  
  return result;
}

/**
 * Apply CLI option overrides
 */
function applyCliOverrides(config, options) {
  const result = { ...config };
  
  if (options.endpoint) result.endpoint = options.endpoint;
  if (options.timeout) result.timeout = parseInt(options.timeout, 10);
  if (options.casesDir) result.cases_dir = options.casesDir;
  if (options.outputDir) result.output_dir = options.outputDir;
  
  return result;
}

/**
 * Load configuration with full override chain:
 * defaults -> config file -> env vars -> CLI options
 */
function loadConfig(options = {}) {
  let config = { ...DEFAULT_CONFIG };
  let configPath = null;
  let configSource = 'defaults';
  
  // Try to load config file
  configPath = findConfigFile();
  if (configPath) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const fileConfig = JSON.parse(fileContent);
      config = { ...config, ...fileConfig };
      configSource = configPath;
    } catch (error) {
      return {
        config: null,
        configPath: null,
        configSource: null,
        error: `Failed to parse config file: ${error.message}`
      };
    }
  }
  
  // Apply environment variable overrides
  config = applyEnvOverrides(config);
  
  // Apply CLI option overrides
  config = applyCliOverrides(config, options);
  
  // Validate final config
  const validation = validateConfig(config);
  
  return {
    config,
    configPath,
    configSource,
    validation,
    error: null
  };
}

/**
 * Write configuration to file
 */
function writeConfig(config, targetPath = null) {
  const configPath = targetPath || path.join(process.cwd(), CONFIG_FILENAME);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

/**
 * Check if config file exists in current directory
 */
function configExists(dir = process.cwd()) {
  return fs.existsSync(path.join(dir, CONFIG_FILENAME));
}

module.exports = {
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
  REQUIRED_FIELDS,
  ENV_MAPPINGS,
  findConfigFile,
  validateConfig,
  applyEnvOverrides,
  applyCliOverrides,
  loadConfig,
  writeConfig,
  configExists
};
