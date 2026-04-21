'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Upload, Camera, Loader2, Check, X, Plus,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { saveContact } from '@/lib/db';
import type { Contact } from '@/lib/types';

interface ExtractedContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  linkedinUrl: string;
  company: string;
  role: string;
  notes: string;
  selected: boolean;
  expanded: boolean;
}

type Step = 'upload' | 'scanning' | 'review' | 'saving' | 'done';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data:...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotoScan({
  existingContacts,
  onComplete,
  onCancel,
  isDark,
}: {
  existingContacts: Contact[];
  onComplete: (count: number) => void;
  onCancel: () => void;
  isDark: boolean;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [images, setImages] = useState<File[]>([]);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; status: string }>({ current: 0, total: 0, status: '' });
  const [extracted, setExtracted] = useState<ExtractedContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const card = isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border';
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-1 focus:ring-accent/40 ${
    isDark ? 'bg-dark-card border-dark-border text-white placeholder-muted/50' : 'bg-white border-light-border text-zinc-900 placeholder-slate-400'
  }`;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (valid.length === 0) { setError('Please select image files (JPG, PNG, WEBP, HEIC).'); return; }
    setImages(valid);
    setError(null);
  };

  const handleScan = async () => {
    if (images.length === 0) return;
    setStep('scanning');
    setError(null);
    const all: ExtractedContact[] = [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      setScanProgress({ current: i + 1, total: images.length, status: `Scanning photo ${i + 1} of ${images.length}...` });
      try {
        const base64 = await fileToBase64(file);
        const mediaType = file.type || 'image/jpeg';
        const res = await fetch('/api/scan-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mediaType }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Scan failed');
        }
        const { contacts } = await res.json();
        for (const c of contacts) {
          all.push({ ...c, id: nanoid(), selected: true, expanded: false });
        }
      } catch (e) {
        setError(`Photo ${i + 1}: ${e instanceof Error ? e.message : 'Failed to scan'}`);
      }
    }

    if (all.length === 0 && !error) {
      setError('No contacts found in the photo(s). Try a clearer image.');
      setStep('upload');
      return;
    }

    setExtracted(all);
    setStep('review');
  };

  const toggle = (id: string, field: keyof ExtractedContact, value: unknown) =>
    setExtracted((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const removeContact = (id: string) =>
    setExtracted((prev) => prev.filter((c) => c.id !== id));

  const handleSave = async () => {
    setStep('saving');
    const existingNames = new Set(existingContacts.map((c) => c.name.toLowerCase().trim()));
    const toSave = extracted.filter((c) => c.selected && c.name.trim());
    let count = 0;
    const now = new Date().toISOString();

    for (const c of toSave) {
      if (existingNames.has(c.name.toLowerCase().trim())) continue;
      const contact: Contact = {
        id: nanoid(),
        name: c.name.trim(),
        role: c.role.trim(),
        company: c.company.trim(),
        university: '',
        classification: 'wider',
        howMet: '',
        whereMet: '',
        eventOrContext: '',
        dateMet: '',
        homeLocation: '',
        nationality: '',
        linkedinUrl: c.linkedinUrl.trim(),
        phones: c.phone?.trim() ? [{ id: 'scanned', label: 'personal' as const, number: c.phone.trim() }] : [],
        emails: c.email?.trim() ? [{ id: 'scanned', label: 'personal' as const, address: c.email.trim() }] : [],
        notes: c.notes.trim(),
        birthday: '',
        tags: [],
        photoUrl: '',
        reconnectIntervalWeeks: null,
        reconnectDate: '',
        lastContacted: '',
        interactions: [],
        education: [],
        jobs: [],
        plannedInteractions: [],
        reachOut: false,
        dateAdded: now,
        lastUpdated: now,
      };
      await saveContact(contact);
      count++;
    }

    setSavedCount(count);
    setStep('done');
  };

  const selectedCount = extracted.filter((c) => c.selected).length;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-zinc-900'}`}>
      <div className="mx-auto max-w-[480px] px-4 pb-20">

        {/* Header */}
        <div className="flex items-center gap-3 pt-5 pb-4">
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-accent/10 transition-colors">
            <ArrowLeft size={18} className="text-muted" />
          </button>
          <h1 className="font-[family-name:var(--font-outfit)] font-bold text-lg">Add Contacts with Photo Scan</h1>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Upload ── */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <p className="text-sm text-muted mb-4 leading-relaxed">
                Upload one or more photos of your contact list — handwritten notebook, business cards, or a printed sheet. Claude will extract the information and let you review before saving.
              </p>

              {/* Tips */}
              <div className={`rounded-xl border px-4 py-3.5 mb-5 space-y-1.5 ${isDark ? 'bg-dark-card border-dark-border' : 'bg-slate-50 border-slate-200'}`}>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">For best results</p>
                {[
                  'Good lighting and a steady shot — avoid blur or shadows over the text',
                  'Handwriting works, but printed or typed text gives the most accurate results',
                  'Multiple contacts per photo is fine — Claude extracts each one separately',
                  'Always review the extracted contacts before saving, as errors can occur',
                ].map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <span className="text-accent mt-0.5 shrink-0">·</span>
                    <p className="text-xs text-muted leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>

              {/* Drop zone */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full rounded-2xl border-2 border-dashed py-12 flex flex-col items-center gap-3 transition-colors ${
                  isDark ? 'border-dark-border hover:border-accent/40' : 'border-slate-200 hover:border-accent/40'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Camera size={22} className="text-accent" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-accent">Choose photos</p>
                  <p className="text-xs text-muted mt-0.5">JPG, PNG, WEBP, HEIC supported</p>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {/* Selected files */}
              {images.length > 0 && (
                <div className={`mt-4 rounded-xl border p-3 space-y-2 ${card}`}>
                  {images.map((img, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Camera size={14} className="text-accent" />
                      </div>
                      <span className="flex-1 truncate text-xs">{img.name}</span>
                      <button onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} className="text-muted hover:text-red-400">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-accent font-medium pt-1"
                  >
                    <Plus size={13} /> Add another photo
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-3 flex items-start gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                onClick={handleScan}
                disabled={images.length === 0}
                className="mt-5 w-full py-3 rounded-xl bg-accent text-dark-bg text-sm font-semibold font-[family-name:var(--font-outfit)] disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                Scan {images.length > 0 ? `${images.length} photo${images.length > 1 ? 's' : ''}` : 'photos'}
              </button>
            </motion.div>
          )}

          {/* ── Scanning ── */}
          {step === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center pt-24 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Loader2 size={28} className="text-accent animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-semibold">{scanProgress.status}</p>
                <p className="text-xs text-muted mt-1">Claude is reading the image — this takes a few seconds</p>
              </div>
              {scanProgress.total > 1 && (
                <div className="w-48 h-1.5 rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* ── Review ── */}
          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted">
                  Found <span className="font-semibold text-accent">{extracted.length}</span> contact{extracted.length !== 1 ? 's' : ''}. Review and edit before saving.
                </p>
                <button onClick={() => setStep('upload')} className="text-xs text-muted hover:text-accent transition-colors">
                  Rescan
                </button>
              </div>

              {error && (
                <div className="mb-3 flex items-start gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="space-y-2 mb-5">
                {extracted.map((c) => (
                  <div key={c.id} className={`rounded-xl border overflow-hidden ${card} ${!c.selected ? 'opacity-50' : ''}`}>
                    {/* Row header */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <button
                        onClick={() => toggle(c.id, 'selected', !c.selected)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          c.selected ? 'bg-accent border-accent' : isDark ? 'border-dark-border' : 'border-slate-300'
                        }`}
                      >
                        {c.selected && <Check size={10} strokeWidth={3} className="text-white" />}
                      </button>
                      <span className="flex-1 text-sm font-medium truncate">{c.name || <span className="text-muted italic">No name</span>}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => removeContact(c.id)} className="text-muted hover:text-red-400 transition-colors p-1">
                          <X size={13} />
                        </button>
                        <button onClick={() => toggle(c.id, 'expanded', !c.expanded)} className="text-muted hover:text-accent transition-colors p-1">
                          {c.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Collapsed preview */}
                    {!c.expanded && (c.role || c.company || c.email || c.phone) && (
                      <div className={`px-3 pb-2.5 border-t text-xs text-muted space-y-0.5 ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
                        {(c.role || c.company) && <p className="pt-2">{[c.role, c.company].filter(Boolean).join(' @ ')}</p>}
                        {c.email && <p>{c.email}</p>}
                        {c.phone && <p>{c.phone}</p>}
                      </div>
                    )}

                    {/* Expanded edit */}
                    {c.expanded && (
                      <div className={`px-3 pb-3 pt-2 border-t space-y-2 ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
                        {[
                          { label: 'Name', field: 'name' as const },
                          { label: 'Role', field: 'role' as const },
                          { label: 'Company', field: 'company' as const },
                          { label: 'Phone', field: 'phone' as const },
                          { label: 'Email', field: 'email' as const },
                          { label: 'LinkedIn', field: 'linkedinUrl' as const },
                          { label: 'Notes', field: 'notes' as const },
                        ].map(({ label, field }) => (
                          <div key={field}>
                            <p className="text-[10px] text-muted mb-1 uppercase tracking-wide font-semibold">{label}</p>
                            <input
                              type="text"
                              value={c[field] as string}
                              onChange={(e) => toggle(c.id, field, e.target.value)}
                              placeholder={label}
                              className={inputCls}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={selectedCount === 0}
                className="w-full py-3 rounded-xl bg-accent text-dark-bg text-sm font-semibold font-[family-name:var(--font-outfit)] disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                Save {selectedCount} contact{selectedCount !== 1 ? 's' : ''}
              </button>
            </motion.div>
          )}

          {/* ── Saving ── */}
          {step === 'saving' && (
            <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center pt-24 gap-4">
              <Loader2 size={28} className="text-accent animate-spin" />
              <p className="text-sm text-muted">Saving contacts...</p>
            </motion.div>
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center pt-24 gap-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Check size={28} className="text-accent" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-[family-name:var(--font-outfit)] font-bold text-lg">
                  {savedCount} contact{savedCount !== 1 ? 's' : ''} added
                </p>
                <p className="text-sm text-muted mt-1">
                  {selectedCount - savedCount > 0
                    ? `${selectedCount - savedCount} skipped (already in your list)`
                    : 'All contacts saved successfully'}
                </p>
              </div>
              <button
                onClick={() => onComplete(savedCount)}
                className="mt-2 px-8 py-3 rounded-xl bg-accent text-dark-bg text-sm font-semibold font-[family-name:var(--font-outfit)] active:scale-[0.98] transition-transform"
              >
                Done
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
