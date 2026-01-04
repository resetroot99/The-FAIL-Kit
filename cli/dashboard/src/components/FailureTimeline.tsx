import { useMemo } from 'react';
import type { TestResult } from '../main';

interface FailureTimelineProps {
  results: TestResult[];
  filteredResults: TestResult[];
  selectedTest: TestResult | null;
  onSelectTest: (test: TestResult | null) => void;
  getSeverity: (test: TestResult) => 'critical' | 'high' | 'medium' | 'low';
}

const CATEGORY_META: Record<string, { name: string; color: string; icon: string }> = {
  CONTRACT: { name: 'Contract', color: '#6366f1', icon: 'C' },
  AGENT: { name: 'Agent', color: '#f97316', icon: 'A' },
  ADV: { name: 'Adversarial', color: '#ef4444', icon: 'X' },
  RAG: { name: 'RAG', color: '#8b5cf6', icon: 'R' },
  SHIFT: { name: 'Distribution', color: '#14b8a6', icon: 'S' },
  GROUND: { name: 'Grounding', color: '#3b82f6', icon: 'G' },
  AUTO: { name: 'Auto-Gen', color: '#10b981', icon: 'Z' },
  CUSTOM: { name: 'Custom', color: '#ec4899', icon: 'U' },
};

export function FailureTimeline({
  results,
  filteredResults,
  selectedTest,
  onSelectTest,
  getSeverity,
}: FailureTimelineProps) {
  // Group results by category
  const categories = useMemo(() => {
    const grouped: Record<string, TestResult[]> = {};
    
    for (const result of results) {
      const prefix = result.case.split('_')[0];
      if (!grouped[prefix]) {
        grouped[prefix] = [];
      }
      grouped[prefix].push(result);
    }
    
    return grouped;
  }, [results]);

  const filteredSet = useMemo(() => new Set(filteredResults), [filteredResults]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Test Execution Timeline</div>
        <div className="text-xs text-forensic-muted font-mono">
          {Object.keys(categories).length} categories · {results.length} tests
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-forensic-border flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500" />
          <span className="text-forensic-muted">Pass</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500" />
          <span className="text-forensic-muted">Fail</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/30 border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          <span className="text-forensic-muted">Critical</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {Object.entries(categories).map(([category, tests]) => {
          const meta = CATEGORY_META[category] || { name: category, color: '#666', icon: '?' };
          const passed = tests.filter(t => t.pass).length;

          return (
            <div
              key={category}
              className="bg-forensic-bg/50 border border-forensic-border rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {meta.icon}
                </div>
                <span className="text-sm font-semibold">{meta.name}</span>
                <span className="text-xs text-forensic-muted font-mono ml-auto">
                  {passed}/{tests.length} passed
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {tests.map((test, idx) => {
                  const severity = getSeverity(test);
                  const isCritical = severity === 'critical';
                  const isFiltered = !filteredSet.has(test);
                  const isSelected = selectedTest?.case === test.case;

                  return (
                    <button
                      key={idx}
                      onClick={() => onSelectTest(isSelected ? null : test)}
                      className={`timeline-dot ${test.pass ? 'pass' : 'fail'} ${
                        isSelected ? 'selected' : ''
                      } ${isCritical ? 'shadow-[0_0_8px_rgba(239,68,68,0.5)] border-2' : ''} ${
                        isFiltered ? 'opacity-30' : ''
                      }`}
                      title={`${test.case}\n${test.pass ? 'PASS' : 'FAIL'} (${test.duration_ms}ms)`}
                    >
                      {test.pass ? '✓' : '✗'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
