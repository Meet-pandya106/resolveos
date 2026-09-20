import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { OfflineBanner } from '../common/OfflineBanner.js';
import { CommandPalette } from '../common/CommandPalette.js';
import {
  LayoutDashboard,
  FileText,
  Zap,
  Network,
  Shield,
  Lock,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Activity,
  Sparkles,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, workspaces, activeWorkspaceId, setActiveWorkspace, logout } = useAuthStore();
  const { theme, toggleTheme, setCommandPaletteOpen } = useUIStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'RO';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <OfflineBanner />
      <CommandPalette />

      {/* Top Header */}
      <header className="h-14 border-b border-border/80 bg-card/70 backdrop-blur-xl px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-glow-primary transition-transform hover:scale-105">
              R
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-sm bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                ResolveOS
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold hidden sm:inline-block">
                v1.0.0
              </span>
            </div>
          </div>

          {/* Active Workspace Switcher */}
          {workspaces.length > 0 && (
            <div className="relative group hidden sm:block">
              <select
                value={activeWorkspace?.id}
                onChange={(e) => setActiveWorkspace(e.target.value)}
                aria-label="Select active workspace"
                className="appearance-none bg-muted/40 border border-border hover:border-primary/40 text-xs font-medium rounded-lg pl-3 pr-8 py-1.5 outline-none cursor-pointer text-foreground transition-all"
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id} className="bg-card text-foreground">
                    {ws.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Command Palette Button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground border border-border transition-colors font-mono"
            title="Open Command Palette (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">Ctrl K</kbd>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* User Profile Pill & Signout */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs font-mono">
              {initials}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold leading-none">{user?.name || 'Engineer'}</span>
              <span className="text-[10px] text-muted-foreground font-mono leading-tight mt-0.5">
                {activeWorkspace?.ownerId === user?.id ? 'OWNER' : 'MEMBER'}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Navigation */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-30 w-64 border-r border-border/80 bg-card/90 md:bg-card/40 backdrop-blur-xl flex flex-col justify-between p-3 shrink-0 transition-transform duration-200
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <nav className="space-y-1 mt-12 md:mt-0">
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
              Resolution Engine
            </div>

            <NavLink
              to="/"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-glow-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/cases"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-glow-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <FileText className="w-4 h-4" />
              <span>All Cases</span>
            </NavLink>

            <NavLink
              to="/cases?incident=true"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white font-semibold shadow-glow-rose'
                    : 'text-rose-400 hover:bg-rose-500/10'
                }`
              }
            >
              <Zap className="w-4 h-4 animate-pulse" />
              <span>Incident Command</span>
            </NavLink>

            <NavLink
              to="/network"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-glow-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <Network className="w-4 h-4" />
              <span>3D Case Network</span>
            </NavLink>

            <div className="pt-4 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
              Privacy & Security
            </div>

            <NavLink
              to="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-glow-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <Shield className="w-4 h-4" />
              <span>Privacy Center</span>
            </NavLink>

            <NavLink
              to="/security"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-glow-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <Lock className="w-4 h-4" />
              <span>Security Vault</span>
            </NavLink>

            <div className="pt-4 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
              Showcase
            </div>

            <NavLink
              to="/showcase"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Product Tour</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
            </NavLink>
          </nav>

          {/* Privacy & Health Footprint */}
          <div className="p-3.5 bg-muted/30 border border-border/60 rounded-xl text-[11px] text-muted-foreground font-mono space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-foreground font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Local-First Ready
              </span>
              <span className="text-[10px] text-emerald-400">ONLINE</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              OWASP ASVS 5.0 • Zero Telemetry • Atomic File Writes
            </p>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 md:hidden"
          />
        )}

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
