import type { FilterType } from '../App';

interface Metrics {
  passRate: string;
  criticalCount: number;
  highCount: number;
  receiptMissing: number;
  policyFailed: number;
}

interface MetricsGridProps {
  metrics: Metrics;
  onFilterChange: (filter: FilterType) => void;
  currentFilter: FilterType;
}

export function MetricsGrid({ metrics, onFilterChange, currentFilter }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <button
        onClick={() => onFilterChange('all')}
        className={`metric-card ${currentFilter === 'all' ? 'border-forensic-accent' : ''}`}
      >
        <div className="metric-label">Pass Rate</div>
        <div className="metric-value">{metrics.passRate}%</div>
      </button>

      <button
        onClick={() => onFilterChange('critical')}
        className={`metric-card ${currentFilter === 'critical' ? 'border-red-500' : ''}`}
      >
        <div className="metric-label">Critical</div>
        <div className="metric-value text-red-400">{metrics.criticalCount}</div>
        <div className="text-[10px] text-forensic-muted mt-1">Blocks ship</div>
      </button>

      <button
        onClick={() => onFilterChange('high')}
        className={`metric-card ${currentFilter === 'high' ? 'border-amber-500' : ''}`}
      >
        <div className="metric-label">High Severity</div>
        <div className="metric-value text-amber-400">{metrics.highCount}</div>
        <div className="text-[10px] text-forensic-muted mt-1">Needs review</div>
      </button>

      <div className="metric-card cursor-default">
        <div className="metric-label">Receipt Missing</div>
        <div className="metric-value text-red-400">{metrics.receiptMissing}</div>
        <div className="text-[10px] text-forensic-muted mt-1">No proof</div>
      </div>

      <div className="metric-card cursor-default">
        <div className="metric-label">Policy Failed</div>
        <div className="metric-value text-amber-400">{metrics.policyFailed}</div>
        <div className="text-[10px] text-forensic-muted mt-1">Gates not enforced</div>
      </div>
    </div>
  );
}
