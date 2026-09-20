/**
 * UI State & Notification Store
 */

import { create } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
}

interface UIState {
  theme: 'dark' | 'light';
  reducedMotion: boolean;
  isCommandPaletteOpen: boolean;
  toasts: ToastItem[];
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setReducedMotion: (enabled: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: (localStorage.getItem('resolveos_theme') as 'dark' | 'light') || 'dark',
  reducedMotion: localStorage.getItem('resolveos_reduced_motion') === 'true',
  isCommandPaletteOpen: false,
  toasts: [],

  setTheme: (theme) => {
    localStorage.setItem('resolveos_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setReducedMotion: (enabled) => {
    localStorage.setItem('resolveos_reduced_motion', String(enabled));
    document.body.classList.toggle('reduced-motion', enabled);
    set({ reducedMotion: enabled });
  },

  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}));
