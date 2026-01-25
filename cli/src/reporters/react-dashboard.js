/**
 * F.A.I.L. Kit React Dashboard Reporter
 *
 * Generates an interactive React-based dashboard.
 * The dashboard is bundled as a single HTML file for easy sharing.
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate the React dashboard HTML with embedded data
 */
function generateReactDashboard(auditResults, options = {}) {
  const { baseline, provenance } = options;

  // Gather provenance if not provided
  const fullProvenance = provenance || gatherProvenance();

  // Build data object
  const data = {
    ...auditResults,
    provenance: fullProvenance,
    baseline: baseline || null,
  };

  // Generate the HTML with embedded data
  return generateEmbeddedHTML(data);
}

/**
 * Gather provenance information
 */
function gatherProvenance() {
  const { execSync } = require('child_process');
  
  const provenance = {
    cliVersion: require('../../package.json').version,
  };

  try {
    provenance.gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch { 
    provenance.gitHash = 'unknown';
  }

  try {
    provenance.gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    provenance.gitBranch = 'unknown';
  }

  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    provenance.gitDirty = status.trim().length > 0;
  } catch {
    provenance.gitDirty = false;
  }

  return provenance;
}

/**
 * Generate HTML with embedded React app and data
 */
function generateEmbeddedHTML(data) {
  // Escape data for embedding in HTML
  const escapedData = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>F.A.I.L. Kit - Evidence Board</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'forensic': {
              'bg': '#ffffff',
              'surface': '#fafafa',
              'border': 'rgba(0, 0, 0, 0.1)',
              'accent': '#3b82f6',
              'success': '#22c55e',
              'warning': '#f59e0b',
              'danger': '#ef4444',
              'critical': '#dc2626',
              'text': '#171717',
              'muted': '#525252',
            },
          },
          fontFamily: {
            'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
            'sans': ['Inter', 'system-ui', 'sans-serif'],
          },
        },
      },
    }
  </script>
  <style>
    body { background: #ffffff; color: #171717; font-family: 'Inter', system-ui, sans-serif; }
    .card { background: #fafafa; border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 0.5rem; }
    .card-header { padding: 0.75rem 1rem; border-bottom: 1px solid rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: space-between; }
    .card-title { font-size: 0.625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #525252; }
    .metric-card { text-align: center; padding: 1rem; cursor: pointer; transition: all 0.2s; }
    .metric-card:hover { border-color: #3b82f6; }
    .metric-value { font-size: 1.875rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: #3b82f6; }
    .metric-label { font-size: 0.625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #525252; margin-bottom: 0.5rem; }
    .badge { display: inline-flex; align-items: center; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge-danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .timeline-dot { width: 1.5rem; height: 1.5rem; border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
    .timeline-dot.pass { background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; color: #4ade80; }
    .timeline-dot.fail { background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #f87171; }
    .timeline-dot:hover { transform: scale(1.1); }
    .btn { padding: 0.375rem 0.75rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-ghost { color: #525252; }
    .btn-ghost:hover { color: #171717; background: rgba(0, 0, 0, 0.05); }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.2); }
  </style>
</head>
<body>
  <script>
    window.__FAIL_KIT_DATA__ = ${escapedData};
  </script>
  
  <div id="app"></div>
  
  <script type="module">
    // Minimal React-like implementation for embedding
    const h = (tag, props, ...children) => {
      if (typeof tag === 'function') return tag({ ...props, children: children.flat() });
      const el = document.createElement(tag);
      if (props) {
        Object.entries(props).forEach(([k, v]) => {
          if (k === 'className') el.className = v;
          else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
          else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
          else if (k === 'dangerouslySetInnerHTML') el.innerHTML = v.__html;
          else el.setAttribute(k, v);
        });
      }
      children.flat().forEach(c => {
        if (c == null) return;
        el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
      return el;
    };

    const data = window.__FAIL_KIT_DATA__;
    const passRate = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : '0';
    
    // Severity calculation
    const getSeverity = (test) => {
      if (test.case.includes('CONTRACT_0003') || test.case.includes('CONTRACT_02') || 
          test.case.includes('AGENT_0008') || test.case.includes('AUTO_receipt')) {
        return 'critical';
      }
      if (test.case.includes('REFUSE') || test.case.includes('CONTRACT_0004') || 
          test.case.startsWith('ADV_') || test.case.startsWith('GROUND_')) {
        return 'high';
      }
      return 'medium';
    };

    // Metrics
    const failures = data.results.filter(r => !r.pass);
    const criticalCount = failures.filter(f => getSeverity(f) === 'critical').length;
    const highCount = failures.filter(f => getSeverity(f) === 'high').length;

    // Ship decision
    let decision, decisionColor, decisionIcon;
    if (criticalCount > 0) {
      decision = 'BLOCK';
      decisionColor = 'red';
      decisionIcon = '🚫';
    } else if (highCount >= 3 || data.failed >= 5) {
      decision = 'NEEDS REVIEW';
      decisionColor = 'amber';
      decisionIcon = '⚠️';
    } else if (parseFloat(passRate) >= 95) {
      decision = 'SHIP';
      decisionColor = 'green';
      decisionIcon = '✅';
    } else {
      decision = 'NEEDS REVIEW';
      decisionColor = 'amber';
      decisionIcon = '⚠️';
    }

    // Group by category
    const categories = {};
    data.results.forEach(r => {
      const prefix = r.case.split('_')[0];
      if (!categories[prefix]) categories[prefix] = [];
      categories[prefix].push(r);
    });

    // Render
    const app = document.getElementById('app');
    
    // Header
    app.appendChild(h('header', { className: 'bg-forensic-surface border-b border-forensic-border sticky top-0 z-50' },
      h('div', { className: 'max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between' },
        h('div', { className: 'flex items-center gap-3' },
          h('div', { className: 'w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white' }, 'F'),
          h('div', {},
            h('h1', { className: 'text-lg font-bold' }, 'F.A.I.L. Kit Evidence Board'),
            h('p', { className: 'text-xs text-forensic-muted' }, 'Forensic Analysis of Intelligent Logic')
          )
        ),
        h('div', { className: 'flex items-center gap-2' },
          h('button', { 
            className: 'btn btn-ghost',
            onClick: () => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'fail-audit-' + new Date().toISOString().split('T')[0] + '.json';
              a.click();
            }
          }, 'Export JSON'),
          h('button', { className: 'btn btn-ghost', onClick: () => window.print() }, 'Print')
        )
      )
    ));

    // Main content
    const main = h('main', { className: 'max-w-[1600px] mx-auto px-4 py-6' });
    app.appendChild(main);

    // Status bar
    const statusColor = parseFloat(passRate) >= 80 ? 'green' : 'red';
    main.appendChild(h('div', { className: 'card mb-6' },
      h('div', { className: 'p-4 flex items-center justify-between' },
        h('div', { className: 'flex items-center gap-4' },
          h('div', { 
            className: 'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 ' +
              (statusColor === 'green' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400')
          }, statusColor === 'green' ? '✓' : '✗'),
          h('div', {},
            h('h2', { className: 'text-lg font-semibold' }, 'STATUS: ' + (statusColor === 'green' ? 'VERIFIED' : 'FAILED')),
            h('p', { className: 'text-sm text-forensic-muted' }, statusColor === 'green' ? 'System integrity confirmed' : 'System integrity compromised')
          )
        ),
        h('div', { className: 'text-right text-sm font-mono text-forensic-muted' },
          h('div', {}, 'Date: ' + new Date(data.timestamp).toLocaleString()),
          h('div', {}, 'Tests: ' + data.passed + '/' + data.total + ' passed (' + passRate + '%)'),
          h('div', {}, 'Duration: ' + (data.duration_ms / 1000).toFixed(2) + 's')
        )
      )
    ));

    // Ship decision
    const decisionBg = decisionColor === 'green' ? 'bg-green-500/10 border-green-500' :
                       decisionColor === 'red' ? 'bg-red-500/10 border-red-500' : 'bg-amber-500/10 border-amber-500';
    main.appendChild(h('div', { className: 'card ' + decisionBg + ' border mb-6' },
      h('div', { className: 'p-4' },
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('span', { className: 'text-xs font-semibold uppercase tracking-wider text-forensic-muted' }, 'Ship Decision'),
          h('span', { className: 'badge badge-' + (decisionColor === 'green' ? 'success' : decisionColor === 'red' ? 'danger' : 'warning') }, 
            decisionIcon + ' ' + decision
          )
        ),
        h('p', { className: 'text-sm' }, 
          decision === 'BLOCK' ? criticalCount + ' critical issue(s) found - fix before deploying' :
          decision === 'SHIP' ? 'All critical checks passed - safe to deploy' :
          'Review ' + (highCount + failures.length) + ' issue(s) before deployment'
        )
      )
    ));

    // Metrics grid
    main.appendChild(h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-4 mb-6' },
      h('div', { className: 'card metric-card' },
        h('div', { className: 'metric-label' }, 'Pass Rate'),
        h('div', { className: 'metric-value' }, passRate + '%')
      ),
      h('div', { className: 'card metric-card' },
        h('div', { className: 'metric-label' }, 'Critical'),
        h('div', { className: 'metric-value', style: { color: '#ef4444' } }, String(criticalCount))
      ),
      h('div', { className: 'card metric-card' },
        h('div', { className: 'metric-label' }, 'High Severity'),
        h('div', { className: 'metric-value', style: { color: '#f59e0b' } }, String(highCount))
      ),
      h('div', { className: 'card metric-card' },
        h('div', { className: 'metric-label' }, 'Passed'),
        h('div', { className: 'metric-value', style: { color: '#22c55e' } }, String(data.passed))
      ),
      h('div', { className: 'card metric-card' },
        h('div', { className: 'metric-label' }, 'Failed'),
        h('div', { className: 'metric-value', style: { color: '#ef4444' } }, String(data.failed))
      )
    ));

    // Timeline
    const timelineCard = h('div', { className: 'card' },
      h('div', { className: 'card-header' },
        h('span', { className: 'card-title' }, 'Test Execution Timeline'),
        h('span', { className: 'text-xs text-forensic-muted font-mono' }, Object.keys(categories).length + ' categories · ' + data.total + ' tests')
      )
    );
    
    const timelineContent = h('div', { className: 'p-4 space-y-4' });
    
    const categoryMeta = {
      CONTRACT: { name: 'Contract', color: '#6366f1', icon: 'C' },
      AGENT: { name: 'Agent', color: '#f97316', icon: 'A' },
      ADV: { name: 'Adversarial', color: '#ef4444', icon: 'X' },
      RAG: { name: 'RAG', color: '#8b5cf6', icon: 'R' },
      SHIFT: { name: 'Distribution', color: '#14b8a6', icon: 'S' },
      GROUND: { name: 'Grounding', color: '#3b82f6', icon: 'G' },
      AUTO: { name: 'Auto-Gen', color: '#10b981', icon: 'Z' },
    };

    Object.entries(categories).forEach(([cat, tests]) => {
      const meta = categoryMeta[cat] || { name: cat, color: '#666', icon: '?' };
      const passed = tests.filter(t => t.pass).length;
      
      const catDiv = h('div', { className: 'bg-forensic-bg/50 border border-forensic-border rounded-lg p-3' },
        h('div', { className: 'flex items-center gap-2 mb-3' },
          h('div', { 
            className: 'w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white',
            style: { backgroundColor: meta.color }
          }, meta.icon),
          h('span', { className: 'text-sm font-semibold' }, meta.name),
          h('span', { className: 'text-xs text-forensic-muted font-mono ml-auto' }, passed + '/' + tests.length + ' passed')
        ),
        h('div', { className: 'flex flex-wrap gap-1' },
          ...tests.map(test => {
            const severity = getSeverity(test);
            const isCritical = severity === 'critical';
            return h('button', { 
              className: 'timeline-dot ' + (test.pass ? 'pass' : 'fail') + (isCritical ? ' shadow-lg border-2' : ''),
              title: test.case + '\\n' + (test.pass ? 'PASS' : 'FAIL') + ' (' + test.duration_ms + 'ms)',
              onClick: () => {
                const details = document.getElementById('selected-test');
                if (details) {
                  details.innerHTML = '<h3 class="font-bold mb-2">' + test.case + '</h3>' +
                    '<p class="text-sm ' + (test.pass ? 'text-green-400' : 'text-red-400') + '">' + (test.pass ? 'PASS' : 'FAIL') + '</p>' +
                    '<p class="text-xs text-forensic-muted">Duration: ' + test.duration_ms + 'ms</p>' +
                    (!test.pass && (test.reason || test.error) ? '<p class="text-xs text-red-400 mt-2 bg-red-500/10 p-2 rounded">' + (test.reason || test.error) + '</p>' : '') +
                    (test.expected ? '<details class="mt-2"><summary class="text-xs text-blue-400 cursor-pointer">Show details</summary><pre class="text-xs mt-2 bg-black p-2 rounded overflow-x-auto">' + JSON.stringify({ expected: test.expected, actual: test.actual }, null, 2) + '</pre></details>' : '');
                }
              }
            }, test.pass ? '✓' : '✗');
          })
        )
      );
      
      timelineContent.appendChild(catDiv);
    });
    
    timelineCard.appendChild(timelineContent);
    
    // Layout
    const grid = h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
      h('div', { className: 'lg:col-span-2' }, timelineCard),
      h('div', { className: 'lg:col-span-1' },
        h('div', { className: 'card sticky top-20' },
          h('div', { className: 'card-header' },
            h('span', { className: 'card-title' }, 'Selected Test')
          ),
          h('div', { id: 'selected-test', className: 'p-4 text-sm text-forensic-muted' }, 'Click a test to view details')
        )
      )
    );
    
    main.appendChild(grid);

    // Provenance
    if (data.provenance) {
      const prov = data.provenance;
      main.appendChild(h('div', { className: 'card mt-6' },
        h('div', { className: 'card-header' },
          h('span', { className: 'card-title' }, 'Run Context & Provenance')
        ),
        h('div', { className: 'p-4 grid grid-cols-2 md:grid-cols-4 gap-3' },
          h('div', { className: 'p-3 bg-forensic-bg rounded-lg' },
            h('div', { className: 'text-xs uppercase tracking-wider text-forensic-muted mb-1' }, 'Git Commit'),
            h('div', { className: 'font-mono text-sm' }, prov.gitHash || 'unknown', prov.gitDirty ? h('span', { className: 'text-amber-400 ml-1' }, '(dirty)') : null)
          ),
          h('div', { className: 'p-3 bg-forensic-bg rounded-lg' },
            h('div', { className: 'text-xs uppercase tracking-wider text-forensic-muted mb-1' }, 'Branch'),
            h('div', { className: 'font-mono text-sm' }, prov.gitBranch || 'unknown')
          ),
          h('div', { className: 'p-3 bg-forensic-bg rounded-lg' },
            h('div', { className: 'text-xs uppercase tracking-wider text-forensic-muted mb-1' }, 'CLI Version'),
            h('div', { className: 'font-mono text-sm' }, 'v' + (prov.cliVersion || '0.0.0'))
          ),
          h('div', { className: 'p-3 bg-forensic-bg rounded-lg' },
            h('div', { className: 'text-xs uppercase tracking-wider text-forensic-muted mb-1' }, 'Endpoint'),
            h('div', { className: 'font-mono text-sm truncate', title: data.endpoint }, data.endpoint)
          )
        )
      ));
    }

    // Footer
    main.appendChild(h('footer', { className: 'text-center text-xs text-forensic-muted mt-8 py-4 border-t border-forensic-border' },
      'Generated by F.A.I.L. Kit v' + (data.provenance?.cliVersion || '1.0.0') + ' • ',
      h('a', { href: 'https://github.com/resetroot99/The-FAIL-Kit', target: '_blank', className: 'text-blue-400 hover:underline' }, 'GitHub')
    ));
  <\/script>
</body>
</html>`;
}

/**
 * Load baseline data from file if available
 */
function loadBaseline(baselinePath) {
  try {
    if (fs.existsSync(baselinePath)) {
      return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    }
  } catch {
    // Ignore errors
  }
  return null;
}

module.exports = {
  generateReactDashboard,
  gatherProvenance,
  loadBaseline,
};
