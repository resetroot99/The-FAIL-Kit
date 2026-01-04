import { useMemo } from 'react';
import type { AuditData } from '../main';

interface DiffViewProps {
  current: AuditData;
  baseline: AuditData;
  onClose: () => void;
}

interface TestDiff {
  case: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  currentPass?: boolean;
  baselinePass?: boolean;
  reason?: string;
}

export function DiffView({ current, baseline, onClose }: DiffViewProps) {
  const diffs = useMemo(() => {
    const result: TestDiff[] = [];
    const baselineMap = new Map(baseline.results.map(r => [r.case, r]));
    const currentMap = new Map(current.results.map(r => [r.case, r]));

    // Find all test cases
    const allCases = new Set([
      ...baseline.results.map(r => r.case),
      ...current.results.map(r => r.case),
    ]);

    for (const caseId of allCases) {
      const baselineTest = baselineMap.get(caseId);
      const currentTest = currentMap.get(caseId);

      if (!baselineTest && currentTest) {
        result.push({
          case: caseId,
          status: 'added',
          currentPass: currentTest.pass,
        });
      } else if (baselineTest && !currentTest) {
        result.push({
          case: caseId,
          status: 'removed',
          baselinePass: baselineTest.pass,
        });
      } else if (baselineTest && currentTest) {
        if (baselineTest.pass !== currentTest.pass) {
          result.push({
            case: caseId,
            status: 'changed',
            currentPass: currentTest.pass,
            baselinePass: baselineTest.pass,
            reason: currentTest.pass
              ? 'Fixed'
              : currentTest.reason || currentTest.error,
          });
        } else {
          result.push({
            case: caseId,
            status: 'unchanged',
            currentPass: currentTest.pass,
          });
        }
      }
    }

    return result.sort((a, b) => {
      const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
      return order[a.status] - order[b.status];
    });
  }, [current, baseline]);

  const summary = useMemo(() => {
    const changed = diffs.filter(d => d.status === 'changed');
    const regressions = changed.filter(d => d.baselinePass && !d.currentPass);
    const fixes = changed.filter(d => !d.baselinePass && d.currentPass);
    const added = diffs.filter(d => d.status === 'added');
    const removed = diffs.filter(d => d.status === 'removed');

    return { regressions, fixes, added, removed, changed };
  }, [diffs]);

  const delta = current.passed - baseline.passed;
  const isImprovement = delta >= 0;

  return (
    <div className="card animate-slide-up">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="text-forensic-muted hover:text-forensic-text"
          >
            ← Back
          </button>
          <span className="card-title">Golden Master Diff</span>
        </div>
      </div>

      <div className="p-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-forensic-bg rounded-lg text-center">
            <div className="text-xs text-forensic-muted mb-1">Delta</div>
            <div
              className={`text-xl font-bold ${
                isImprovement ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {delta >= 0 ? '+' : ''}{delta}
            </div>
          </div>
          <div className="p-3 bg-forensic-bg rounded-lg text-center">
            <div className="text-xs text-forensic-muted mb-1">Regressions</div>
            <div className="text-xl font-bold text-red-400">
              {summary.regressions.length}
            </div>
          </div>
          <div className="p-3 bg-forensic-bg rounded-lg text-center">
            <div className="text-xs text-forensic-muted mb-1">Fixes</div>
            <div className="text-xl font-bold text-green-400">
              {summary.fixes.length}
            </div>
          </div>
          <div className="p-3 bg-forensic-bg rounded-lg text-center">
            <div className="text-xs text-forensic-muted mb-1">New Tests</div>
            <div className="text-xl font-bold text-blue-400">
              {summary.added.length}
            </div>
          </div>
        </div>

        {/* Pass Rate Comparison */}
        <div className="mb-6 p-4 bg-forensic-bg rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-forensic-muted">Baseline</span>
            <span className="text-sm text-forensic-muted">Current</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold font-mono">
              {((baseline.passed / baseline.total) * 100).toFixed(1)}%
            </div>
            <div className="flex-1 h-2 bg-forensic-border rounded-full overflow-hidden flex">
              <div
                className="h-full bg-forensic-muted"
                style={{ width: `${(baseline.passed / baseline.total) * 100}%` }}
              />
            </div>
            <span
              className={`text-xl ${isImprovement ? 'text-green-400' : 'text-red-400'}`}
            >
              →
            </span>
            <div className="flex-1 h-2 bg-forensic-border rounded-full overflow-hidden flex">
              <div
                className={`h-full ${isImprovement ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${(current.passed / current.total) * 100}%` }}
              />
            </div>
            <div className="text-2xl font-bold font-mono">
              {((current.passed / current.total) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Regressions Section */}
        {summary.regressions.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Regressions ({summary.regressions.length})
            </h3>
            <div className="space-y-1">
              {summary.regressions.map(diff => (
                <div
                  key={diff.case}
                  className="p-2 bg-red-500/10 border border-red-500/30 rounded text-sm font-mono"
                >
                  <span className="text-red-400">✗</span> {diff.case}
                  {diff.reason && (
                    <span className="text-forensic-muted ml-2">
                      — {diff.reason.substring(0, 50)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fixes Section */}
        {summary.fixes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Fixes ({summary.fixes.length})
            </h3>
            <div className="space-y-1">
              {summary.fixes.map(diff => (
                <div
                  key={diff.case}
                  className="p-2 bg-green-500/10 border border-green-500/30 rounded text-sm font-mono"
                >
                  <span className="text-green-400">✓</span> {diff.case}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Added Tests */}
        {summary.added.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              New Tests ({summary.added.length})
            </h3>
            <div className="space-y-1">
              {summary.added.slice(0, 5).map(diff => (
                <div
                  key={diff.case}
                  className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-sm font-mono"
                >
                  <span className="text-blue-400">+</span> {diff.case}
                  <span
                    className={`ml-2 ${
                      diff.currentPass ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    ({diff.currentPass ? 'PASS' : 'FAIL'})
                  </span>
                </div>
              ))}
              {summary.added.length > 5 && (
                <div className="text-xs text-forensic-muted">
                  ...and {summary.added.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* All changes summary */}
        {summary.changed.length === 0 && summary.added.length === 0 && summary.removed.length === 0 && (
          <div className="text-center py-8 text-forensic-muted">
            <p>No changes detected from baseline</p>
            <p className="text-sm mt-1">All tests have the same status as the golden master</p>
          </div>
        )}
      </div>
    </div>
  );
}
