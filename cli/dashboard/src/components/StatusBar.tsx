import type { AuditData } from '../main';

interface StatusBarProps {
  data: AuditData;
  passRate: string;
}

export function StatusBar({ data, passRate }: StatusBarProps) {
  const isVerified = parseFloat(passRate) >= 80;
  
  return (
    <div className="card mb-6">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
              isVerified
                ? 'bg-green-500/20 border-green-500 text-green-400'
                : 'bg-red-500/20 border-red-500 text-red-400'
            }`}
          >
            {isVerified ? '✓' : '✗'}
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              STATUS: {isVerified ? 'VERIFIED' : 'FAILED'}
            </h2>
            <p className="text-sm text-forensic-muted">
              {isVerified
                ? 'System integrity confirmed'
                : 'System integrity compromised - review failures'}
            </p>
          </div>
        </div>

        <div className="text-right text-sm font-mono text-forensic-muted">
          <div>
            <span className="text-forensic-text">Date:</span>{' '}
            {new Date(data.timestamp).toLocaleString()}
          </div>
          <div>
            <span className="text-forensic-text">Tests:</span>{' '}
            {data.passed}/{data.total} passed ({passRate}%)
          </div>
          <div>
            <span className="text-forensic-text">Duration:</span>{' '}
            {(data.duration_ms / 1000).toFixed(2)}s
          </div>
          <div>
            <span className="text-forensic-text">Endpoint:</span>{' '}
            {data.endpoint}
          </div>
        </div>
      </div>
    </div>
  );
}
