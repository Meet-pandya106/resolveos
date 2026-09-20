import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore.js';
import { useUIStore } from './stores/uiStore.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { Loader2 } from 'lucide-react';

// Code-split route components
const DashboardView = lazy(() => import('./features/dashboard/DashboardView.js').then(m => ({ default: m.DashboardView })));
const CaseListView = lazy(() => import('./features/cases/CaseListView.js').then(m => ({ default: m.CaseListView })));
const CaseDetailView = lazy(() => import('./features/cases/CaseDetailView.js').then(m => ({ default: m.CaseDetailView })));
const EvidenceGraphView = lazy(() => import('./features/graph/EvidenceGraphView.js').then(m => ({ default: m.EvidenceGraphView })));
const PrivacyCenterView = lazy(() => import('./features/privacy/PrivacyCenterView.js').then(m => ({ default: m.PrivacyCenterView })));
const SecurityCenterView = lazy(() => import('./features/security/SecurityCenterView.js').then(m => ({ default: m.SecurityCenterView })));
const LoginView = lazy(() => import('./features/auth/LoginView.js').then(m => ({ default: m.LoginView })));
const RegisterView = lazy(() => import('./features/auth/RegisterView.js').then(m => ({ default: m.RegisterView })));
const LandingView = lazy(() => import('./features/landing/LandingView.js').then(m => ({ default: m.LandingView })));

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center p-12 text-muted-foreground font-mono text-xs gap-2">
    <Loader2 className="w-4 h-4 animate-spin text-primary" />
    <span>Loading view...</span>
  </div>
);

export const App: React.FC = () => {
  const { isAuthenticated, isLoading, fetchProfile } = useAuthStore();
  const { toasts, removeToast } = useUIStore();

  useEffect(() => {
    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-xs text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Initializing ResolveOS Workspace...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Toast Notification Stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`pointer-events-auto px-4 py-2.5 rounded-lg border text-xs shadow-lg font-sans transition-all cursor-pointer flex items-center gap-2 ${
              t.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-800'
                : t.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : t.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-800'
                : 'bg-card text-foreground border-border'
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/landing" element={<LandingView />} />
          <Route path="/showcase" element={<LandingView />} />

          <Route
            path="/login"
            element={!isAuthenticated ? <LoginView /> : <Navigate to="/" replace />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <RegisterView /> : <Navigate to="/" replace />}
          />

          {/* Root Route: If not logged in, show beautiful LandingView, otherwise AppLayout */}
          <Route
            path="/"
            element={isAuthenticated ? <AppLayout /> : <LandingView />}
          >
            <Route index element={<DashboardView />} />
            <Route path="cases" element={<CaseListView />} />
            <Route path="cases/new" element={<CaseListView />} />
            <Route path="cases/:caseId" element={<CaseDetailView />} />
            <Route path="workspaces/:workspaceId/cases/:caseId" element={<CaseDetailView />} />
            <Route path="network" element={<EvidenceGraphView />} />
            <Route path="privacy" element={<PrivacyCenterView />} />
            <Route path="security" element={<SecurityCenterView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};
