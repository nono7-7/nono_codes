'use client';

import { useState } from 'react';
import { Download, Upload, Trash2, Moon, Sun, LogOut, User, Bell, FileSpreadsheet, Cloud } from 'lucide-react';
import { motion } from 'framer-motion';
import { exportContacts, importContacts, importContactsFromCSV, clearAll } from '@/lib/db';
import type { AppSettings } from '@/lib/types';

export default function Settings({
  isDark,
  onToggleTheme,
  onImportComplete,
  onClearComplete,
  showToast,
  onLogout,
  userEmail,
  appSettings,
  onSettingsChange,
}: {
  isDark: boolean;
  onToggleTheme: () => void;
  onImportComplete: () => void;
  onClearComplete: () => void;
  showToast: (msg: string) => void;
  onLogout?: () => void;
  userEmail?: string;
  appSettings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  const [clearStep, setClearStep] = useState(0);

  const handleExport = async () => {
    const json = await exportContacts();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intouch-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Contacts exported');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = await importContacts(text);
        onImportComplete();
        showToast(`${count} contact${count !== 1 ? 's' : ''} imported`);
      } catch {
        showToast('Invalid file format');
      }
    };
    input.click();
  };

  const handleCSVImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = await importContactsFromCSV(text);
        onImportComplete();
        showToast(`${count} contact${count !== 1 ? 's' : ''} imported from LinkedIn`);
      } catch {
        showToast('Invalid CSV format');
      }
    };
    input.click();
  };

  const handleClear = async () => {
    if (clearStep === 0) {
      setClearStep(1);
      setTimeout(() => setClearStep(0), 5000);
    } else if (clearStep === 1) {
      setClearStep(2);
      setTimeout(() => setClearStep(0), 5000);
    } else {
      await clearAll();
      setClearStep(0);
      onClearComplete();
      showToast('All data cleared');
    }
  };

  const clearLabels = [
    'Clear all data',
    'Are you sure?',
    'This cannot be undone. Delete everything?',
  ];

  const btnClass = `w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium text-left transition-colors ${
    isDark ? 'bg-dark-card hover:bg-dark-border' : 'bg-light-card border border-light-border hover:bg-light-border'
  }`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="pt-4 px-4 pb-4"
    >
      <h1 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight mb-6">
        Settings
      </h1>

      {/* Account */}
      {userEmail && (
        <>
          <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Account
          </h3>
          <div className="space-y-2 mb-6">
            <div className={`${btnClass} cursor-default`}>
              <User size={18} className="text-muted" />
              <span className="truncate">{userEmail}</span>
            </div>
            {onLogout && (
              <button onClick={onLogout} className={`${btnClass} !text-red-400`}>
                <LogOut size={18} className="text-red-400" />
                <span>Sign out</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Features */}
      <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        Features
      </h3>
      <div className="space-y-2 mb-6">
        <button
          onClick={() =>
            onSettingsChange({
              ...appSettings,
              reconnectRemindersEnabled: !appSettings.reconnectRemindersEnabled,
            })
          }
          className={btnClass}
        >
          <Bell size={18} className="text-muted" />
          <span className="flex-1">Reconnect reminders</span>
          <div
            className={`w-10 h-6 rounded-full relative transition-colors ${
              appSettings.reconnectRemindersEnabled ? 'bg-accent' : isDark ? 'bg-dark-border' : 'bg-light-border'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                appSettings.reconnectRemindersEnabled
                  ? 'left-5 bg-white'
                  : 'left-1 bg-muted'
              }`}
            />
          </div>
        </button>
        {userEmail && (
          <button
            onClick={() =>
              onSettingsChange({
                ...appSettings,
                cloudSyncEnabled: !appSettings.cloudSyncEnabled,
              })
            }
            className={btnClass}
          >
            <Cloud size={18} className="text-muted" />
            <div className="flex-1">
              <span className="block">Cloud sync</span>
              <span className="text-[11px] text-muted font-normal block mt-0.5">
                Sync contacts across your devices
              </span>
            </div>
            <div
              className={`w-10 h-6 rounded-full relative transition-colors ${
                appSettings.cloudSyncEnabled ? 'bg-accent' : isDark ? 'bg-dark-border' : 'bg-light-border'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                  appSettings.cloudSyncEnabled
                    ? 'left-5 bg-white'
                    : 'left-1 bg-muted'
                }`}
              />
            </div>
          </button>
        )}
      </div>

      {/* Theme */}
      <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        Appearance
      </h3>
      <button onClick={onToggleTheme} className={btnClass}>
        {isDark ? <Sun size={18} className="text-muted" /> : <Moon size={18} className="text-muted" />}
        <span>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
      </button>

      {/* Data */}
      <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-3 mt-6">
        Data Management
      </h3>
      <div className="space-y-2">
        <button onClick={handleExport} className={btnClass}>
          <Download size={18} className="text-muted" />
          <span>Export contacts</span>
        </button>
        <button onClick={handleImport} className={btnClass}>
          <Upload size={18} className="text-muted" />
          <span>Import contacts (JSON)</span>
        </button>
        <button onClick={handleCSVImport} className={btnClass}>
          <FileSpreadsheet size={18} className="text-accent" />
          <div>
            <span className="block">Import from LinkedIn</span>
            <span className="text-[11px] text-muted font-normal block mt-0.5">
              Settings → Data Privacy → Get a copy of your data
            </span>
          </div>
        </button>
        <button
          onClick={handleClear}
          className={`${btnClass} ${clearStep > 0 ? '!text-red-400 !border-red-500/20' : ''}`}
        >
          <Trash2 size={18} className={clearStep > 0 ? 'text-red-400' : 'text-muted'} />
          <span>{clearLabels[clearStep]}</span>
        </button>
      </div>

      {/* About */}
      <div className="mt-10 text-center">
        <p className="font-[family-name:var(--font-outfit)] text-sm font-semibold">InTouch v2.0</p>
        <p className="text-xs text-muted mt-1">Built for networkers, by a networker.</p>
        <p className="text-[11px] text-muted/60 mt-3">
          {appSettings.cloudSyncEnabled
            ? 'Contacts synced to the cloud via your account.'
            : 'All data stored locally on your device. Nothing is ever uploaded.'}
        </p>
      </div>
    </motion.div>
  );
}
