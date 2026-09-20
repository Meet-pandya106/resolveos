import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { APIClient } from '../../lib/api.js';
import { Case } from '@resolveos/shared';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Zap,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Activity,
  ShieldAlert
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { activeWorkspaceId } = useAuthStore();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    APIClient.get<Case[]>(`/workspaces/${activeWorkspaceId}/cases`)
      .then(data => setCases(data || []))
      .catch(err => console.error('Failed to load dashboard cases:', err))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const openCases = cases.filter(c => c.status !== 'RESOLVED' && c.status !== 'ARCHIVED');
  const criticalCases = cases.filter(c => c.severity === 'CRITICAL' && c.status !== 'RESOLVED');
  const incidentCases = cases.filter(c => c.incidentMode && c.status !== 'RESOLVED');
  const resolvedThisWeek = cases.filter(c => c.status === 'RESOLVED');
  const verifyingCases = cases.filter(c => c.status === 'VERIFYING');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner & CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resolution Operations Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time structured telemetry across active problem lifecycles.
          </p>
        </div>
        <button
          onClick={() => navigate('/cases/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Case</span>
        </button>
      </div>

      {/* Incident Banner if active */}
      {incidentCases.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-rose-400">
                {incidentCases.length} Active High-Severity Incident{incidentCases.length > 1 ? 's' : ''} in Progress
              </h2>
              <p className="text-xs text-muted-foreground">
                Live collaboration, accelerated actions, and rapid telemetry tracking active.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/cases?incident=true')}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors"
          >
            Open Incident Command
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Open Cases</span>
            <div className="text-2xl font-bold mt-1">{openCases.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Critical Severity</span>
            <div className="text-2xl font-bold mt-1 text-rose-400">{criticalCases.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Awaiting Verification</span>
            <div className="text-2xl font-bold mt-1 text-amber-400">{verifyingCases.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Resolved Cases</span>
            <div className="text-2xl font-bold mt-1 text-emerald-400">{resolvedThisWeek.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recent Cases List */}
      <div className="p-5 rounded-xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Active Case Pipeline</span>
          </h3>
          <button
            onClick={() => navigate('/cases')}
            className="text-xs text-primary hover:underline font-mono flex items-center gap-1"
          >
            <span>View All ({cases.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-mono">
            Loading active cases...
          </div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground font-mono">No cases found in this workspace.</p>
            <button
              onClick={() => navigate('/cases/new')}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Create First Case
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {cases.slice(0, 6).map(c => (
              <div
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {c.incidentMode && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold">
                        INCIDENT
                      </span>
                    )}
                    <span className="font-semibold text-sm">{c.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{c.description || 'No summary provided.'}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${
                    c.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                    c.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {c.severity}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
