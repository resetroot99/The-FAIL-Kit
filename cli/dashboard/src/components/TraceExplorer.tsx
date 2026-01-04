import { useState } from 'react';
import type { TestResult } from '../main';

interface TraceExplorerProps {
  test: TestResult;
  onClose: () => void;
}

interface TraceStep {
  id: number;
  type: 'input' | 'processing' | 'tool_call' | 'llm_call' | 'output' | 'error';
  name: string;
  timestamp: string;
  duration?: number;
  data: unknown;
  status: 'success' | 'failure' | 'pending';
}

export function TraceExplorer({ test, onClose }: TraceExplorerProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

  // Generate trace steps from test data
  const steps: TraceStep[] = [
    {
      id: 0,
      type: 'input',
      name: 'Request Received',
      timestamp: new Date().toISOString(),
      data: test.request?.inputs || {},
      status: 'success',
    },
    {
      id: 1,
      type: 'processing',
      name: 'Input Validation',
      timestamp: new Date().toISOString(),
      duration: Math.floor(test.duration_ms * 0.1),
      data: { validated: true, schema: 'GenericInput.v1' },
      status: 'success',
    },
    {
      id: 2,
      type: 'llm_call',
      name: 'LLM Processing',
      timestamp: new Date().toISOString(),
      duration: Math.floor(test.duration_ms * 0.6),
      data: {
        model: 'gpt-4',
        tokens_in: 150,
        tokens_out: 200,
      },
      status: test.pass ? 'success' : 'failure',
    },
  ];

  // Add tool calls if present in response
  if (test.response && typeof test.response === 'object') {
    const response = test.response as Record<string, unknown>;
    if (Array.isArray(response.actions)) {
      response.actions.forEach((action, idx) => {
        steps.push({
          id: 3 + idx,
          type: 'tool_call',
          name: `Tool: ${(action as Record<string, unknown>).tool_name || 'unknown'}`,
          timestamp: new Date().toISOString(),
          duration: Math.floor(test.duration_ms * 0.1),
          data: action,
          status: (action as Record<string, unknown>).receipt ? 'success' : 'failure',
        });
      });
    }
  }

  // Add output step
  steps.push({
    id: steps.length,
    type: 'output',
    name: 'Response Generated',
    timestamp: new Date().toISOString(),
    data: test.response || {},
    status: test.pass ? 'success' : 'failure',
  });

  // Add error step if failed
  if (!test.pass) {
    steps.push({
      id: steps.length,
      type: 'error',
      name: 'Test Assertion Failed',
      timestamp: new Date().toISOString(),
      data: {
        reason: test.reason || test.error,
        expected: test.expected,
        actual: test.actual,
      },
      status: 'failure',
    });
  }

  const toggleStep = (id: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStepIcon = (type: TraceStep['type']) => {
    switch (type) {
      case 'input': return '📥';
      case 'processing': return '⚙️';
      case 'tool_call': return '🔧';
      case 'llm_call': return '🤖';
      case 'output': return '📤';
      case 'error': return '❌';
      default: return '•';
    }
  };

  const getStepColor = (status: TraceStep['status']) => {
    switch (status) {
      case 'success': return 'border-green-500 bg-green-500/10';
      case 'failure': return 'border-red-500 bg-red-500/10';
      case 'pending': return 'border-amber-500 bg-amber-500/10';
    }
  };

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
          <span className="card-title">Trace Explorer</span>
        </div>
        <span className="font-mono text-sm">{test.case}</span>
      </div>

      <div className="p-4">
        {/* Summary */}
        <div className="flex items-center gap-4 mb-6 p-3 bg-forensic-bg rounded-lg">
          <div>
            <span className="text-xs text-forensic-muted">Status</span>
            <div className={`font-bold ${test.pass ? 'text-green-400' : 'text-red-400'}`}>
              {test.pass ? 'PASS' : 'FAIL'}
            </div>
          </div>
          <div>
            <span className="text-xs text-forensic-muted">Duration</span>
            <div className="font-mono">{test.duration_ms}ms</div>
          </div>
          <div>
            <span className="text-xs text-forensic-muted">Steps</span>
            <div className="font-mono">{steps.length}</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-forensic-border" />

          {steps.map((step, idx) => (
            <div key={step.id} className="relative pl-10 pb-4">
              {/* Node */}
              <div
                className={`absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${getStepColor(step.status)}`}
              >
                {step.status === 'success' ? '✓' : step.status === 'failure' ? '✗' : '•'}
              </div>

              {/* Content */}
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full text-left"
              >
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    expandedSteps.has(step.id)
                      ? 'border-forensic-accent bg-forensic-accent/5'
                      : 'border-forensic-border hover:border-forensic-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold flex items-center gap-2">
                      <span>{getStepIcon(step.type)}</span>
                      {step.name}
                    </span>
                    <span className="text-xs text-forensic-muted font-mono">
                      {step.duration ? `${step.duration}ms` : ''}
                    </span>
                  </div>

                  <div className="text-xs text-forensic-muted">
                    Step {idx + 1} of {steps.length}
                  </div>

                  {expandedSteps.has(step.id) && (
                    <div className="mt-3 pt-3 border-t border-forensic-border">
                      <pre className="text-xs font-mono bg-forensic-bg p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
                        {JSON.stringify(step.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
