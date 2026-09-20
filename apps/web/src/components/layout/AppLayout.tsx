import React from 'react';
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
  Activity
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, workspaces, activeWorkspaceId, setActiveWorkspace, logout } = useAuthStore();
  const { theme, toggleTheme, setCommandPaletteOpen } = useUIStore();
  const navigate = useNavigate();

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OfflineBanner />
      <CommandPalette />

      {/* Top Header */}
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm shadow-primary/30">
              R
            </div>
            <span className="font-bold tracking-tight text-sm">ResolveOS</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
              v1.0.0
            </span>
          </div>

          {/* Workspace Switcher */}
          {workspaces.length > 0 && (
            <div className="relative group">
              <select
                value={activeWorkspace?.id}
                onChange={(e) => setActiveWorkspace(e.target.value)}
                aria-label="Select active workspace"
                className="appearance-none bg-muted/50 border border-border hover:border-primary/50 text-xs font-medium rounded-lg px-3 py-1.5 pr-8 outline-none cursor-pointer text-foreground transition-colors"
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground border border-border transition-colors font-mono"
            title="Open Command Palette (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">Ctrl K</kbd>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-xs font-medium leading-none">{user?.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono leading-tight">{user?.email}</span>
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

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r border-border bg-card/30 flex flex-col justify-between p-3 shrink-0">
          <nav className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Problem Operations
            </div>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/cases"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <FileText className="w-4 h-4" />
              <span>Cases</span>
            </NavLink>

            <NavLink
              to="/cases?incident=true"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-rose-600 text-white font-semibold' : 'text-rose-400 hover:bg-rose-500/10'
                }`
              }
            >
              <Zap className="w-4 h-4" />
              <span>Incident Mode</span>
            </NavLink>

            <NavLink
              to="/network"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <Network className="w-4 h-4" />
              <span>3D Case Network</span>
            </NavLink>

            <div className="pt-4 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Governance & Security
            </div>

            <NavLink
              to="/privacy"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <Shield className="w-4 h-4" />
              <span>Privacy Center</span>
            </NavLink>

            <NavLink
              to="/security"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`
              }
            >
              <Lock className="w-4 h-4" />
              <span>Security Center</span>
            </NavLink>
          </nav>

          <div className="p-3 bg-muted/20 border border-border/50 rounded-lg text-[11px] text-muted-foreground font-mono space-y-1">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacy First</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Zero tracking cookies. Offline encrypted local queue active.
            </p>
          </div>
        </aside>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto bg-background/50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
