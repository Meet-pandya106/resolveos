import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { APIClient } from '../../lib/api.js';
import { Case, CaseStatus, CaseSeverity } from '@resolveos/shared';
import {
  PlusCircle,
  Filter,
  Search,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

export const CaseListView: React.FC = () => {
  const { activeWorkspaceId } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Case Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState<CaseSeverity>('MEDIUM');
  const [newIncidentMode, setNewIncidentMode] = useState(searchParams.get('incident') === 'true');

  const loadCases = () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    APIClient.get<Case[]>(`/workspaces/${activeWorkspaceId}/cases`)
      .then(data => setCases(data || []))
      .catch(err => console.error('Failed to load cases:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCases();
  }, [activeWorkspaceId]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !activeWorkspaceId) return;

    try {
      const res = await APIClient.post(`/workspaces/${activeWorkspaceId}/cases`, {
        title: newTitle,
        description: newDescription,
        severity: newSeverity,
        priority: newSeverity === 'CRITICAL' ? 'URGENT' : 'MEDIUM',
        incidentMode: newIncidentMode,
        problemStatement: {
          title: newTitle,
          statement: newDescription || newTitle,
          severity: newSeverity
        }
      });

      addToast({ type: 'success', message: 'Case initialized successfully.' });
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      navigate(`/cases/${res.id}`);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to create case.' });
    }
  };

  const incidentOnly = searchParams.get('incident') === 'true';

  const filteredCases = cases.filter(c => {
    if (incidentOnly && !c.incidentMode) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {incidentOnly ? '🚨 Incident Command Center' : 'Problem Resolution Cases'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {incidentOnly
              ? 'High-priority incident containment, rapid root cause identification, and verification.'
              : 'Structured end-to-end problem resolution workflows.'}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Case</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl glass-panel border border-border/80">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-background/80 border border-border font-mono">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter cases by title, keyword, or failure summary..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Filter by case status"
          className="px-3.5 py-2 rounded-xl bg-background/80 border border-border text-xs font-mono text-foreground outline-none cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="MITIGATION">Mitigation</option>
          <option value="VERIFYING">Verifying</option>
          <option value="RESOLVED">Resolved</option>
          <option value="BLOCKED">Blocked</option>
        </select>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-muted-foreground animate-pulse">
          Querying workspace cases...
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="p-12 text-center rounded-2xl glass-panel border border-border/80 space-y-3">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-semibold">No matching cases found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try clearing your filters or search keywords.'
              : 'Create your first structured resolution case to begin.'}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-glow-primary"
          >
            Create New Case
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="p-5 rounded-2xl glass-panel border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-glow-primary flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {c.incidentMode && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        INCIDENT
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                      c.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      c.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {c.severity}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    v{c.version}
                  </span>
                </div>

                <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                  {c.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {c.description || 'No detailed summary provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-mono">
                <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-semibold">
                  {c.status}
                </span>
                <span className="text-muted-foreground">
                  {new Date(c.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Case Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold">Initialize New Problem Case</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Problem Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production API Gateway Latency Surge"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Initial Problem Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the initial observed symptoms, scope of impact, and systems involved..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={e => setNewSeverity(e.target.value as CaseSeverity)}
                    className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none cursor-pointer"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="incident-mode"
                    checked={newIncidentMode}
                    onChange={e => setNewIncidentMode(e.target.checked)}
                    className="rounded border-border text-primary cursor-pointer"
                  />
                  <label htmlFor="incident-mode" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-rose-400" />
                    <span>Incident Mode</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
