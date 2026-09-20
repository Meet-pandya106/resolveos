import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { APIClient } from '../../lib/api.js';
import { Lock, Mail, User } from 'lucide-react';

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto shadow-md shadow-primary/30">
            R
          </div>
          <h1 className="text-xl font-bold tracking-tight">Create your ResolveOS Account</h1>
          <p className="text-xs text-muted-foreground">
            Start structuring complex engineering & operational problems.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-foreground">Full Name</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Devon Vance"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
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
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
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
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none focus:border-primary"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account & Workspace'}
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
