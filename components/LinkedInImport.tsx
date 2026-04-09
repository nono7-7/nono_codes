'use client';

import { useState, useRef } from 'react';
import { X, Upload, ArrowLeft, Check, AlertTriangle, RefreshCw, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseLinkedInFile, matchLinkedIn, linkedInToContact } from '@/lib/import/linkedinParser';
import { getAllContacts, saveContact } from '@/lib/db';
import type { Contact } from '@/lib/types';
import type { LinkedInUpdateResult } from '@/lib/import/linkedinParser';

type Step = 'instructions' | 'review' | 'saving' | 'done';

export default function LinkedInImport({
  isDark,
  onComplete,
  onCancel,
}: {
  isDark: boolean;
  onComplete: (updated: number, added: number) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>('instructions');
  const [result, setResult] = useState<LinkedInUpdateResult | null>(null);
  const [skippedNew, setSkippedNew] = useState<Set<number>>(new Set());
  const [showNewSection, setShowNewSection] = useState(true);
  const [showUpdateSection, setShowUpdateSection] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const card = isDark ? 'bg-dark-card border border-dark-border' : 'bg-white border border-light-border';
  const stepCard = isDark ? 'bg-dark-bg border border-dark-border' : 'bg-gray-50 border border-light-border';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';

  const handleFile = async (file: File) => {
    setError('');
    try {
      const contacts = await parseLinkedInFile(file);
      if (contacts.length === 0) {
        setError('No connections found. Make sure this is a LinkedIn Connections CSV.');
        return;
      }
      const existing = await getAllContacts();
      const matched = matchLinkedIn(contacts, existing);
      setResult(matched);
      setSkippedNew(new Set());
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read file. Make sure it is a LinkedIn Connections CSV.');
    }
  };

  const toggleNew = (i: number) => {
    setSkippedNew((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleSave = async () => {
    if (!result) return;
    setStep('saving');

    let updated = 0;
    let added = 0;

    // Apply ALL updates automatically (no per-item toggle for updates)
    for (const u of result.updates) {
      const updatedContact: Contact = { ...u.existing };
      for (const change of u.changes) {
        if (change.field === 'company') {
          updatedContact.company = change.to;
          if (updatedContact.jobs?.length) {
            const primaryIdx = updatedContact.jobs.findIndex((j) => j.isCurrent);
            if (primaryIdx >= 0) {
              updatedContact.jobs[primaryIdx] = { ...updatedContact.jobs[primaryIdx], company: change.to };
            }
          }
        }
        if (change.field === 'role') {
          updatedContact.role = change.to;
          if (updatedContact.jobs?.length) {
            const primaryIdx = updatedContact.jobs.findIndex((j) => j.isCurrent);
            if (primaryIdx >= 0) {
              updatedContact.jobs[primaryIdx] = { ...updatedContact.jobs[primaryIdx], role: change.to };
            }
          }
        }
      }
      updatedContact.lastUpdated = new Date().toISOString();
      await saveContact(updatedContact);
      updated++;
    }

    // Add selected new contacts
    for (let i = 0; i < result.newContacts.length; i++) {
      if (skippedNew.has(i)) continue;
      await saveContact(linkedInToContact(result.newContacts[i]));
      added++;
    }

    setStep('done');
    setTimeout(() => onComplete(updated, added), 800);
  };

  const readyNew = (result?.newContacts.length ?? 0) - skippedNew.size;
  const totalUpdates = result?.updates.length ?? 0;
  const hasAnything = totalUpdates > 0 || readyNew > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
        <button type="button" onClick={onCancel} className={`p-1 ${muted}`}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold text-base flex-1">LinkedIn Connections Import</h2>
        <button type="button" onClick={onCancel} className={`p-1 ${muted}`}>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Instructions ── */}
        {step === 'instructions' && (
          <>
            {/* What this does — two modes explained */}
            <div className="space-y-2.5">
              <div className={`rounded-xl p-3.5 ${stepCard}`}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <RefreshCw size={14} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-0.5">Network Refresh</p>
                    <p className={`text-[12px] leading-relaxed ${muted}`}>
                      For people <span className="font-medium">already in InTouch</span> — if their company or job title has changed on LinkedIn, InTouch updates it automatically. No review needed; changes are applied in one tap so your contacts always reflect where people actually work.
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl p-3.5 ${stepCard}`}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserPlus size={14} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-0.5">Connections Import</p>
                    <p className={`text-[12px] leading-relaxed ${muted}`}>
                      For LinkedIn connections <span className="font-medium">not yet in InTouch</span> — you see the full list and choose exactly who to add. Useful after a conference, a new job, or whenever you want to bring a batch of LinkedIn contacts into your network.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* How to export */}
            <div className={`rounded-xl p-4 ${stepCard}`}>
              <p className="text-xs font-bold text-accent uppercase tracking-wide mb-3">How to get your Connections.csv</p>
              <div className={`rounded-lg p-3 space-y-2.5 text-[13px] ${card}`}>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                  <p>Go to <strong>linkedin.com</strong> → click your profile picture → <strong>Settings &amp; Privacy</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <p>Click <strong>Data Privacy</strong> → <strong>Get a copy of your data</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <p>Select <strong>Connections</strong> only → click <strong>Request archive</strong>. LinkedIn emails you a link — usually within a few minutes.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
                  <p>Download the zip → open it → find <strong>Connections.csv</strong> → upload it below.</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm px-1">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}
          </>
        )}

        {/* ── Review ── */}
        {step === 'review' && result && (
          <>
            {/* Updates — auto-applied, shown as info */}
            {result.updates.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowUpdateSection((v) => !v)}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw size={15} className="text-accent" />
                    <p className="text-sm font-semibold">
                      {result.updates.length} contact{result.updates.length !== 1 ? 's' : ''} will be refreshed
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${muted}`}>auto</span>
                    {showUpdateSection ? <ChevronUp size={16} className={muted} /> : <ChevronDown size={16} className={muted} />}
                  </div>
                </button>
                <AnimatePresence>
                  {showUpdateSection && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      {result.updates.map((u) => (
                        <div
                          key={u.existing.id}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left ${
                            isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'
                          }`}
                        >
                          {/* Auto-apply indicator */}
                          <div className="w-5 h-5 rounded-full border-2 border-accent bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check size={11} strokeWidth={3} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.existing.name}</p>
                            {u.changes.map((c, i) => (
                              <p key={i} className={`text-[11px] ${muted} mt-0.5`}>
                                <span className="capitalize">{c.field}</span>:{' '}
                                <span className="line-through opacity-60">{c.from || '—'}</span>
                                {' → '}
                                <span className="text-accent font-medium">{c.to}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* New contacts — toggleable */}
            {result.newContacts.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowNewSection((v) => !v)}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus size={15} className="text-accent" />
                    <p className="text-sm font-semibold">
                      Add new connections ({result.newContacts.length - skippedNew.size}/{result.newContacts.length})
                    </p>
                  </div>
                  {showNewSection ? <ChevronUp size={16} className={muted} /> : <ChevronDown size={16} className={muted} />}
                </button>

                {/* Select all / Deselect all */}
                <AnimatePresence>
                  {showNewSection && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex justify-end mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (skippedNew.size === 0) {
                              // deselect all
                              setSkippedNew(new Set(result.newContacts.map((_, i) => i)));
                            } else {
                              // select all
                              setSkippedNew(new Set());
                            }
                          }}
                          className={`text-[11px] font-medium text-accent`}
                        >
                          {skippedNew.size === 0 ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {result.newContacts.map((c, i) => {
                          const isSkipped = skippedNew.has(i);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => toggleNew(i)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                                isSkipped
                                  ? isDark ? 'bg-dark-bg border-dark-border opacity-40' : 'bg-gray-50 border-light-border opacity-40'
                                  : isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSkipped
                                  ? isDark ? 'border-dark-border' : 'border-gray-300'
                                  : 'border-accent bg-accent'
                              }`}>
                                {!isSkipped && <Check size={11} strokeWidth={3} className="text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{c.name}</p>
                                <p className={`text-[11px] truncate ${muted}`}>
                                  {[c.company, c.role].filter(Boolean).join(' · ') || c.email || 'No details'}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {result.updates.length === 0 && result.newContacts.length === 0 && (
              <p className={`text-sm text-center py-8 ${muted}`}>
                No updates or new connections found.
              </p>
            )}
          </>
        )}

        {/* Saving */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${muted}`}>Saving…</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center">
              <Check size={24} className="text-green-500" />
            </div>
            <p className="text-sm font-medium">All done!</p>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      {(step === 'instructions' || step === 'review') && (
        <div className={`px-4 pt-3 pb-6 border-t ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
          {step === 'instructions' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/15 border border-accent/30 text-accent text-sm font-semibold active:scale-[0.98] transition-all"
              >
                <Upload size={18} />
                Upload Connections.csv
              </button>
            </>
          )}
          {step === 'review' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasAnything}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                !hasAnything
                  ? 'opacity-40 bg-accent/10 border border-accent/20 text-accent cursor-not-allowed'
                  : 'bg-accent/15 border border-accent/30 text-accent active:scale-[0.98]'
              }`}
            >
              {totalUpdates > 0 && readyNew > 0
                ? `Refresh ${totalUpdates} · Add ${readyNew}`
                : totalUpdates > 0
                ? `Refresh ${totalUpdates} contact${totalUpdates !== 1 ? 's' : ''}`
                : readyNew > 0
                ? `Add ${readyNew} contact${readyNew !== 1 ? 's' : ''}`
                : 'Nothing selected'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
