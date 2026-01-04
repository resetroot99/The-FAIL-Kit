import type { AuditData } from '../main';

interface ProvenancePanelProps {
  data: AuditData;
}

export function ProvenancePanel({ data }: ProvenancePanelProps) {
  const provenance = data.provenance || {};

  return (
    <details className="card group" open>
      <summary className="card-header cursor-pointer list-none">
        <span className="card-title">Run Context & Provenance</span>
        <svg
          className="w-4 h-4 text-forensic-muted transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-forensic-bg rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-forensic-muted mb-1">
            Git Commit
          </div>
          <div className="font-mono text-sm">
            {provenance.gitHash || 'unknown'}
            {provenance.gitDirty && (
              <span className="text-amber-400 ml-1">(dirty)</span>
            )}
          </div>
        </div>

        <div className="p-3 bg-forensic-bg rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-forensic-muted mb-1">
            Git Branch
          </div>
          <div className="font-mono text-sm">
            {provenance.gitBranch || 'unknown'}
          </div>
        </div>

        <div className="p-3 bg-forensic-bg rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-forensic-muted mb-1">
            CLI Version
          </div>
          <div className="font-mono text-sm">
            v{provenance.cliVersion || '0.0.0'}
          </div>
        </div>

        <div className="p-3 bg-forensic-bg rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-forensic-muted mb-1">
            Timestamp
          </div>
          <div className="font-mono text-sm">
            {new Date(data.timestamp).toLocaleString()}
          </div>
        </div>

        <div className="p-3 bg-forensic-bg rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-forensic-muted mb-1">
            Endpoint
          </div>
          <div className="font-mono text-sm truncate" title={data.endpoint}>
            {data.endpoint}
          </div>
        </div>

        <div className="p-3 bg-forensic-bg rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-forensic-muted mb-1">
            Total Tests
          </div>
          <div className="font-mono text-sm">
            {data.total}
          </div>
        </div>

        <div className="p-3 bg-forensic-bg rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-forensic-muted mb-1">
            Duration
          </div>
          <div className="font-mono text-sm">
            {(data.duration_ms / 1000).toFixed(2)}s
          </div>
        </div>

        <div className="p-3 bg-forensic-bg rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-forensic-muted mb-1">
            Receipt Chain
          </div>
          <div className="font-mono text-sm">
            {data.results.filter(r => 
              r.case.includes('receipt') || r.case.includes('CONTRACT_0003')
            ).every(r => r.pass) ? (
              <span className="text-green-400">VERIFIED</span>
            ) : (
              <span className="text-red-400">INCOMPLETE</span>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
