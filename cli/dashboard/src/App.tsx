import { useState, useMemo } from 'react';
import type { AuditData, TestResult } from './main';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { ShipDecision } from './components/ShipDecision';
import { MetricsGrid } from './components/MetricsGrid';
import { FailureTimeline } from './components/FailureTimeline';
import { ForensicPanel } from './components/ForensicPanel';
import { TraceExplorer } from './components/TraceExplorer';
import { DiffView } from './components/DiffView';
import { ProvenancePanel } from './components/ProvenancePanel';

interface AppProps {
  data: AuditData;
}

export type ViewMode = 'timeline' | 'trace' | 'diff';
export type FilterType = 'all' | 'pass' | 'fail' | 'critical' | 'high';

export default function App({ data }: AppProps) {
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Compute severity for tests
  const getSeverity = (test: TestResult): 'critical' | 'high' | 'medium' | 'low' => {
    const caseId = test.case;
    if (caseId.includes('CONTRACT_0003') || caseId.includes('CONTRACT_02') || 
        caseId.includes('AGENT_0008') || caseId.includes('AUTO_receipt')) {
      return 'critical';
    }
    if (caseId.includes('REFUSE') || caseId.includes('CONTRACT_0004') || 
        caseId.startsWith('ADV_') || caseId.startsWith('GROUND_')) {
      return 'high';
    }
    if (caseId.startsWith('RAG_') || caseId.startsWith('SHIFT_') || caseId.startsWith('AGENT_')) {
      return 'medium';
    }
    return 'low';
  };

  // Filter and search results
  const filteredResults = useMemo(() => {
    return data.results.filter(test => {
      // Search filter
      if (searchQuery && !test.case.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (filter === 'pass' && !test.pass) return false;
      if (filter === 'fail' && test.pass) return false;
      if (filter === 'critical' && (test.pass || getSeverity(test) !== 'critical')) return false;
      if (filter === 'high' && (test.pass || getSeverity(test) !== 'high')) return false;
      
      return true;
    });
  }, [data.results, filter, searchQuery]);

  // Compute metrics
  const metrics = useMemo(() => {
    const failures = data.results.filter(r => !r.pass);
    const criticalCount = failures.filter(f => getSeverity(f) === 'critical').length;
    const highCount = failures.filter(f => getSeverity(f) === 'high').length;
    
    return {
      passRate: data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : '0',
      criticalCount,
      highCount,
      receiptMissing: failures.filter(f => 
        f.case.includes('CONTRACT_0003') || f.case.includes('receipt')
      ).length,
      policyFailed: failures.filter(f => 
        f.case.includes('REFUSE') || f.case.includes('policy')
      ).length,
    };
  }, [data]);

  // Determine ship decision
  const shipDecision = useMemo(() => {
    if (metrics.criticalCount > 0) {
      return {
        decision: 'BLOCK' as const,
        reason: `${metrics.criticalCount} critical issue(s) found`,
        action: 'Fix critical issues before deploying',
      };
    }
    if (metrics.highCount >= 3 || data.failed >= 5) {
      return {
        decision: 'NEEDS_REVIEW' as const,
        reason: `${metrics.highCount} high-severity issues`,
        action: 'Manual review required before deployment',
      };
    }
    if (parseFloat(metrics.passRate) >= 95) {
      return {
        decision: 'SHIP' as const,
        reason: `${metrics.passRate}% pass rate`,
        action: 'Safe to deploy',
      };
    }
    return {
      decision: 'NEEDS_REVIEW' as const,
      reason: `${metrics.passRate}% pass rate`,
      action: 'Review failures before deployment',
    };
  }, [metrics, data.failed]);

  return (
    <div className="min-h-screen">
      <Header 
        viewMode={viewMode} 
        onViewModeChange={setViewMode}
        data={data}
      />
      
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <StatusBar data={data} passRate={metrics.passRate} />
        
        <ShipDecision {...shipDecision} />
        
        <MetricsGrid 
          metrics={metrics} 
          onFilterChange={setFilter}
          currentFilter={filter}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {viewMode === 'timeline' && (
              <FailureTimeline
                results={data.results}
                filteredResults={filteredResults}
                selectedTest={selectedTest}
                onSelectTest={setSelectedTest}
                getSeverity={getSeverity}
              />
            )}
            
            {viewMode === 'trace' && selectedTest && (
              <TraceExplorer
                test={selectedTest}
                onClose={() => setViewMode('timeline')}
              />
            )}
            
            {viewMode === 'diff' && data.baseline && (
              <DiffView
                current={data}
                baseline={data.baseline}
                onClose={() => setViewMode('timeline')}
              />
            )}
            
            {viewMode === 'diff' && !data.baseline && (
              <div className="card p-8 text-center">
                <p className="text-forensic-muted">No baseline data available for comparison.</p>
                <p className="text-sm text-forensic-muted mt-2">
                  Run <code className="bg-forensic-border px-1 rounded">fail-audit run --baseline</code> to set a baseline.
                </p>
              </div>
            )}
            
            <ProvenancePanel data={data} />
          </div>
          
          {/* Forensic sidebar */}
          <div className="lg:col-span-1">
            <ForensicPanel
              results={filteredResults}
              selectedTest={selectedTest}
              onSelectTest={setSelectedTest}
              onViewTrace={(test) => {
                setSelectedTest(test);
                setViewMode('trace');
              }}
              filter={filter}
              onFilterChange={setFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              getSeverity={getSeverity}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
