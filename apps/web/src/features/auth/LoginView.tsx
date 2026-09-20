import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { APIClient } from '../../lib/api.js';
import { Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto shadow-md shadow-primary/30">
            R
          </div>
          <h1 className="text-xl font-bold tracking-tight">Sign in to ResolveOS</h1>
          <p className="text-xs text-muted-foreground">
            Turn messy problems into structured solutions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
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
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {requires2FA && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">6-Digit 2FA Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-center tracking-widest text-foreground outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Fill Helper */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center space-y-2">
          <span className="text-[11px] text-muted-foreground font-medium">Quick Local Evaluation:</span>
          <button
            type="button"
            onClick={handleFillDemo}
            className="w-full py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fill Demo Credentials</span>
          </button>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Register Workspace
          </Link>
        </div>
      </div>
    </div>
  );
};
