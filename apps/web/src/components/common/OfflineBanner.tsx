import React, { useEffect, useState } from 'react';
import { offlineSync, SyncStatus } from '../../lib/offlineSync.js';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [syncState, setSyncState] = useState<{ status: SyncStatus; pendingCount: number }>(offlineSync.getStatus());

  useEffect(() => {
    const unsub = offlineSync.subscribe((status, pendingCount) => {
      setSyncState({ status, pendingCount });
    });
    return () => {
      unsub();
    };
  }, []);

  if (syncState.status === 'ONLINE' && syncState.pendingCount === 0) {
    return null;
  }

  return (
    <div className={`w-full px-4 py-2 text-xs font-mono flex items-center justify-between transition-colors ${
      syncState.status === 'OFFLINE'
        ? 'bg-amber-950/80 text-amber-200 border-b border-amber-800/50'
        : syncState.status === 'SYNCING'
        ? 'bg-blue-950/80 text-blue-200 border-b border-blue-800/50'
        : syncState.status === 'CONFLICT'
        ? 'bg-rose-950/80 text-rose-200 border-b border-rose-800/50'
        : 'bg-emerald-950/80 text-emerald-200 border-b border-emerald-800/50'
    }`}>
      <div className="flex items-center gap-2">
        {syncState.status === 'OFFLINE' && <WifiOff className="w-3.5 h-3.5" />}
        {syncState.status === 'SYNCING' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
        {syncState.status === 'CONFLICT' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
        {syncState.status === 'ONLINE' && <Wifi className="w-3.5 h-3.5" />}
        
        <span className="font-semibold tracking-wider">
          {syncState.status === 'OFFLINE' && 'OFFLINE MODE'}
          {syncState.status === 'SYNCING' && 'SYNCHRONIZING MUTATIONS...'}
          {syncState.status === 'CONFLICT' && 'SYNC CONFLICT DETECTED'}
          {syncState.status === 'ONLINE' && 'ONLINE'}
        </span>
        <span className="text-muted-foreground ml-2">
          {syncState.pendingCount > 0 ? `(${syncState.pendingCount} local changes pending)` : 'All changes synchronized'}
        </span>
      </div>

      {syncState.pendingCount > 0 && syncState.status !== 'SYNCING' && (
        <button
          onClick={() => offlineSync.processQueue()}
          className="px-2 py-0.5 rounded bg-foreground/10 hover:bg-foreground/20 text-foreground text-[11px] uppercase tracking-wider font-semibold"
        >
          Sync Now
        </button>
      )}
    </div>
  );
};
