import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Get audit data - either injected by CLI or from window
declare global {
  interface Window {
    __FAIL_KIT_DATA__?: AuditData;
  }
}

export interface TestResult {
  case: string;
  pass: boolean;
  reason?: string;
  error?: string;
  duration_ms: number;
  expected?: Record<string, unknown>;
  actual?: Record<string, unknown>;
  request?: {
    inputs: Record<string, unknown>;
    context?: Record<string, unknown>;
  };
  response?: Record<string, unknown>;
}

export interface AuditData {
  timestamp: string;
  endpoint: string;
  total: number;
  passed: number;
  failed: number;
  duration_ms: number;
  results: TestResult[];
  baseline?: AuditData;
  provenance?: {
    gitHash?: string;
    gitBranch?: string;
    gitDirty?: boolean;
    cliVersion?: string;
  };
}

const auditData: AuditData = window.__FAIL_KIT_DATA__ || {
  timestamp: new Date().toISOString(),
  endpoint: 'http://localhost:3000/api/eval/run',
  total: 0,
  passed: 0,
  failed: 0,
  duration_ms: 0,
  results: [],
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App data={auditData} />
  </React.StrictMode>,
);
