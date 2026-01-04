interface ShipDecisionProps {
  decision: 'BLOCK' | 'NEEDS_REVIEW' | 'SHIP';
  reason: string;
  action: string;
}

export function ShipDecision({ decision, reason, action }: ShipDecisionProps) {
  const config = {
    BLOCK: {
      bg: 'bg-red-500/10',
      border: 'border-red-500',
      text: 'text-red-400',
      icon: '🚫',
    },
    NEEDS_REVIEW: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500',
      text: 'text-amber-400',
      icon: '⚠️',
    },
    SHIP: {
      bg: 'bg-green-500/10',
      border: 'border-green-500',
      text: 'text-green-400',
      icon: '✅',
    },
  };

  const { bg, border, text, icon } = config[decision];

  return (
    <div className={`card ${bg} border ${border} mb-6`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-forensic-muted">
            Ship Decision
          </span>
          <span
            className={`badge ${bg} ${text} border ${border}`}
          >
            {icon} {decision.replace('_', ' ')}
          </span>
        </div>
        
        <p className="text-sm text-forensic-text mb-2">
          <strong>Reason:</strong> {reason}
        </p>
        
        <div className={`p-3 rounded ${bg} border-l-4 ${border}`}>
          <p className="text-sm font-medium">
            <strong>Next Action:</strong> {action}
          </p>
        </div>
      </div>
    </div>
  );
}
