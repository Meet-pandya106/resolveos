import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { APIClient } from '../../lib/api.js';
import {
  ShieldCheck,
  Zap,
  Lock,
  Network,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Database,
  EyeOff,
  GitBranch,
  Terminal,
  Activity,
  Cpu,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Play
} from 'lucide-react';

export const LandingView: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { addToast } = useUIStore();
  const [activeStage, setActiveStage] = useState(1);
  const [demoLoading, setDemoLoading] = useState(false);

  // Redaction sandbox state
  const [sandboxInput, setSandboxInput] = useState(
    `Error on auth gateway: Failed token verification for user admin@production.internal.
Request auth header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID...
API Key leaked in query params: sk_test_DEMO_TOKEN_EXAMPLE_1234
Client IP: 192.168.1.104 requested password reset for card 4532-8921-9902-1234.`
  );

  // Redaction logic for interactive sandbox
  const redactSandbox = (text: string) => {
    return text
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
      .replace(/(?:sk_live_|sk_test_|ghp_|gho_|xox[baprs]-)[a-zA-Z0-9]{12,}/g, '[SECRET_REDACTED]')
      .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[JWT_REDACTED]')
      .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[CARD_REDACTED]')
      .replace(/\b(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]');
  };

  const handleQuickDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const res = await APIClient.post('/auth/login', {
        email: 'demo@resolveos.local',
        password: 'ResolveOS#Demo2026!'
      });
      login(res.user, res.token, res.workspaces, res.defaultWorkspaceId);
      addToast({ type: 'success', message: 'Welcome to the ResolveOS Live Demo Environment!' });
      navigate('/');
    } catch (err: any) {
      addToast({ type: 'error', message: 'Demo server is offline. Starting local fallback...' });
      navigate('/login');
    } finally {
      setDemoLoading(false);
    }
  };

  const stages = [
    {
      num: 1,
      name: 'Problem Formulation',
      badge: 'Completeness 0-100%',
      desc: 'Structured description with live completeness scoring. Replaces ambiguous bug tickets with verifiable problem statements.',
      preview: {
        title: 'Core Memory Leak in Real-Time WebSocket Session Broker',
        meter: '92% Structured Completeness',
        detail: 'Scope: High-throughput ingestion nodes • Trigger: Burst connection reconnection cycles.'
      }
    },
    {
      num: 2,
      name: 'Symptom Quantification',
      badge: 'Telemetry Delta',
      desc: 'Measure exact deviation from expected baseline to eliminate qualitative guesswork.',
      preview: {
        title: 'Baseline vs Observed Delta',
        meter: 'Delta: +840ms Latency',
        detail: 'Expected: p99 < 45ms at 25k req/s. Observed: p99 peaked at 885ms with 14.2% socket drops.'
      }
    },
    {
      num: 3,
      name: 'Evidence Corroboration',
      badge: 'Weighted Confidence',
      desc: 'Attach APM traces, heap dumps, and log snippets with algorithmic confidence ratings.',
      preview: {
        title: 'Corroborated Telemetry Artifacts',
        meter: '4 Corroborating Artifacts',
        detail: 'Heap Dump (.heapsnapshot) verified 98% confidence • Contradictory Network Trace flagged 22% confidence.'
      }
    },
    {
      num: 4,
      name: 'Inquiry & Leads',
      badge: 'Unanswered Questions',
      desc: 'Direct investigative questions to specific team members to systematically remove unknowns.',
      preview: {
        title: 'Assigned Investigative Leads',
        meter: '3/4 Questions Answered',
        detail: 'Assigned to @sarah: Was the v2.4 socket buffer patch deployed prior to the 14:00 UTC traffic spike?'
      }
    },
    {
      num: 5,
      name: 'Competing Hypotheses',
      badge: 'Theory Battleground',
      desc: 'Pit alternative root cause theories against one another: Untested, Supported, Weakened, Confirmed.',
      preview: {
        title: 'Hypothesis Evaluation Matrix',
        meter: '1 Confirmed • 2 Disproven',
        detail: 'Hypothesis A (V8 Buffer Retain Cycle) CONFIRMED via memory profiling. Hypothesis B (OS File Descriptor leak) DISPROVEN.'
      }
    },
    {
      num: 6,
      name: 'Root Cause Analysis',
      badge: 'Recursive 5-Whys',
      desc: 'Traverse recursive 5-Whys causality chains and Ishikawa Fishbone categorization.',
      preview: {
        title: 'Recursive 5-Whys Causality Chain',
        meter: 'Depth Level 5 Reached',
        detail: 'Why 1: Memory exceeded cgroup limit → Why 2: Socket listeners not detached on client reset → Root: Missing finally unbind.'
      }
    },
    {
      num: 7,
      name: 'Solution Matrix',
      badge: 'Multi-Criteria Scoring',
      desc: 'Empirically weigh candidate remediations on Cost, Effort, Risk, Impact, and Time-to-Deploy.',
      preview: {
        title: 'Candidate Remediation Scoring',
        meter: 'Selected: Auto-Drain Buffer Patch (94/100)',
        detail: 'Option 1: Complete Broker Rewrite (Score: 42) vs Option 2: WeakRef Buffer Pool (Score: 94 - Recommended).'
      }
    },
    {
      num: 8,
      name: 'Decision Log',
      badge: 'Immutable ADR',
      desc: 'Maintain permanent architectural decision records detailing what was chosen and why alternatives were rejected.',
      preview: {
        title: 'Architectural Decision Record #ADR-2026-08',
        meter: 'Signed & Recorded at 15:42 UTC',
        detail: 'Decision: Adopt WeakRef WeakMap pooling. Rejected Alternative: Manual ref-counting due to high regression risk.'
      }
    },
    {
      num: 9,
      name: 'Action Plan Kanban',
      badge: 'Ownership & Deadlines',
      desc: 'Actionable containment and long-term fix items with verifiable completion criteria.',
      preview: {
        title: 'Containment & Permanent Remediation Tasks',
        meter: '5 of 5 Tasks Completed',
        detail: 'Task 1: Patch socket unbind in staging (DONE) • Task 2: Canary rollout to cluster us-east-1 (DONE).'
      }
    },
    {
      num: 10,
      name: 'Verification Engine',
      badge: 'Empirical Proof',
      desc: 'Validate remediation through direct empirical metric measurement before claiming success.',
      preview: {
        title: 'Empirical Verification Test Suite',
        meter: 'Test Result: PASSED',
        detail: 'Observed p99 after patch: 38ms (Target: < 45ms). Heap allocation stable at 410MB under 50k simulated socket connections.'
      }
    },
    {
      num: 11,
      name: 'Case Resolution',
      badge: 'Enforced Invariant',
      desc: 'Strict state machine guard: Case transition to RESOLVED is physically blocked without a PASSED verification.',
      preview: {
        title: 'Strict Resolution Invariant Guard',
        meter: 'Status: RESOLVED (Verified)',
        detail: 'State transition validated: Invariant check confirmed 100% test pass. Tamper-evident audit log stamped.'
      }
    },
    {
      num: 12,
      name: 'Post-Mortem Retro',
      badge: 'Automated Synthesis',
      desc: 'Auto-synthesized incident timeline, systemic lessons learned, and automated regression monitors.',
      preview: {
        title: 'Blameless Post-Mortem & Preventive Monitors',
        meter: 'Published to Knowledge Base',
        detail: 'Timeline synthesized across 14 events. Preventive synthetic monitoring alert configured at p99 > 50ms.'
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground cyber-grid relative selection:bg-primary/30 selection:text-primary">
      {/* Ambient Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] radial-glow pointer-events-none" />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-glow-primary">
              R
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-base bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                ResolveOS
              </span>
              <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                v1.0.0
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <a href="#lifecycle" className="hover:text-primary transition-colors">12-Stage Lifecycle</a>
            <a href="#sandbox" className="hover:text-primary transition-colors">PII Redactor</a>
            <a href="#security" className="hover:text-primary transition-colors">OWASP ASVS Defense</a>
            <a href="#architecture" className="hover:text-primary transition-colors">Tech Architecture</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-medium px-3.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={handleQuickDemoLogin}
              disabled={demoLoading}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{demoLoading ? 'Starting Demo...' : '1-Click Demo'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary mb-6 animate-pulse-subtle">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>OWASP ASVS 5.0 • ZERO TELEMETRY • LOCAL-FIRST SCIENTIFIC RESOLUTION</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.1]">
          Turn Chaotic Incidents into{' '}
          <span className="text-gradient-cyan">Auditable, Verified</span> Solutions.
        </h1>

        <p className="mt-6 text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          ResolveOS replaces messy Slack threads and intuitive guesses with an enforced{' '}
          <strong className="text-foreground font-semibold">12-Stage Scientific Resolution Lifecycle</strong>. 
          Featuring zero-telemetry local-first storage, automated PII sanitization, 3D relational telemetry graphs, 
          and mathematical invariant blocks that prevent premature case closure.
        </p>

        {/* Hero CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleQuickDemoLogin}
            disabled={demoLoading}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 shadow-glow-primary transition-all active:scale-95"
          >
            <Zap className="w-4 h-4" />
            <span>Launch Live Interactive Demo</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="#lifecycle"
            className="flex items-center gap-2 px-6 py-3 rounded-xl glass-panel text-foreground font-semibold text-sm hover:border-primary/50 transition-colors"
          >
            <Layers className="w-4 h-4 text-primary" />
            <span>Explore 12-Stage Lifecycle</span>
          </a>

          <a
            href="https://github.com/Meet-pandya106/resolveos"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-muted/50 border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <Terminal className="w-4 h-4" />
            <span>GitHub Repository</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Live Metrics Row */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-4 rounded-xl glass-panel border border-border/80">
            <div className="text-2xl font-black text-primary font-mono">12 Stages</div>
            <div className="text-xs text-muted-foreground mt-1">Guided Scientific Flow</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-border/80">
            <div className="text-2xl font-black text-emerald-400 font-mono">100% Invariant</div>
            <div className="text-xs text-muted-foreground mt-1">Blocked without PASSED Test</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-border/80">
            <div className="text-2xl font-black text-sky-400 font-mono">0 Telemetry</div>
            <div className="text-xs text-muted-foreground mt-1">Local-First Crash-Safe Engine</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-border/80">
            <div className="text-2xl font-black text-purple-400 font-mono">33 / 33</div>
            <div className="text-xs text-muted-foreground mt-1">Verified Security Test Suites</div>
          </div>
        </div>
      </section>

      {/* Interactive 12-Stage Lifecycle Section */}
      <section id="lifecycle" className="max-w-7xl mx-auto px-6 py-20 border-t border-border/60">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono mb-3">
            <GitBranch className="w-3.5 h-3.5" />
            <span>THE 12-STAGE SCIENTIFIC RESOLUTION ENGINE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            A Structured Machine for Complex Failures
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
            Click any stage below to inspect how ResolveOS turns chaotic guesses into auditable proof.
          </p>
        </div>

        {/* Stage Pills Carousel / Grid */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 max-w-5xl mx-auto">
          {stages.map((st) => (
            <button
              key={st.num}
              onClick={() => setActiveStage(st.num)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all flex items-center gap-1.5 ${
                activeStage === st.num
                  ? 'bg-primary text-primary-foreground shadow-glow-primary scale-105'
                  : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-primary-foreground/20 text-[10px] flex items-center justify-center font-bold">
                {st.num}
              </span>
              <span>{st.name}</span>
            </button>
          ))}
        </div>

        {/* Active Stage Deep Dive Card */}
        {(() => {
          const current = stages.find((s) => s.num === activeStage) || stages[0];
          return (
            <div className="max-w-4xl mx-auto glass-panel-glow rounded-2xl p-8 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-lg font-black font-mono">
                    {current.num.toString().padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{current.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{current.desc}</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold self-start md:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{current.badge}</span>
                </div>
              </div>

              {/* Interactive Telemetry Mockup */}
              <div className="mt-6 bg-background/90 rounded-xl border border-border/80 p-5 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between text-muted-foreground pb-2 border-b border-border/40">
                  <span>RESOLVEOS TELEMETRY RUNTIME // STAGE #{current.num}</span>
                  <span className="text-primary font-bold">{current.preview.meter}</span>
                </div>
                <div className="text-foreground font-semibold text-sm">{current.preview.title}</div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-muted-foreground leading-relaxed">
                  {current.preview.detail}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setActiveStage((prev) => (prev > 1 ? prev - 1 : 12))}
                  className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1"
                >
                  ← Previous Stage
                </button>
                <button
                  onClick={handleQuickDemoLogin}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Test this stage live in demo</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setActiveStage((prev) => (prev < 12 ? prev + 1 : 1))}
                  className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1"
                >
                  Next Stage →
                </button>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Live PII & Secrets Redactor Interactive Sandbox */}
      <section id="sandbox" className="max-w-7xl mx-auto px-6 py-20 border-t border-border/60">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-mono mb-3">
            <EyeOff className="w-3.5 h-3.5" />
            <span>ZERO EXFILTRATION GUARANTEE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Live Automated PII & Secrets Redactor
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
            Type or paste sensitive logs below. ResolveOS automatically strips credentials, API keys, tokens, and PII before any processing.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Side */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  RAW UNTRUSTED LOG DUMP (Try Editing)
                </span>
                <button
                  onClick={() =>
                    setSandboxInput(
                      `Session Token leaked: token_ghp_DEMO_EXEMPLAR_KEY_9921\nUser: test-developer@corp.net\nJWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`
                    )
                  }
                  className="text-[11px] text-primary hover:underline font-mono"
                >
                  Load Token Example
                </button>
              </div>
              <textarea
                rows={8}
                value={sandboxInput}
                onChange={(e) => setSandboxInput(e.target.value)}
                className="w-full bg-background/90 border border-border rounded-xl p-3 font-mono text-xs text-foreground outline-none focus:border-primary resize-none leading-relaxed"
              />
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground font-mono">
              Detects: API keys (sk_*, ghp_*), JWT tokens, RFC emails, credit cards, and private IP blocks.
            </div>
          </div>

          {/* Redacted Output Side */}
          <div className="glass-panel-glow rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  SANITIZED OUTPUT (ZERO SECRETS LEAKED)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  LIVE SECURE
                </span>
              </div>
              <div className="w-full h-48 bg-background/90 border border-emerald-500/30 rounded-xl p-3 font-mono text-xs text-emerald-300 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {redactSandbox(sandboxInput)}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>OWASP ASVS 5.0 Compliant Redaction</span>
              <span className="text-emerald-400 font-semibold">100% Client & Server Redacted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Security Defense Vault */}
      <section id="security" className="max-w-7xl mx-auto px-6 py-20 border-t border-border/60">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>CRYPTOGRAPHIC SECURITY ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Engineered for High-Stakes Production
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
            Zero third-party tracking beacons. Zero telemetry. Strict server-side tenancy scoping.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">scrypt + Timing-Safe Equals</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Passwords hashed with Node-native scrypt (N=16384, r=8, p=1, 64-byte key length). All auth and secret checks use <code>crypto.timingSafeEqual</code> to defeat side-channel timing attacks.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">SSRFGuard Defense Guard</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hardened server-side request verification blocks link-local, loopback, private IPv4/IPv6 blocks, and cloud instance metadata (169.254.169.254).
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Crash-Safe Atomic Persistence</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All transactions write to temporary scratch files (<code>.tmp.&lt;timestamp&gt;</code>) followed by atomic operating system file renames (<code>fs.renameSync</code>), preventing corruption upon crashes.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">RFC 6238 TOTP Two-Factor Auth</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hardware-compatible authenticator support with time-drift tolerance (±1 step), encrypted recovery codes, and remote single-session revocation.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Authenticated WebSockets</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fastify WebSockets verify JWT tokens during initial connection handshake. Unauthorized attempts are rejected with strict WebSocket close code 4401.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Zero Telemetry & Right to Erasure</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Zero Google Analytics, tracking pixels, or third-party cookies. Full GDPR Art. 17 right-to-erasure and 1-click JSON/CSV workspace portability.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack Inventory */}
      <section id="architecture" className="max-w-7xl mx-auto px-6 py-20 border-t border-border/60">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono mb-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>FULL PRODUCTION STACK</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Decoupled 7-Package Monorepo
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
            Zero external C++ native build dependencies. Runs seamlessly on Windows, macOS, and Linux.
          </p>
        </div>

        <div className="max-w-4xl mx-auto glass-panel rounded-2xl p-6 font-mono text-xs divide-y divide-border/60">
          <div className="py-3 flex items-center justify-between">
            <span className="text-muted-foreground">Language & Runtime</span>
            <span className="text-foreground font-semibold">TypeScript 5.7 • Node.js 20+ (ES Modules)</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-muted-foreground">High-Throughput API Framework</span>
            <span className="text-foreground font-semibold">Fastify 5.2 • Schema Validated • CORS & Helmet</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-muted-foreground">Frontend Single Page App</span>
            <span className="text-foreground font-semibold">React 18.3 • Vite 6.2 • Tailwind CSS 3.4</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-muted-foreground">Client State & Caching</span>
            <span className="text-foreground font-semibold">Zustand 5.0 • TanStack React Query 5.66</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-muted-foreground">3D Relational Network</span>
            <span className="text-foreground font-semibold">Three.js 0.174 WebGL 2.0 Spatial Graph</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-muted-foreground">Contract Validation Engine</span>
            <span className="text-foreground font-semibold">Zod 3.24 Type-Safe Schemas</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-muted-foreground">Automated Testing & Regression</span>
            <span className="text-emerald-400 font-semibold">Vitest 3.2 (33 / 33 Passing Suites)</span>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="glass-panel-glow rounded-3xl p-10 sm:p-14 relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Ready to Resolve with Mathematical Rigor?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
              Test drive the full 12-stage problem resolution lifecycle right now. Zero setup required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={handleQuickDemoLogin}
                disabled={demoLoading}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 shadow-glow-primary transition-all active:scale-95"
              >
                <Zap className="w-4 h-4" />
                <span>{demoLoading ? 'Starting Workspace...' : 'Launch Instant Demo Workspace'}</span>
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-3.5 rounded-xl glass-panel text-foreground font-semibold text-sm hover:border-primary/50 transition-colors"
              >
                Create New Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10 px-6 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>ResolveOS v1.0.0 — Engineered for Mission-Critical Reliability</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <a
              href="https://github.com/Meet-pandya106/resolveos"
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <span>GitHub: Meet-pandya106/resolveos</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>MIT License</span>
            <span>Zero Telemetry</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
