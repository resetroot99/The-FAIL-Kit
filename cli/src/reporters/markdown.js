/**
 * F.A.I.L. Kit - Markdown Report Generator
 * Creates Markdown format for GitHub/GitLab PR comments and documentation.
 */

const { getSeverity } = require('./html');

/**
 * Get emoji for severity level
 */
function getSeverityEmoji(severity) {
  const emojis = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '⚪'
  };
  return emojis[severity] || '⚪';
}

/**
 * Get status emoji
 */
function getStatusEmoji(pass) {
  return pass ? '✅' : '❌';
}

/**
 * Generate a summary table for results
 */
function generateSummaryTable(results) {
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  
  return `| Metric | Value |
|--------|-------|
| Total Tests | ${results.total} |
| Passed | ${results.passed} |
| Failed | ${results.failed} |
| Pass Rate | ${passRate}% |`;
}

/**
 * Generate category breakdown
 */
function generateCategoryBreakdown(results) {
  const categories = {};
  
  for (const r of results.results) {
    const prefix = r.case.split('_')[0];
    if (!categories[prefix]) {
      categories[prefix] = { passed: 0, failed: 0 };
    }
    if (r.pass) {
      categories[prefix].passed++;
    } else {
      categories[prefix].failed++;
    }
  }
  
  let table = '| Category | Passed | Failed |\n';
  table += '|----------|--------|--------|\n';
  
  for (const [name, data] of Object.entries(categories)) {
    table += `| ${name} | ${data.passed} | ${data.failed} |\n`;
  }
  
  return table;
}

/**
 * Generate failures list
 */
function generateFailuresList(results) {
  const failures = results.results.filter(r => !r.pass);
  
  if (failures.length === 0) {
    return '';
  }
  
  let md = '### Failures\n\n';
  
  for (const f of failures) {
    const severity = getSeverity(f.case);
    const emoji = getSeverityEmoji(severity);
    
    md += `<details>\n`;
    md += `<summary>${emoji} <strong>${f.case}</strong> (${severity})</summary>\n\n`;
    md += `**Reason:** ${f.reason || f.error || 'Unknown failure'}\n\n`;
    
    if (f.expected) {
      md += `**Expected:**\n\`\`\`json\n${JSON.stringify(f.expected, null, 2)}\n\`\`\`\n\n`;
    }
    
    if (f.actual) {
      md += `**Actual:**\n\`\`\`json\n${JSON.stringify(f.actual, null, 2)}\n\`\`\`\n\n`;
    }
    
    md += `</details>\n\n`;
  }
  
  return md;
}

/**
 * Generate full Markdown report
 * @param {Object} results - Audit results object
 * @returns {string} Markdown string
 */
function generateMarkdownReport(results) {
  const timestamp = new Date(results.timestamp).toLocaleString();
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  
  let md = `# F.A.I.L. Kit Audit Report

> **No trace, no ship.**

---

## Summary

${generateSummaryTable(results)}

`;

  // Add a visual pass/fail indicator
  if (results.failed === 0) {
    md += `\n> ✅ **All ${results.total} tests passed!**\n\n`;
  } else {
    md += `\n> ❌ **${results.failed} of ${results.total} tests failed**\n\n`;
  }

  md += `## Results by Category

${generateCategoryBreakdown(results)}

${generateFailuresList(results)}

---

<sub>Generated on ${timestamp} | Endpoint: \`${results.endpoint || 'N/A'}\`</sub>
`;

  return md;
}

/**
 * Generate a compact Markdown report for PR comments
 * @param {Object} results - Audit results object
 * @returns {string} Compact Markdown string
 */
function generateCompactMarkdownReport(results) {
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  const failures = results.results.filter(r => !r.pass);
  
  let md = `## F.A.I.L. Kit Audit Results\n\n`;
  
  // Status badge
  if (results.failed === 0) {
    md += `✅ **Passed** | ${results.passed}/${results.total} tests | ${passRate}% pass rate\n\n`;
  } else {
    md += `❌ **Failed** | ${results.passed}/${results.total} tests | ${passRate}% pass rate\n\n`;
  }
  
  // List failures if any (max 10)
  if (failures.length > 0) {
    md += `### Failed Tests\n\n`;
    
    const displayFailures = failures.slice(0, 10);
    for (const f of displayFailures) {
      const severity = getSeverity(f.case);
      const emoji = getSeverityEmoji(severity);
      md += `- ${emoji} \`${f.case}\` - ${f.reason || f.error || 'Failed'}\n`;
    }
    
    if (failures.length > 10) {
      md += `\n*...and ${failures.length - 10} more failures*\n`;
    }
  }
  
  return md;
}

/**
 * Generate a single-line summary for commit status
 * @param {Object} results - Audit results object
 * @returns {string} Single line summary
 */
function generateOneLiner(results) {
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(0) : 0;
  
  if (results.failed === 0) {
    return `✅ All ${results.total} tests passed (${passRate}%)`;
  }
  
  return `❌ ${results.failed}/${results.total} tests failed (${passRate}% pass rate)`;
}

module.exports = {
  generateMarkdownReport,
  generateCompactMarkdownReport,
  generateOneLiner,
  generateSummaryTable,
  generateCategoryBreakdown,
  generateFailuresList,
  getSeverityEmoji,
  getStatusEmoji
};
