import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { APIClient } from '../../lib/api.js';
import { ConsentRecord } from '@resolveos/shared';
import {
  Shield,
  Download,
  Trash2,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  FileCode,
  AlertTriangle
} from 'lucide-react';

export const PrivacyCenterView: React.FC = () => {
  const { user, activeWorkspaceId, logout } = useAuthStore();
  const { addToast } = useUIStore();

  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [aiConsent, setAiConsent] = useState(false);
  const [loggingConsent, setLoggingConsent] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [exporting, setExporting] = useState(false);

  const loadConsents = async () => {
    try {
      const records = await APIClient.get<ConsentRecord[]>('/privacy/consent');
      setConsents(records || []);
      const aiRec = records.find(r => r.consentType === 'AI_PROCESSING');
      if (aiRec) setAiConsent(aiRec.status === 'GRANTED');
      const logRec = records.find(r => r.consentType === 'ERROR_LOGGING');
      if (logRec) setLoggingConsent(logRec.status === 'GRANTED');
    } catch (err) {
      console.error('Failed to load consents:', err);
    }
  };

  useEffect(() => {
    loadConsents();
  }, []);

  const handleToggleConsent = async (type: 'AI_PROCESSING' | 'ERROR_LOGGING', nextStatus: boolean) => {
    try {
      await APIClient.post('/privacy/consent', {
        consentType: type,
        status: nextStatus ? 'GRANTED' : 'WITHDRAWN',
        version: '1.0'
      });
      if (type === 'AI_PROCESSING') setAiConsent(nextStatus);
      if (type === 'ERROR_LOGGING') setLoggingConsent(nextStatus);
      addToast({ type: 'success', message: `Privacy consent for ${type} updated.` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  const handleExportData = async (format: 'JSON' | 'CSV') => {
    if (!activeWorkspaceId) return;
    try {
      setExporting(true);
      const data = await APIClient.post(`/privacy/export/${activeWorkspaceId}`, { format });

      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'CSV' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resolveos-export-${Date.now()}.${format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);

      addToast({ type: 'success', message: `Export generated in ${format} format.` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Export failed.' });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await APIClient.delete('/privacy/account', { password: deletePassword });
      addToast({ type: 'success', message: 'Account deleted and personal data anonymized.' });
      logout();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete account.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Privacy & Data Governance Center</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Zero third-party trackers. Explicit consent management and complete data ownership.
        </p>
      </div>

      {/* Consent Matrix */}
      <div className="p-6 rounded-xl bg-card border border-border space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span>Optional Processing & Consent</span>
        </h2>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border">
            <div className="space-y-1">
              <span className="text-sm font-semibold">Optional AI Assistant Processing</span>
              <p className="text-xs text-muted-foreground max-w-lg">
                Allows sending problem statements through PII redaction filters for automated hypothesis and root cause suggestions.
              </p>
            </div>
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={e => handleToggleConsent('AI_PROCESSING', e.target.checked)}
              className="w-4 h-4 rounded text-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border">
            <div className="space-y-1">
              <span className="text-sm font-semibold">Local Error & Diagnostic Logging</span>
              <p className="text-xs text-muted-foreground max-w-lg">
                Stores client-side crash telemetry locally in your browser's IndexedDB store without sending data to third parties.
              </p>
            </div>
            <input
              type="checkbox"
              checked={loggingConsent}
              onChange={e => handleToggleConsent('ERROR_LOGGING', e.target.checked)}
              className="w-4 h-4 rounded text-primary cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Data Ownership & Export */}
      <div className="p-6 rounded-xl bg-card border border-border space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          <span>Data Portability & Export</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Download all cases, evidence artifacts, decisions, and action items in structured, unencrypted formats.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => handleExportData('JSON')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <FileCode className="w-4 h-4" />
            <span>Export Complete Workspace (JSON)</span>
          </button>
          <button
            onClick={() => handleExportData('CSV')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/70 text-xs font-semibold border border-border transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Cases Index (CSV)</span>
          </button>
        </div>
      </div>

      {/* Irreversible Account Deletion */}
      <div className="p-6 rounded-xl bg-card border border-rose-500/30 bg-rose-500/5 space-y-4">
        <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          <span>Irreversible Account Deletion</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Permanently anonymizes your personal information and revokes all active authentication sessions.
        </p>
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors"
        >
          Request Account Deletion
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Account Deletion</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Please enter your password to confirm permanent deletion of your ResolveOS user account.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <input
                type="password"
                required
                placeholder="Enter current password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500"
                >
                  Permanently Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
