/**
 * Offline-First Mutation Queue & State Synchronizer
 */

export interface QueuedMutation {
  id: string;
  endpoint: string;
  method: string;
  body?: any;
  timestamp: number;
}

export type SyncStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'CONFLICT';

export class OfflineSyncManager {
  private queue: QueuedMutation[] = [];
  private status: SyncStatus = navigator.onLine ? 'ONLINE' : 'OFFLINE';
  private listeners: Set<(status: SyncStatus, queueLength: number) => void> = new Set();

  constructor() {
    this.loadQueue();

    window.addEventListener('online', () => {
      this.status = 'ONLINE';
      this.notify();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.status = 'OFFLINE';
      this.notify();
    });
  }

  private loadQueue() {
    try {
      const raw = localStorage.getItem('resolveos_offline_queue');
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem('resolveos_offline_queue', JSON.stringify(this.queue));
    } catch (e) {
      console.warn('[OfflineSync] Failed to persist queue:', e);
    }
  }

  enqueueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) {
    const item: QueuedMutation = {
      ...mutation,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now()
    };
    this.queue.push(item);
    this.saveQueue();
    this.notify();
  }

  async processQueue() {
    if (!navigator.onLine || this.queue.length === 0) return;

    this.status = 'SYNCING';
    this.notify();

    const itemsToProcess = [...this.queue];
    const remaining: QueuedMutation[] = [];

    for (const item of itemsToProcess) {
      try {
        const token = localStorage.getItem('resolveos_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api${item.endpoint}`, {
          method: item.method,
          headers,
          body: item.body ? JSON.stringify(item.body) : undefined
        });

        if (res.status === 409) {
          // Conflict detected on server
          this.status = 'CONFLICT';
          remaining.push(item);
        } else if (!res.ok && res.status >= 500) {
          // Server error, keep in queue
          remaining.push(item);
        }
      } catch (err) {
        // Still network error, keep
        remaining.push(item);
      }
    }

    this.queue = remaining;
    this.saveQueue();
    this.status = this.queue.length === 0 ? 'ONLINE' : (this.status === 'CONFLICT' ? 'CONFLICT' : 'ONLINE');
    this.notify();
  }

  getStatus(): { status: SyncStatus; pendingCount: number } {
    return {
      status: this.status,
      pendingCount: this.queue.length
    };
  }

  subscribe(callback: (status: SyncStatus, queueLength: number) => void) {
    this.listeners.add(callback);
    callback(this.status, this.queue.length);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.status, this.queue.length));
  }
}

export const offlineSync = new OfflineSyncManager();
