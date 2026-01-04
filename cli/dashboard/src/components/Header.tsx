import type { AuditData } from '../main';
import type { ViewMode } from '../App';

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  data: AuditData;
}

export function Header({ viewMode, onViewModeChange, data }: HeaderProps) {
  const handleExport = (format: 'json' | 'csv' | 'html') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = `fail-audit-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const headers = ['Case', 'Status', 'Duration (ms)', 'Reason'];
      const rows = data.results.map(r => [
        r.case,
        r.pass ? 'PASS' : 'FAIL',
        r.duration_ms.toString(),
        (r.reason || r.error || '').replace(/,/g, ';'),
      ]);
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      filename = `fail-audit-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    } else {
      content = document.documentElement.outerHTML;
      filename = `fail-audit-${new Date().toISOString().split('T')[0]}.html`;
      mimeType = 'text/html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <header className="bg-forensic-surface border-b border-forensic-border sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-forensic-accent rounded-lg flex items-center justify-center font-bold text-white">
              F
            </div>
            <div>
              <h1 className="text-lg font-bold">F.A.I.L. Kit Evidence Board</h1>
              <p className="text-xs text-forensic-muted">Forensic Analysis of Intelligent Logic</p>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-forensic-border rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('timeline')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-forensic-accent text-white'
                  : 'text-forensic-muted hover:text-forensic-text'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => onViewModeChange('trace')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                viewMode === 'trace'
                  ? 'bg-forensic-accent text-white'
                  : 'text-forensic-muted hover:text-forensic-text'
              }`}
            >
              Trace
            </button>
            <button
              onClick={() => onViewModeChange('diff')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                viewMode === 'diff'
                  ? 'bg-forensic-accent text-white'
                  : 'text-forensic-muted hover:text-forensic-text'
              }`}
            >
              Diff
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button className="btn btn-ghost flex items-center gap-1">
                Export
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-forensic-surface border border-forensic-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-forensic-border rounded-t-lg"
                >
                  JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-forensic-border"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport('html')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-forensic-border rounded-b-lg"
                >
                  HTML
                </button>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="btn btn-ghost"
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
