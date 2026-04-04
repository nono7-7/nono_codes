'use client';

import { useState, useRef } from 'react';
import {
  Download, Upload, Trash2, Moon, Sun, LogOut, Bell, Cloud,
  Camera, QrCode, Plus, X, Star, Link2, Phone, Mail, MapPin, Cake, GraduationCap, Briefcase, FileSpreadsheet, AtSign, RefreshCw, CheckCircle, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportContacts, importContacts, clearAll } from '@/lib/db';
import { nanoid } from 'nanoid';
import type { AppSettings, UserProfile, Education, Job } from '@/lib/types';
import Avatar from './Avatar';
import UserQRModal from './UserQRModal';
import ImageCropModal from './ImageCropModal';

// Small inline toggle used for per-field QR sharing
function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`w-8 h-4 rounded-full relative flex-shrink-0 transition-colors ${on ? 'bg-accent' : 'bg-muted/30'}`}
    >
      <div
        className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${on ? 'left-4.5 bg-white' : 'left-0.5 bg-muted'}`}
      />
    </button>
  );
}

export default function Settings({
  isDark,
  onToggleTheme,
  onImportComplete,
  onBulkImport,
  onClearComplete,
  showToast,
  onLogout,
  userEmail,
  appSettings,
  onSettingsChange,
  userProfile,
  onProfileChange,
  onForceSync,
}: {
  isDark: boolean;
  onToggleTheme: () => void;
  onImportComplete: () => void;
  onBulkImport: () => void;
  onClearComplete: () => void;
  showToast: (msg: string) => void;
  onLogout?: () => void;
  userEmail?: string;
  appSettings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  userProfile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
  onForceSync?: () => Promise<void>;
}) {
  const [clearStep, setClearStep] = useState(0);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [showQR, setShowQR] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Photo ──────────────────────────────────────────────
  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const handleCropSave = (dataUrl: string) => {
    onProfileChange({ ...userProfile, photoUrl: dataUrl });
    setCropSrc(null);
  };

  // ── Education ──────────────────────────────────────────
  const addEducation = () => {
    const edu: Education = { id: nanoid(), university: '', program: '', gradYear: '', isPrimary: false };
    onProfileChange({ ...userProfile, education: [...userProfile.education, edu] });
  };

  const updateEducation = (id: string, patch: Partial<Education>) => {
    let education = userProfile.education.map((e) => (e.id === id ? { ...e, ...patch } : e));
    if (patch.isPrimary) education = education.map((e) => (e.id === id ? e : { ...e, isPrimary: false }));
    onProfileChange({ ...userProfile, education });
  };

  const removeEducation = (id: string) => {
    onProfileChange({ ...userProfile, education: userProfile.education.filter((e) => e.id !== id) });
  };

  // ── Jobs ───────────────────────────────────────────────
  const addJob = () => {
    const job: Job = { id: nanoid(), company: '', role: '', isCurrent: false };
    onProfileChange({ ...userProfile, jobs: [...userProfile.jobs, job] });
  };

  const updateJob = (id: string, patch: Partial<Job>) => {
    let jobs = userProfile.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j));
    // if marking isCurrent, unmark others
    if (patch.isCurrent) {
      jobs = jobs.map((j) => (j.id === id ? j : { ...j, isCurrent: false }));
    }
    onProfileChange({ ...userProfile, jobs });
  };

  const removeJob = (id: string) => {
    onProfileChange({ ...userProfile, jobs: userProfile.jobs.filter((j) => j.id !== id) });
  };

  // ── Data ───────────────────────────────────────────────
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

  const clearLabels = ['Clear all data', 'Are you sure?', 'This cannot be undone. Delete everything?'];

  const inputCls = `w-full px-3 py-2.5 rounded-lg text-sm outline-none border ${
    isDark
      ? 'bg-dark-card border-dark-border text-white placeholder:text-muted'
      : 'bg-white border-light-border text-dark-bg placeholder:text-muted'
  }`;

  const btnCls = `w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium text-left transition-colors ${
    isDark ? 'bg-dark-card hover:bg-dark-border' : 'bg-light-card border border-light-border hover:bg-light-border'
  }`;

  const sectionHeader = 'font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-3';

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="pt-4 px-4 pb-10"
      >
        <h1 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight mb-6">
          Settings
        </h1>

        {/* ── MY PROFILE ── */}
        <h3 className={sectionHeader}>My Profile</h3>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-5">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="relative group mb-4"
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
            onChange={handlePhotoFileSelect}
            className="hidden"
          />
          <input
            type="text"
            value={userProfile.name}
            onChange={(e) => onProfileChange({ ...userProfile, name: e.target.value })}
            placeholder="Your full name"
            className={`${inputCls} text-center text-base font-semibold`}
          />
        </div>

        {/* CONTACT INFO */}
        <h3 className={`${sectionHeader} mt-5`}>Contact Info</h3>
        <div className="space-y-2 mb-5">
          {[
            { icon: Phone, field: 'phone' as const, placeholder: 'Phone number', shareKey: 'sharePhone' as const, type: 'tel' },
            { icon: Mail, field: 'email' as const, placeholder: 'Contact email', shareKey: 'shareEmail' as const, type: 'email' },
            { icon: Link2, field: 'linkedinUrl' as const, placeholder: 'LinkedIn URL', shareKey: 'shareLinkedin' as const, type: 'url' },
          ].map(({ icon: Icon, field, placeholder, shareKey, type }) => (
            <div key={field} className="flex items-center gap-2">
              <Icon size={15} className="text-muted flex-shrink-0" />
              <input
                type={type}
                value={userProfile[field]}
                onChange={(e) => onProfileChange({ ...userProfile, [field]: e.target.value })}
                placeholder={placeholder}
                className={`${inputCls} flex-1`}
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-muted">QR</span>
                <Toggle
                  on={userProfile[shareKey]}
                  onChange={(v) => onProfileChange({ ...userProfile, [shareKey]: v })}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ABOUT */}
        <h3 className={`${sectionHeader} mt-5`}>About</h3>
        <div className="space-y-2 mb-5">
          {[
            { icon: MapPin, field: 'mainLocation' as const, placeholder: 'Main location (e.g. London)', shareKey: 'shareLocation' as const },
            { icon: Cake, field: 'birthday' as const, placeholder: 'Birthday (YYYY-MM-DD)', shareKey: 'shareBirthday' as const },
          ].map(({ icon: Icon, field, placeholder, shareKey }) => (
            <div key={field} className="flex items-center gap-2">
              <Icon size={15} className="text-muted flex-shrink-0" />
              <input
                type="text"
                value={userProfile[field]}
                onChange={(e) => onProfileChange({ ...userProfile, [field]: e.target.value })}
                placeholder={placeholder}
                className={`${inputCls} flex-1`}
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-muted">QR</span>
                <Toggle
                  on={userProfile[shareKey]}
                  onChange={(v) => onProfileChange({ ...userProfile, [shareKey]: v })}
                />
              </div>
            </div>
          ))}
        </div>

        {/* EDUCATION */}
        <div className="flex items-center justify-between mb-3 mt-5">
          <h3 className={`${sectionHeader} mb-0`}>Education</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted">QR</span>
            <Toggle
              on={userProfile.shareEducation}
              onChange={(v) => onProfileChange({ ...userProfile, shareEducation: v })}
            />
          </div>
        </div>
        <div className="space-y-2 mb-2">
          {userProfile.education.map((edu) => (
            <div
              key={edu.id}
              className={`rounded-lg p-3 border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}
            >
              <div className="flex items-start gap-2">
                <GraduationCap size={14} className="text-muted mt-2.5 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    value={edu.university}
                    onChange={(e) => updateEducation(edu.id, { university: e.target.value })}
                    placeholder="University"
                    className={`${inputCls} py-1.5 text-xs`}
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={edu.program}
                      onChange={(e) => updateEducation(edu.id, { program: e.target.value })}
                      placeholder="Programme"
                      className={`${inputCls} py-1.5 text-xs flex-1`}
                    />
                    <input
                      type="text"
                      value={edu.gradYear}
                      onChange={(e) => updateEducation(edu.id, { gradYear: e.target.value })}
                      placeholder="Year"
                      className={`${inputCls} py-1.5 text-xs w-16`}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeEducation(edu.id)}
                  className="text-muted hover:text-red-400 mt-1 flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addEducation}
          className={`flex items-center gap-2 text-xs text-accent font-medium py-2 mb-5`}
        >
          <Plus size={14} /> Add University
        </button>

        {/* WORK */}
        <div className="flex items-center justify-between mb-3 mt-2">
          <h3 className={`${sectionHeader} mb-0`}>Work</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted">QR</span>
            <Toggle
              on={userProfile.shareJobs}
              onChange={(v) => onProfileChange({ ...userProfile, shareJobs: v })}
            />
          </div>
        </div>
        <div className="space-y-2 mb-2">
          {userProfile.jobs.map((job) => (
            <div
              key={job.id}
              className={`rounded-lg p-3 border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}
            >
              <div className="flex items-start gap-2">
                <Briefcase size={14} className="text-muted mt-2.5 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={job.role}
                      onChange={(e) => updateJob(job.id, { role: e.target.value })}
                      placeholder="Role"
                      className={`${inputCls} py-1.5 text-xs flex-1`}
                    />
                    <input
                      type="text"
                      value={job.company}
                      onChange={(e) => updateJob(job.id, { company: e.target.value })}
                      placeholder="Company"
                      className={`${inputCls} py-1.5 text-xs flex-1`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateJob(job.id, { isCurrent: !job.isCurrent })}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      job.isCurrent ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    <Star size={11} fill={job.isCurrent ? 'currentColor' : 'none'} />
                    {job.isCurrent ? 'Current' : 'Mark as current'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeJob(job.id)}
                  className="text-muted hover:text-red-400 mt-1 flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addJob}
          className="flex items-center gap-2 text-xs text-accent font-medium py-2 mb-5"
        >
          <Plus size={14} /> Add Job
        </button>

        {/* MY QR CODE */}
        <button
          type="button"
          onClick={() => setShowQR(true)}
          className={`${btnCls} !text-accent mb-2`}
        >
          <QrCode size={18} className="text-accent" />
          <div>
            <span className="block">My QR Code</span>
            <span className="text-[11px] text-muted font-normal block mt-0.5">
              Let others scan to add you as a contact
            </span>
          </div>
        </button>

        {/* Account */}
        {userEmail && (
          <p className="font-[family-name:var(--font-outfit)] text-xs text-muted px-1 mb-2 mt-3">
            {userEmail}
          </p>
        )}
        {onLogout && (
          <button type="button" onClick={onLogout} className={`${btnCls} !text-red-400 mb-6`}>
            <LogOut size={18} className="text-red-400" />
            <span>Sign out</span>
          </button>
        )}

        {/* FEATURES */}
        <h3 className={`${sectionHeader} mt-2`}>Features</h3>
        <div className="space-y-2 mb-6">
          <button
            type="button"
            onClick={() => onSettingsChange({ ...appSettings, reconnectRemindersEnabled: !appSettings.reconnectRemindersEnabled })}
            className={btnCls}
          >
            <Bell size={18} className="text-muted" />
            <span className="flex-1">Reconnect reminders</span>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${appSettings.reconnectRemindersEnabled ? 'bg-accent' : isDark ? 'bg-dark-border' : 'bg-light-border'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${appSettings.reconnectRemindersEnabled ? 'left-5 bg-white' : 'left-1 bg-muted'}`} />
            </div>
          </button>
          {userEmail && (
            <button
              type="button"
              onClick={() => onSettingsChange({ ...appSettings, emailNotificationsEnabled: !appSettings.emailNotificationsEnabled })}
              className={btnCls}
            >
              <AtSign size={18} className="text-muted" />
              <div className="flex-1">
                <span className="block">Email reminders</span>
                <span className="text-[11px] text-muted font-normal block mt-0.5">
                  Get emailed 2 days before &amp; day of planned interactions
                </span>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${appSettings.emailNotificationsEnabled ? 'bg-accent' : isDark ? 'bg-dark-border' : 'bg-light-border'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${appSettings.emailNotificationsEnabled ? 'left-5 bg-white' : 'left-1 bg-muted'}`} />
              </div>
            </button>
          )}
          {userEmail && (
            <button
              type="button"
              onClick={() => onSettingsChange({ ...appSettings, cloudSyncEnabled: !appSettings.cloudSyncEnabled })}
              className={btnCls}
            >
              <Cloud size={18} className="text-muted" />
              <div className="flex-1">
                <span className="block">Cloud sync</span>
                <span className="text-[11px] text-muted font-normal block mt-0.5">Sync contacts across your devices</span>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-colors ${appSettings.cloudSyncEnabled ? 'bg-accent' : isDark ? 'bg-dark-border' : 'bg-light-border'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${appSettings.cloudSyncEnabled ? 'left-5 bg-white' : 'left-1 bg-muted'}`} />
              </div>
            </button>
          )}
          {userEmail && appSettings.cloudSyncEnabled && onForceSync && (
            <button
              type="button"
              onClick={async () => {
                setSyncState('syncing');
                try {
                  await onForceSync();
                  setSyncState('done');
                  showToast('Contacts synced to cloud');
                  setTimeout(() => setSyncState('idle'), 3000);
                } catch {
                  setSyncState('error');
                  showToast('Sync failed — check Firestore rules');
                  setTimeout(() => setSyncState('idle'), 4000);
                }
              }}
              disabled={syncState === 'syncing'}
              className={btnCls}
            >
              {syncState === 'syncing' && <RefreshCw size={18} className="text-accent animate-spin" />}
              {syncState === 'done' && <CheckCircle size={18} className="text-green-500" />}
              {syncState === 'error' && <AlertCircle size={18} className="text-red-400" />}
              {syncState === 'idle' && <RefreshCw size={18} className="text-accent" />}
              <div className="flex-1">
                <span className={`block ${syncState === 'error' ? 'text-red-400' : syncState === 'done' ? 'text-green-500' : 'text-accent'}`}>
                  {syncState === 'syncing' ? 'Syncing…' : syncState === 'done' ? 'Synced!' : syncState === 'error' ? 'Sync failed' : 'Sync now'}
                </span>
                <span className="text-[11px] text-muted font-normal block mt-0.5">
                  Tap when switching to a new device
                </span>
              </div>
            </button>
          )}
        </div>

        {/* APPEARANCE */}
        <h3 className={sectionHeader}>Appearance</h3>
        <button type="button" onClick={onToggleTheme} className={`${btnCls} mb-6`}>
          {isDark ? <Sun size={18} className="text-muted" /> : <Moon size={18} className="text-muted" />}
          <span>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
        </button>

        {/* DATA MANAGEMENT */}
        <h3 className={sectionHeader}>Data Management</h3>
        <div className="space-y-2">
          <button type="button" onClick={handleExport} className={btnCls}>
            <Download size={18} className="text-muted" />
            <span>Export contacts</span>
          </button>
          <button type="button" onClick={handleImport} className={btnCls}>
            <Upload size={18} className="text-muted" />
            <span>Import contacts (JSON)</span>
          </button>
          <button type="button" onClick={onBulkImport} className={btnCls}>
            <FileSpreadsheet size={18} className="text-accent" />
            <div>
              <span className="block">Bulk import (CSV / XLSX)</span>
              <span className="text-[11px] text-muted font-normal block mt-0.5">Import from spreadsheets with smart mapping</span>
            </div>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className={`${btnCls} ${clearStep > 0 ? '!text-red-400 !border-red-500/20' : ''}`}
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

      {/* Modals */}
      <AnimatePresence>
        {showQR && (
          <UserQRModal profile={userProfile} onClose={() => setShowQR(false)} isDark={isDark} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cropSrc && (
          <ImageCropModal
            imageSrc={cropSrc}
            onSave={handleCropSave}
            onCancel={() => setCropSrc(null)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </>
  );
}
