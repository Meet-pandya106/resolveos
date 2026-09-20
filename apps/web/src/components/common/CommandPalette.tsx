import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import {
  Search,
  LayoutDashboard,
  FileText,
  PlusCircle,
  Shield,
  Lock,
  Moon,
  Sun,
  LogOut,
  Zap
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setCommandPaletteOpen, toggleTheme, theme } = useUIStore();
  const { activeWorkspaceId, logout } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    {
      id: 'dash',
      title: 'Open Dashboard',
      icon: LayoutDashboard,
      action: () => navigate('/')
    },
    {
      id: 'cases',
      title: 'View All Cases',
      icon: FileText,
      action: () => navigate('/cases')
    },
    {
      id: 'new_case',
      title: 'Create New Case',
      icon: PlusCircle,
      action: () => navigate('/cases/new')
    },
    {
      id: 'incident',
      title: 'Incident Mode Overview',
      icon: Zap,
      action: () => navigate('/cases?incident=true')
    },
    {
      id: 'graph',
      title: 'Interactive 3D Case Network',
      icon: FileText,
      action: () => navigate('/network')
    },
    {
      id: 'privacy',
      title: 'Open Privacy Center',
      icon: Shield,
      action: () => navigate('/privacy')
    },
    {
      id: 'security',
      title: 'Open Security Center',
      icon: Lock,
      action: () => navigate('/security')
    },
    {
      id: 'theme',
      title: `Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      icon: theme === 'dark' ? Sun : Moon,
      action: () => toggleTheme()
    },
    {
      id: 'logout',
      title: 'Sign Out of ResolveOS',
      icon: LogOut,
      action: () => logout()
    }
  ];

  const filtered = commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-24 p-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-border bg-muted/30">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search cases... (ESC to close)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
              } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                e.preventDefault();
                filtered[selectedIndex].action();
                setCommandPaletteOpen(false);
              }
            }}
            className="w-full py-3.5 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground font-sans"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground font-mono">
              No matching commands or actions found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    <span>{cmd.title}</span>
                  </div>
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    Action
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
