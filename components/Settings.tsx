'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Moon, Sun, LogOut, Bell, Cloud, Camera, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportContacts, importContacts, clearAll } from '@/lib/db';
import { compressImage } from '@/lib/avatar';
import type { AppSettings, UserProfile } from '@/lib/types';
import Avatar from './Avatar';
import UserQRModal from './UserQRModal';

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
  userProfile,
  onProfileChange,
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
  userProfile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
}) {
  const [clearStep, setClearStep] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      onProfileChange({ ...userProfile, photoUrl: dataUrl });
    } catch {
      // silently fail
    }
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

      {/* Profile */}
      <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        My Profile
      </h3>
      <div className="mb-6 space-y-3">
        {/* Avatar */}
        <div className="flex justify-center mb-1">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="relative group"
          >
            <Avatar name={userProfile.name || '?'} photoUrl={userProfile.photoUrl} size="lg" />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
              <Camera size={18} className="text-white" />
            </div>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {/* Profile fields */}
        <input
          type="text"
          value={userProfile.name}
          onChange={(e) => onProfileChange({ ...userProfile, name: e.target.value })}
          onBlur={() => onProfileChange(userProfile)}
          placeholder="Your name"
          className={`w-full px-3 py-2.5 rounded-lg text-sm outline-none border ${
            isDark
              ? 'bg-dark-card border-dark-border text-white placeholder:text-muted'
              : 'bg-white border-light-border text-dark-bg placeholder:text-muted'
          }`}
        />
        <input
          type="text"
          value={userProfile.role}
          onChange={(e) => onProfileChange({ ...userProfile, role: e.target.value })}
          placeholder="Role (optional)"
          className={`w-full px-3 py-2.5 rounded-lg text-sm outline-none border ${
            isDark
              ? 'bg-dark-card border-dark-border text-white placeholder:text-muted'
              : 'bg-white border-light-border text-dark-bg placeholder:text-muted'
          }`}
        />
        <input
          type="text"
          value={userProfile.company}
          onChange={(e) => onProfileChange({ ...userProfile, company: e.target.value })}
          placeholder="Company (optional)"
          className={`w-full px-3 py-2.5 rounded-lg text-sm outline-none border ${
            isDark
              ? 'bg-dark-card border-dark-border text-white placeholder:text-muted'
              : 'bg-white border-light-border text-dark-bg placeholder:text-muted'
          }`}
        />

        {/* My QR Code */}
        <button
          onClick={() => setShowQR(true)}
          className={`${btnClass} !text-accent`}
        >
          <QrCode size={18} className="text-accent" />
          <div>
            <span className="block">My QR Code</span>
            <span className="text-[11px] text-muted font-normal block mt-0.5">
              Let others scan to add you as a contact
            </span>
          </div>
        </button>

        {/* Account info + sign out */}
        {userEmail && (
          <div className={`${btnClass} cursor-default`}>
            <span className="text-muted text-xs truncate">{userEmail}</span>
          </div>
        )}
        {onLogout && (
          <button onClick={onLogout} className={`${btnClass} !text-red-400`}>
            <LogOut size={18} className="text-red-400" />
            <span>Sign out</span>
          </button>
        )}
      </div>

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

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <UserQRModal
            profile={userProfile}
            onClose={() => setShowQR(false)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
