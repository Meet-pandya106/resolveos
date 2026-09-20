import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { APIClient } from '../../lib/api.js';
import {
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
  GitBranch,
  EyeOff,
  CheckCircle2,
  Key
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await APIClient.post('/auth/login', {
        email,
        password,
        totpCode: requires2FA ? totpCode : undefined
      });

      if (res.requires2FA) {
        setRequires2FA(true);
        addToast({ type: 'info', message: 'Two-factor authentication code required.' });
        setLoading(false);
        return;
      }

      login(res.user, res.token, res.workspaces, res.defaultWorkspaceId);
      addToast({ type: 'success', message: 'Welcome back to ResolveOS.' });
      navigate('/');
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Authentication failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@resolveos.local');
    setPassword('ResolveOS#Demo2026!');
  };

  return (
    <div className="min-h-screen bg-background text-foreground cyber-grid flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-primary/30 selection:text-primary">
      {/* Top Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-80 radial-glow pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Product Value & Guarantees */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>OWASP ASVS 5.0 ZERO-TRUST PLATFORM</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
              Investigate, Corroborate, and <span className="text-gradient-cyan">Empirically Verify</span>.
            </h1>

            <p className="text-xs text-muted-foreground leading-relaxed">
              ResolveOS turns unstructured outage chaos into mathematically auditable resolution paths. 
              Protected by scrypt cryptography, automated PII sanitization, and invariant state guards.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl glass-panel flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-foreground">Enforced Resolution Invariant</div>
                <div className="text-[11px] text-muted-foreground">Cases cannot be marked RESOLVED without a passed verification.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl glass-panel flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <EyeOff className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-foreground">Zero Telemetry & PII Redaction</div>
                <div className="text-[11px] text-muted-foreground">Automated credential masking and zero tracking cookies.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl glass-panel flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <GitBranch className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-foreground">12-Stage Scientific Machine</div>
                <div className="text-[11px] text-muted-foreground">From formulation to 5-Whys and empirical post-mortems.</div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link to="/showcase" className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
              <span>Explore the interactive 12-stage product tour</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: High-Security Login Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl mx-auto shadow-glow-primary">
                R
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Sign in to ResolveOS</h2>
              <p className="text-xs text-muted-foreground">
                Enter your credentials or test with the instant demo profile.
              </p>
            </div>

            {/* Quick Demo Fill Helper */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-center space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-muted-foreground">Instant Demo Account:</span>
                <span className="text-primary font-semibold">Ready</span>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="w-full py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fill Demo Credentials (1-Click)</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="demo@resolveos.local"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background/90 border border-border text-xs text-foreground outline-none focus:border-primary font-mono transition-colors"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background/90 border border-border text-xs text-foreground outline-none focus:border-primary font-mono transition-colors"
                  />
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {requires2FA && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <label className="block text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>6-Digit TOTP Authenticator Code</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-background border border-amber-500/40 text-xs font-mono text-center tracking-widest text-foreground outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-glow-primary active:scale-98 disabled:opacity-50"
              >
                {loading ? 'Authenticating with scrypt...' : 'Sign In to Workspace'}
              </button>
            </form>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <Link to="/register" className="text-primary font-medium hover:underline">
                Create Account
              </Link>
              <Link to="/showcase" className="hover:text-foreground">
                Public Overview
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
