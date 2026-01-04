/**
 * F.A.I.L. Kit - Report Generators
 * Central export for all report formats.
 */

const { generateHtmlReport, getSeverity, getDocLink, getRemediation } = require('./html');
const { generateJunitReport, generateMinimalJunitReport } = require('./junit');
const { generateMarkdownReport, generateCompactMarkdownReport, generateOneLiner } = require('./markdown');
const { generateDashboard } = require('./dashboard');
const { generateReactDashboard, gatherProvenance, loadBaseline } = require('./react-dashboard');

/**
 * Generate report in specified format
 * @param {Object} results - Audit results object
 * @param {string} format - Output format: 'json', 'html', 'junit', 'markdown'
 * @param {Object} options - Format-specific options
 * @returns {string} Formatted report
 */
function generateReport(results, format, options = {}) {
  switch (format.toLowerCase()) {
    case 'html':
      return generateHtmlReport(results);
    
    case 'dashboard':
      return generateDashboard(results);
    
    case 'react':
    case 'react-dashboard':
    case 'interactive':
      return generateReactDashboard(results, options);
    
    case 'junit':
    case 'xml':
      return options.minimal 
        ? generateMinimalJunitReport(results) 
        : generateJunitReport(results);
    
    case 'markdown':
    case 'md':
      return options.compact 
        ? generateCompactMarkdownReport(results) 
        : generateMarkdownReport(results);
    
    case 'oneliner':
    case 'summary':
      return generateOneLiner(results);
    
    case 'json':
    default:
      return JSON.stringify(results, null, 2);
  }
}

/**
 * Get file extension for format
 */
function getExtension(format) {
  const extensions = {
    html: '.html',
    dashboard: '.html',
    react: '.html',
    'react-dashboard': '.html',
    interactive: '.html',
    junit: '.xml',
    xml: '.xml',
    markdown: '.md',
    md: '.md',
    json: '.json',
    oneliner: '.txt',
    summary: '.txt'
  };
  return extensions[format.toLowerCase()] || '.json';
}

module.exports = {
  generateReport,
  getExtension,
  // HTML exports
  generateHtmlReport,
  getSeverity,
  getDocLink,
  getRemediation,
  // Dashboard exports
  generateDashboard,
  generateReactDashboard,
  gatherProvenance,
  loadBaseline,
  // JUnit exports
  generateJunitReport,
  generateMinimalJunitReport,
  // Markdown exports
  generateMarkdownReport,
  generateCompactMarkdownReport,
  generateOneLiner
};
