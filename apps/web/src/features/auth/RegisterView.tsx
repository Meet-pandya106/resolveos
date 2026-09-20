import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { APIClient } from '../../lib/api.js';
import { Lock, Mail, User, ShieldCheck, ArrowRight } from 'lucide-react';

export const RegisterView: React.FC = () => {
  const { login } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await APIClient.post('/auth/register', {
        name,
        email,
        password
      });

      login(res.user, res.token, [], res.defaultWorkspaceId);
      addToast({ type: 'success', message: 'Workspace created successfully.' });
      navigate('/');
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground cyber-grid flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-primary/30 selection:text-primary">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 radial-glow pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl mx-auto shadow-glow-primary">
              R
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Create your ResolveOS Account</h1>
            <p className="text-xs text-muted-foreground">
              Start structuring complex engineering & operational failures.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Alex Mercer"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background/90 border border-border text-xs text-foreground outline-none focus:border-primary font-mono transition-colors"
                />
                <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Work Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="alex@company.internal"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background/90 border border-border text-xs text-foreground outline-none focus:border-primary font-mono transition-colors"
                />
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-foreground">Password (10+ characters)</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Must include A-Z, 0-9, and symbols"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background/90 border border-border text-xs text-foreground outline-none focus:border-primary font-mono transition-colors"
                />
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                Hashed with scrypt N=16384, r=8, p=1 at rest.
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-glow-primary active:scale-98 disabled:opacity-50"
            >
              {loading ? 'Initializing Workspace...' : 'Create Account & Workspace'}
            </button>
          </form>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Already have an account?</span>
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
