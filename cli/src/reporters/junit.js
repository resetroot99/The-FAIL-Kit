/**
 * F.A.I.L. Kit - JUnit XML Report Generator
 * Creates JUnit XML format for CI/CD systems (Jenkins, GitHub Actions, GitLab CI, etc.)
 */

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (typeof str !== 'string') {
    str = String(str || '');
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get test suite name from case ID
 */
function getSuiteName(caseId) {
  const prefix = caseId.split('_')[0];
  const suiteNames = {
    CONTRACT: 'Contract Validation',
    AGENT: 'Agentic Behavior',
    ADV: 'Adversarial Testing',
    RAG: 'RAG Validation',
    SHIFT: 'Distribution Shift',
    GROUND: 'Grounding',
    CUSTOM: 'Custom Cases',
    SCENARIO: 'Scenarios'
  };
  return suiteNames[prefix] || 'General';
}

/**
 * Get class name for a test case (used for grouping in CI reports)
 */
function getClassName(caseId) {
  const prefix = caseId.split('_')[0];
  return `fail_kit.${prefix.toLowerCase()}`;
}

/**
 * Generate JUnit XML report
 * @param {Object} results - Audit results object
 * @returns {string} JUnit XML string
 */
function generateJunitReport(results) {
  const timestamp = new Date(results.timestamp).toISOString();
  const duration = results.duration_ms ? (results.duration_ms / 1000).toFixed(3) : '0';
  
  // Group test cases by suite
  const suites = {};
  
  for (const testCase of results.results) {
    const suiteName = getSuiteName(testCase.case);
    if (!suites[suiteName]) {
      suites[suiteName] = {
        name: suiteName,
        tests: [],
        passed: 0,
        failed: 0,
        errors: 0,
        time: 0
      };
    }
    
    suites[suiteName].tests.push(testCase);
    
    if (testCase.pass) {
      suites[suiteName].passed++;
    } else if (testCase.error) {
      suites[suiteName].errors++;
    } else {
      suites[suiteName].failed++;
    }
    
    if (testCase.duration_ms) {
      suites[suiteName].time += testCase.duration_ms / 1000;
    }
  }
  
  // Generate XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<testsuites name="F.A.I.L. Kit Audit" tests="${results.total}" failures="${results.failed}" errors="0" time="${duration}" timestamp="${timestamp}">\n`;
  
  for (const [suiteName, suite] of Object.entries(suites)) {
    const suiteTime = suite.time.toFixed(3);
    
    xml += `  <testsuite name="${escapeXml(suiteName)}" tests="${suite.tests.length}" failures="${suite.failed}" errors="${suite.errors}" time="${suiteTime}">\n`;
    
    for (const testCase of suite.tests) {
      const className = getClassName(testCase.case);
      const testName = testCase.case;
      const testTime = testCase.duration_ms ? (testCase.duration_ms / 1000).toFixed(3) : '0';
      
      xml += `    <testcase classname="${escapeXml(className)}" name="${escapeXml(testName)}" time="${testTime}">\n`;
      
      if (!testCase.pass) {
        if (testCase.error) {
          // System error (e.g., connection failure)
          xml += `      <error message="${escapeXml(testCase.error)}">\n`;
          xml += `${escapeXml(testCase.error)}\n`;
          if (testCase.stack) {
            xml += `\n${escapeXml(testCase.stack)}`;
          }
          xml += `      </error>\n`;
        } else {
          // Test failure
          const message = testCase.reason || 'Test failed';
          xml += `      <failure message="${escapeXml(message)}">\n`;
          xml += `Case: ${escapeXml(testCase.case)}\n`;
          xml += `Reason: ${escapeXml(message)}\n`;
          
          if (testCase.expected) {
            xml += `\nExpected:\n${escapeXml(JSON.stringify(testCase.expected, null, 2))}\n`;
          }
          if (testCase.actual) {
            xml += `\nActual:\n${escapeXml(JSON.stringify(testCase.actual, null, 2))}\n`;
          }
          xml += `      </failure>\n`;
        }
      }
      
      // Add system-out for additional context
      if (testCase.outputs) {
        xml += `      <system-out><![CDATA[\n`;
        xml += `Outputs:\n${JSON.stringify(testCase.outputs, null, 2)}\n`;
        xml += `]]></system-out>\n`;
      }
      
      xml += `    </testcase>\n`;
    }
    
    xml += `  </testsuite>\n`;
  }
  
  xml += '</testsuites>\n';
  
  return xml;
}

/**
 * Generate a minimal JUnit XML report (for faster parsing in CI)
 * @param {Object} results - Audit results object
 * @returns {string} Minimal JUnit XML string
 */
function generateMinimalJunitReport(results) {
  const timestamp = new Date(results.timestamp).toISOString();
  const duration = results.duration_ms ? (results.duration_ms / 1000).toFixed(3) : '0';
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<testsuites name="F.A.I.L. Kit" tests="${results.total}" failures="${results.failed}" time="${duration}" timestamp="${timestamp}">\n`;
  xml += `  <testsuite name="Audit" tests="${results.total}" failures="${results.failed}" time="${duration}">\n`;
  
  for (const testCase of results.results) {
    const testTime = testCase.duration_ms ? (testCase.duration_ms / 1000).toFixed(3) : '0';
    
    xml += `    <testcase name="${escapeXml(testCase.case)}" time="${testTime}"`;
    
    if (testCase.pass) {
      xml += ' />\n';
    } else {
      xml += '>\n';
      const message = testCase.reason || testCase.error || 'Failed';
      xml += `      <failure message="${escapeXml(message)}" />\n`;
      xml += '    </testcase>\n';
    }
  }
  
  xml += '  </testsuite>\n';
  xml += '</testsuites>\n';
  
  return xml;
}

module.exports = {
  generateJunitReport,
  generateMinimalJunitReport,
  escapeXml,
  getSuiteName,
  getClassName
};
