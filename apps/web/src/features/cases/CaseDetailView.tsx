import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { APIClient } from '../../lib/api.js';
import {
  Case,
  CaseStatus,
  CaseSeverity,
  ProblemStatement,
  CaseEvidence,
  CaseQuestion,
  Hypothesis,
  RootCause,
  Solution,
  Decision,
  CaseAction,
  Verification,
  Retrospective,
  CaseActivity
} from '@resolveos/shared';
import { ProblemScorer } from '@resolveos/domain';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  HelpCircle,
  Lightbulb,
  GitBranch,
  Target,
  CheckSquare,
  ShieldCheck,
  RotateCcw,
  Plus,
  Send,
  Zap,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const CaseDetailView: React.FC = () => {
  const { workspaceId, caseId } = useParams<{ workspaceId: string; caseId: string }>();
  const { activeWorkspaceId } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const currentWorkspaceId = workspaceId || activeWorkspaceId;

  // Case State
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'problem' | 'evidence' | 'hypotheses' | 'root_cause' | 'solutions' | 'actions' | 'verification' | 'retro' | 'timeline'>('problem');

  // Sub-entity collections
  const [evidenceList, setEvidenceList] = useState<CaseEvidence[]>([]);
  const [questionsList, setQuestionsList] = useState<CaseQuestion[]>([]);
  const [hypothesesList, setHypothesesList] = useState<Hypothesis[]>([]);
  const [rootCausesList, setRootCausesList] = useState<RootCause[]>([]);
  const [solutionsList, setSolutionsList] = useState<Solution[]>([]);
  const [decisionsList, setDecisionsList] = useState<Decision[]>([]);
  const [actionsList, setActionsList] = useState<CaseAction[]>([]);
  const [verificationsList, setVerificationsList] = useState<Verification[]>([]);
  const [retrospective, setRetrospective] = useState<Retrospective | null>(null);
  const [activities, setActivities] = useState<CaseActivity[]>([]);

  // Form states
  const [problemForm, setProblemForm] = useState<Partial<ProblemStatement>>({});
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newHypoDesc, setNewHypoDesc] = useState('');
  const [newWhyStatement, setNewWhyStatement] = useState('');
  const [newSolutionName, setNewSolutionName] = useState('');
  const [newSolutionDesc, setNewSolutionDesc] = useState('');
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newExpectedResult, setNewExpectedResult] = useState('');

  const loadCaseFull = async () => {
    if (!currentWorkspaceId || !caseId) return;
    try {
      setLoading(true);
      const [
        cData,
        evData,
        qData,
        hypoData,
        rcData,
        solData,
        decData,
        actData,
        verData,
        retroData,
        actLogData
      ] = await Promise.all([
        APIClient.get<Case>(`/workspaces/${currentWorkspaceId}/cases/${caseId}`),
        APIClient.get<CaseEvidence[]>(`/workspaces/${currentWorkspaceId}/cases/${caseId}/evidence`),
        APIClient.get<CaseQuestion[]>(`/workspaces/${currentWorkspaceId}/cases/${caseId}/questions`),
        APIClient.get<Hypothesis[]>(`/workspaces/${currentWorkspaceId}/cases/${caseId}/hypotheses`),
        APIClient.get<RootCause[]>(`/workspaces/${currentWorkspaceId}/cases/${caseId}/root-causes`),
        APIClient.get<Solution[]>(`/workspaces/${currentWorkspaceId}/cases/${caseId}/solutions`),
        APIClient.get<Decision[]>(`/workspaces/${currentWorkspaceId}/cases/${caseId}/decisions`),
        APIClient.get<CaseAction[]>(`/workspaces/${currentWorkspaceId}/cases/${caseId}/actions`),
        APIClient.get<Verification[]>(`/workspaces/${currentWorkspaceId}/cases/${caseId}/verifications`),
        APIClient.get<Retrospective | null>(`/workspaces/${currentWorkspaceId}/cases/${caseId}/retrospective`),
        APIClient.get<CaseActivity[]>(`/workspaces/${currentWorkspaceId}/cases/${caseId}/activities`)
      ]);

      setCaseData(cData);
      setProblemForm(cData.problemStatement || { title: cData.title, statement: cData.description, severity: cData.severity });
      setEvidenceList(evData || []);
      setQuestionsList(qData || []);
      setHypothesesList(hypoData || []);
      setRootCausesList(rcData || []);
      setSolutionsList(solData || []);
      setDecisionsList(decData || []);
      setActionsList(actData || []);
      setVerificationsList(verData || []);
      setRetrospective(retroData);
      setActivities(actLogData || []);
    } catch (err: any) {
      console.error('Failed to load full case details:', err);
      addToast({ type: 'error', message: err.message || 'Failed to load case.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseFull();
  }, [currentWorkspaceId, caseId]);

  // Status transition handler
  const handleStatusChange = async (nextStatus: CaseStatus) => {
    if (!currentWorkspaceId || !caseId || !caseData) return;
    try {
      await APIClient.patch(`/workspaces/${currentWorkspaceId}/cases/${caseId}`, {
        status: nextStatus,
        expectedVersion: caseData.version
      });
      addToast({ type: 'success', message: `Case status changed to ${nextStatus}` });
      loadCaseFull();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  // Save Problem Statement
  const handleSaveProblemStatement = async () => {
    if (!currentWorkspaceId || !caseId || !caseData) return;
    try {
      await APIClient.patch(`/workspaces/${currentWorkspaceId}/cases/${caseId}`, {
        title: problemForm.title || caseData.title,
        problemStatement: problemForm,
        expectedVersion: caseData.version
      });
      addToast({ type: 'success', message: 'Problem definition saved.' });
      loadCaseFull();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  // Add Evidence
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvidenceTitle.trim() || !currentWorkspaceId || !caseId) return;
    try {
      await APIClient.post(`/workspaces/${currentWorkspaceId}/cases/${caseId}/evidence`, {
        title: newEvidenceTitle,
        description: newEvidenceDesc,
        type: 'OBSERVATION',
        confidence: 'MEDIUM'
      });
      setNewEvidenceTitle('');
      setNewEvidenceDesc('');
      addToast({ type: 'success', message: 'Evidence logged.' });
      loadCaseFull();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  // Add Question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !currentWorkspaceId || !caseId) return;
    try {
      await APIClient.post(`/workspaces/${currentWorkspaceId}/cases/${caseId}/questions`, {
        question: newQuestionText
      });
      setNewQuestionText('');
      addToast({ type: 'success', message: 'Question added.' });
      loadCaseFull();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  // Add Hypothesis
  const handleAddHypothesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHypoDesc.trim() || !currentWorkspaceId || !caseId) return;
    try {
      await APIClient.post(`/workspaces/${currentWorkspaceId}/cases/${caseId}/hypotheses`, {
        description: newHypoDesc,
        confidence: 'MEDIUM',
        status: 'UNTESTED'
      });
      setNewHypoDesc('');
      addToast({ type: 'success', message: 'Hypothesis created.' });
      loadCaseFull();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  // Add Root Cause 5-Whys
  const handleAddWhy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhyStatement.trim() || !currentWorkspaceId || !caseId) return;
    const whyLevel = (rootCausesList.length % 5) + 1;
    try {
      await APIClient.post(`/workspaces/${currentWorkspaceId}/cases/${caseId}/root-causes`, {
        method: 'FIVE_WHYS',
        whyLevel,
        statement: newWhyStatement,
        isConfirmed: false
      });
      setNewWhyStatement('');
      addToast({ type: 'success', message: `Why #${whyLevel} recorded.` });
      loadCaseFull();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  // Add Solution
  const handleAddSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSolutionName.trim() || !currentWorkspaceId || !caseId) return;
    try {
      await APIClient.post(`/workspaces/${currentWorkspaceId}/cases/${caseId}/solutions`, {
        name: newSolutionName,
        description: newSolutionDesc || newSolutionName,
        costScore: 3,
        effortScore: 3,
        riskScore: 2,
        impactScore: 4,
        timeToImplementDays: 5
      });
      setNewSolutionName('');
      setNewSolutionDesc('');
      addToast({ type: 'success', message: 'Solution proposed.' });
      loadCaseFull();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  // Add Action
  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim() || !currentWorkspaceId || !caseId) return;
    try {
      await APIClient.post(`/workspaces/${currentWorkspaceId}/cases/${caseId}/actions`, {
        title: newActionTitle,
        priority: 'MEDIUM',
        status: 'TODO'
      });
      setNewActionTitle('');
      addToast({ type: 'success', message: 'Action scheduled.' });
      loadCaseFull();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  // Add Verification
  const handleAddVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpectedResult.trim() || !currentWorkspaceId || !caseId) return;
    try {
      await APIClient.post(`/workspaces/${currentWorkspaceId}/cases/${caseId}/verifications`, {
        expectedResult: newExpectedResult,
        status: 'PENDING'
      });
      setNewExpectedResult('');
      addToast({ type: 'success', message: 'Verification criterion registered.' });
      loadCaseFull();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  if (loading || !caseData) {
    return (
      <div className="p-12 text-center text-xs font-mono text-muted-foreground">
        Loading case resolution workflow...
      </div>
    );
  }

  const problemScore = ProblemScorer.calculateScore(problemForm);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Case Header Banner */}
      <div className="p-6 rounded-xl bg-card border border-border space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {caseData.incidentMode && (
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono text-xs font-bold border border-rose-500/30 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  INCIDENT MODE
                </span>
              )}
              <span className="text-xs font-mono text-muted-foreground">
                CASE-{caseData.id.slice(0, 8).toUpperCase()} • v{caseData.version}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{caseData.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Lifecycle Stage</span>
              <select
                value={caseData.status}
                onChange={e => handleStatusChange(e.target.value as CaseStatus)}
                aria-label="Update case status"
                className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary font-mono text-xs font-bold outline-none cursor-pointer"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="OPEN">OPEN</option>
                <option value="INVESTIGATING">INVESTIGATING</option>
                <option value="MITIGATION">MITIGATION</option>
                <option value="VERIFYING">VERIFYING</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Workflow Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-border pt-3">
          {[
            { id: 'problem', label: '1. Problem Definition', icon: FileText, count: `${problemScore.score}%` },
            { id: 'evidence', label: '2. Evidence', icon: CheckCircle2, count: evidenceList.length },
            { id: 'hypotheses', label: '3. Hypotheses', icon: Lightbulb, count: hypothesesList.length },
            { id: 'root_cause', label: '4. Root Cause', icon: GitBranch, count: rootCausesList.length },
            { id: 'solutions', label: '5. Solutions', icon: Target, count: solutionsList.length },
            { id: 'actions', label: '6. Action Plan', icon: CheckSquare, count: actionsList.length },
            { id: 'verification', label: '7. Verification', icon: ShieldCheck, count: verificationsList.length },
            { id: 'retro', label: '8. Retrospective', icon: RotateCcw, count: retrospective ? '1' : '0' },
            { id: 'timeline', label: 'Timeline', icon: Clock, count: activities.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Problem Definition */}
      {activeTab === 'problem' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4 p-6 rounded-xl bg-card border border-border">
            <h2 className="text-base font-bold">Structured Problem Statement Builder</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Title</label>
                <input
                  type="text"
                  value={problemForm.title || ''}
                  onChange={e => setProblemForm({ ...problemForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Detailed Problem Statement *</label>
                <textarea
                  rows={4}
                  value={problemForm.statement || ''}
                  onChange={e => setProblemForm({ ...problemForm, statement: e.target.value })}
                  placeholder="Explain what is going wrong, including context and trigger..."
                  className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Expected Baseline Behavior</label>
                  <textarea
                    rows={3}
                    value={problemForm.expectedBehavior || ''}
                    onChange={e => setProblemForm({ ...problemForm, expectedBehavior: e.target.value })}
                    placeholder="What was supposed to happen?"
                    className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Observed Symptom Behavior</label>
                  <textarea
                    rows={3}
                    value={problemForm.observedBehavior || ''}
                    onChange={e => setProblemForm({ ...problemForm, observedBehavior: e.target.value })}
                    placeholder="What actually manifested?"
                    className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Impact & Consequence</label>
                  <input
                    type="text"
                    value={problemForm.impact || ''}
                    onChange={e => setProblemForm({ ...problemForm, impact: e.target.value })}
                    placeholder="e.g. 38% checkout abandonment"
                    className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Affected Users / Systems</label>
                  <input
                    type="text"
                    value={problemForm.affectedUsers || ''}
                    onChange={e => setProblemForm({ ...problemForm, affectedUsers: e.target.value })}
                    placeholder="e.g. Payment microservice cluster"
                    className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  onClick={handleSaveProblemStatement}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                >
                  Save Problem Definition
                </button>
              </div>
            </div>
          </div>

          {/* Quality Indicator Meter */}
          <div className="space-y-4 p-6 rounded-xl bg-card border border-border flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                Problem Quality Score
              </h3>
              
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-black">{problemScore.score}%</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  problemScore.rating === 'COMPREHENSIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                  problemScore.rating === 'ACTIONABLE' ? 'bg-blue-500/20 text-blue-400' :
                  problemScore.rating === 'BASIC' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-rose-500/20 text-rose-400'
                }`}>
                  {problemScore.rating}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    problemScore.score >= 80 ? 'bg-emerald-500' :
                    problemScore.score >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${problemScore.score}%` }}
                />
              </div>

              {problemScore.missingFields.length > 0 && (
                <div className="space-y-2 pt-3">
                  <span className="text-xs font-semibold text-muted-foreground">Missing Elements:</span>
                  <ul className="space-y-1">
                    {problemScore.missingFields.map((m: string) => (
                      <li key={m} className="text-xs text-amber-400 font-mono flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-[11px] text-muted-foreground">
              A clear problem statement eliminates 80% of investigative confusion.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Evidence */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <form onSubmit={handleAddEvidence} className="p-5 rounded-xl bg-card border border-border flex gap-3">
            <input
              type="text"
              required
              placeholder="Evidence title (e.g. APM Latency Trace / Server Log Error)..."
              value={newEvidenceTitle}
              onChange={e => setNewEvidenceTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shrink-0"
            >
              Add Evidence
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evidenceList.map(ev => (
              <div key={ev.id} className="p-4 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground font-semibold">
                    {ev.type}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {ev.confidence} CONFIDENCE
                  </span>
                </div>
                <h3 className="font-semibold text-sm">{ev.title}</h3>
                <p className="text-xs text-muted-foreground">{ev.description || 'No notes added.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Hypotheses */}
      {activeTab === 'hypotheses' && (
        <div className="space-y-6">
          <form onSubmit={handleAddHypothesis} className="p-5 rounded-xl bg-card border border-border flex gap-3">
            <input
              type="text"
              required
              placeholder="State a testable hypothesis (e.g. Connection pool exhaustion caused timeouts)..."
              value={newHypoDesc}
              onChange={e => setNewHypoDesc(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shrink-0"
            >
              Add Hypothesis
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hypothesesList.map(h => (
              <div key={h.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary font-bold">
                    {h.status}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {h.confidence} Confidence
                  </span>
                </div>
                <p className="text-sm font-medium">{h.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Root Cause (5-Whys) */}
      {activeTab === 'root_cause' && (
        <div className="space-y-6 p-6 rounded-xl bg-card border border-border">
          <h2 className="text-base font-bold">Root Cause Analysis (5-Whys Chain)</h2>

          <div className="space-y-3">
            {rootCausesList.map((rc, idx) => (
              <div key={rc.id} className="p-3 rounded-lg border border-border/80 bg-muted/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center font-mono text-xs">
                  W{idx + 1}
                </div>
                <span className="text-xs font-medium flex-1">{rc.statement}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddWhy} className="flex gap-3 pt-3 border-t border-border">
            <input
              type="text"
              required
              placeholder={`State Why #${(rootCausesList.length % 5) + 1}...`}
              value={newWhyStatement}
              onChange={e => setNewWhyStatement(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Add Why
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Solutions Matrix */}
      {activeTab === 'solutions' && (
        <div className="space-y-6">
          <form onSubmit={handleAddSolution} className="p-5 rounded-xl bg-card border border-border flex gap-3">
            <input
              type="text"
              required
              placeholder="Solution name..."
              value={newSolutionName}
              onChange={e => setNewSolutionName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Propose Solution
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {solutionsList.map(sol => (
              <div key={sol.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">{sol.name}</h3>
                  {sol.isChosen && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                      CHOSEN
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{sol.description}</p>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono pt-2 border-t border-border/50">
                  <div className="p-1 rounded bg-muted/30">Cost: {sol.costScore}/5</div>
                  <div className="p-1 rounded bg-muted/30">Effort: {sol.effortScore}/5</div>
                  <div className="p-1 rounded bg-muted/30">Risk: {sol.riskScore}/5</div>
                  <div className="p-1 rounded bg-muted/30">Impact: {sol.impactScore}/5</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Action Plan */}
      {activeTab === 'actions' && (
        <div className="space-y-6">
          <form onSubmit={handleAddAction} className="p-5 rounded-xl bg-card border border-border flex gap-3">
            <input
              type="text"
              required
              placeholder="New corrective action..."
              value={newActionTitle}
              onChange={e => setNewActionTitle(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Add Action
            </button>
          </form>

          <div className="space-y-2">
            {actionsList.map(act => (
              <div key={act.id} className="p-3 rounded-lg bg-card border border-border flex items-center justify-between">
                <span className="text-xs font-semibold">{act.title}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                  {act.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Verification */}
      {activeTab === 'verification' && (
        <div className="space-y-6 p-6 rounded-xl bg-card border border-border">
          <h2 className="text-base font-bold">Verification Engine</h2>
          <p className="text-xs text-muted-foreground">
            A case cannot be marked resolved without at least one PASSED verification criterion.
          </p>

          <form onSubmit={handleAddVerification} className="flex gap-3">
            <input
              type="text"
              required
              placeholder="Expected measurable outcome (e.g. p99 latency < 200ms at 5k RPS)..."
              value={newExpectedResult}
              onChange={e => setNewExpectedResult(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Add Criterion
            </button>
          </form>

          <div className="space-y-3 pt-3">
            {verificationsList.map(v => (
              <div key={v.id} className="p-4 rounded-lg bg-muted/20 border border-border flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold">{v.expectedResult}</span>
                  {v.observedResult && (
                    <p className="text-xs text-muted-foreground font-mono">Observed: {v.observedResult}</p>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold ${
                  v.status === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400' :
                  v.status === 'FAILED' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 8: Retrospective */}
      {activeTab === 'retro' && (
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h2 className="text-base font-bold">Post-Resolution Retrospective</h2>
          {retrospective ? (
            <div className="space-y-4 text-xs leading-relaxed">
              <div>
                <span className="font-semibold text-muted-foreground font-mono uppercase">What Happened:</span>
                <p className="mt-1">{retrospective.whatHappened}</p>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground font-mono uppercase">What Caused It:</span>
                <p className="mt-1">{retrospective.whatCausedIt}</p>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground font-mono uppercase">What Solved It:</span>
                <p className="mt-1">{retrospective.whatSolvedIt}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-mono">
              Retrospective will be generated once case is resolved.
            </p>
          )}
        </div>
      )}

      {/* Tab 9: Timeline */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-xl bg-card border border-border space-y-3">
          <h2 className="text-base font-bold">Audit & Activity Timeline</h2>
          <div className="space-y-2">
            {activities.map(act => (
              <div key={act.id} className="p-3 rounded-lg bg-muted/20 border border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                    {act.eventType}
                  </span>
                  <span className="text-muted-foreground">
                    by {act.user?.name || 'System'}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(act.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
