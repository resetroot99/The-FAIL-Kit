import type { TestResult } from '../main';
import type { FilterType } from '../App';

interface ForensicPanelProps {
  results: TestResult[];
  selectedTest: TestResult | null;
  onSelectTest: (test: TestResult | null) => void;
  onViewTrace: (test: TestResult) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  getSeverity: (test: TestResult) => 'critical' | 'high' | 'medium' | 'low';
}

const SEVERITY_STYLES = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function ForensicPanel({
  results,
  selectedTest,
  onSelectTest,
  onViewTrace,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  getSeverity,
}: ForensicPanelProps) {
  const totalCount = results.length;
  const failCount = results.filter(r => !r.pass).length;
  const passCount = results.filter(r => r.pass).length;

  return (
    <div className="card sticky top-20 max-h-[calc(100vh-6rem)] flex flex-col">
      <div className="card-header flex-shrink-0">
        <div className="card-title">Forensic Details</div>
        <div className="text-xs text-forensic-muted">{results.length} events</div>
      </div>

      {/* Search and Filters */}
      <div className="p-3 border-b border-forensic-border bg-forensic-bg/50 flex-shrink-0">
        <input
          type="text"
          placeholder="Search tests..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-forensic-border border border-forensic-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-forensic-accent"
        />
        
        <div className="flex flex-wrap gap-1 mt-2">
          {(['all', 'fail', 'pass', 'critical', 'high'] as FilterType[]).map((f) => {
            const counts = {
              all: totalCount,
              fail: failCount,
              pass: passCount,
              critical: results.filter(r => !r.pass && getSeverity(r) === 'critical').length,
              high: results.filter(r => !r.pass && getSeverity(r) === 'high').length,
            };
            
            return (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide border transition-all ${
                  filter === f
                    ? 'bg-forensic-accent/20 border-forensic-accent text-forensic-accent'
                    : 'border-forensic-border text-forensic-muted hover:text-forensic-text'
                }`}
              >
                {f} ({counts[f]})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-2">
        {results.map((test, idx) => {
          const severity = getSeverity(test);
          const isSelected = selectedTest?.case === test.case;

          return (
            <button
              key={idx}
              onClick={() => onSelectTest(isSelected ? null : test)}
              className={`w-full text-left p-3 rounded-lg mb-1 border-l-2 transition-all ${
                isSelected
                  ? 'bg-forensic-accent/10 border-l-forensic-accent'
                  : test.pass
                  ? 'hover:bg-forensic-border border-l-transparent'
                  : 'hover:bg-forensic-border border-l-red-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-forensic-muted font-mono">
                  {new Date(Date.now() - (results.length - idx) * 100).toLocaleTimeString()}
                </span>
                {!test.pass && (
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${SEVERITY_STYLES[severity]}`}
                  >
                    {severity}
                  </span>
                )}
              </div>

              <div className="font-mono text-xs font-semibold mb-1 flex items-center gap-2">
                {test.case}
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(test.case);
                    }}
                    className="text-forensic-muted hover:text-forensic-accent"
                    title="Copy test ID"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="text-[10px] text-forensic-muted mb-2">
                {test.pass ? 'PASS ✓' : 'FAIL ✗'} · {test.duration_ms}ms
              </div>

              {!test.pass && (test.reason || test.error) && (
                <div className="text-[11px] text-red-400 bg-red-500/10 rounded px-2 py-1 mb-2">
                  {(test.reason || test.error || '').substring(0, 100)}
                  {(test.reason || test.error || '').length > 100 ? '...' : ''}
                </div>
              )}

              {isSelected && (
                <div className="mt-2 pt-2 border-t border-forensic-border">
                  {test.expected && test.actual && (
                    <details className="text-xs mb-2">
                      <summary className="cursor-pointer text-forensic-accent hover:underline">
                        Show expected vs actual
                      </summary>
                      <div className="mt-2 bg-forensic-bg rounded p-2 font-mono text-[10px] overflow-x-auto">
                        <div className="text-green-400 mb-1">
                          <strong>Expected:</strong>
                          <pre>{JSON.stringify(test.expected, null, 2)}</pre>
                        </div>
                        <div className="text-red-400">
                          <strong>Actual:</strong>
                          <pre>{JSON.stringify(test.actual, null, 2)}</pre>
                        </div>
                      </div>
                    </details>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTrace(test);
                    }}
                    className="text-xs text-forensic-accent hover:underline"
                  >
                    → View Trace Explorer
                  </button>
                </div>
              )}
            </button>
          );
        })}

        {results.length === 0 && (
          <div className="text-center py-8 text-forensic-muted">
            No tests match the current filter
          </div>
        )}
      </div>
    </div>
  );
}
