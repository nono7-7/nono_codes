'use client';

import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export default function SyncIndicator({ status }: { status: SyncStatus }) {
  if (status === 'idle') {
    return <Cloud size={14} className="text-accent" />;
  }
  if (status === 'syncing') {
    return <RefreshCw size={14} className="text-accent animate-spin" />;
  }
  if (status === 'error') {
    return <CloudOff size={14} className="text-red-400" />;
  }
  if (status === 'offline') {
    return <CloudOff size={14} className="text-muted" />;
  }
  return null;
}
