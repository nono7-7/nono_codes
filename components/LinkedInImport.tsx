'use client';

import { useState, useRef } from 'react';
import { X, Upload, ArrowLeft, Check, AlertTriangle, RefreshCw, UserPlus, ChevronDown, ChevronUp, Search } from 'lucide-react';
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
  const [skippedUpdates, setSkippedUpdates] = useState<Set<number>>(new Set());
  const [showNewSection, setShowNewSection] = useState(true);
  const [showUpdateSection, setShowUpdateSection] = useState(true);
  const [sortOrder, setSortOrder] = useState<'recent' | 'az'>('recent');
  const [search, setSearch] = useState('');
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

    // Apply selected updates
    for (let idx = 0; idx < result.updates.length; idx++) {
      if (skippedUpdates.has(idx)) continue;
      const u = result.updates[idx];
      // Unmark all existing jobs as no longer current, preserving history
      const previousJobs = (u.existing.jobs ?? []).map((j) =>
        j.isCurrent ? { ...j, isCurrent: false } : j
      );

      // Add the new LinkedIn position as the current job
      const newJob = {
        id: Math.random().toString(36).slice(2),
        company: u.linkedin.company,
        role: u.linkedin.role,
        isCurrent: true,
      };

      // Location logic: LinkedIn connections CSV does not include a location field,
      // so we never wipe a user-entered homeLocation. If a future LinkedIn export
      // ever provides location and it differs from the existing one, that would be
      // handled here — but for now we always preserve what the user entered.
      const linkedinLocation = (u.linkedin as { location?: string }).location?.trim() ?? '';
      const existingLocation = u.existing.homeLocation?.trim() ?? '';
      const resolvedLocation =
        linkedinLocation && linkedinLocation.toLowerCase() !== existingLocation.toLowerCase()
          ? linkedinLocation   // LinkedIn has a different location → use it
          : existingLocation;  // No LinkedIn location, or same → keep existing

      const updatedContact: Contact = {
        ...u.existing,
        // Update top-level fields with whatever LinkedIn has for this change
        company: u.changes.find(c => c.field === 'company')?.to ?? u.existing.company,
        role: u.changes.find(c => c.field === 'role')?.to ?? u.existing.role,
        jobs: [...previousJobs, newJob],
        homeLocation: resolvedLocation,
      };
      // Backfill LinkedIn URL if not already set
      if (!updatedContact.linkedinUrl && u.linkedin.linkedinUrl) {
        updatedContact.linkedinUrl = u.linkedin.linkedinUrl;
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
  const readyUpdates = (result?.updates.length ?? 0) - skippedUpdates.size;
  const hasAnything = readyUpdates > 0 || readyNew > 0;

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
                  <p>On <strong>linkedin.com</strong>, click your profile picture → <strong>Settings &amp; Privacy</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <p>Go to <strong>Data Privacy → Get a copy of your data</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <p>Select <strong>"Larger data archive"</strong> (first option) and click <strong>Request archive</strong>. LinkedIn emails you a download link — usually within a few hours.</p>
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
            {/* Updates — toggleable per-item, all selected by default */}
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
                      Refresh contacts ({readyUpdates}/{result.updates.length})
                    </p>
                  </div>
                  {showUpdateSection ? <ChevronUp size={16} className={muted} /> : <ChevronDown size={16} className={muted} />}
                </button>
                <AnimatePresence>
                  {showUpdateSection && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {/* Select all / Deselect all */}
                      <div className="flex justify-end mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (skippedUpdates.size === 0) {
                              setSkippedUpdates(new Set(result.updates.map((_, i) => i)));
                            } else {
                              setSkippedUpdates(new Set());
                            }
                          }}
                          className="text-[11px] font-medium text-accent"
                        >
                          {skippedUpdates.size === 0 ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {result.updates.map((u, idx) => {
                          const isSkipped = skippedUpdates.has(idx);
                          return (
                            <button
                              key={u.existing.id}
                              type="button"
                              onClick={() => setSkippedUpdates((prev) => {
                                const next = new Set(prev);
                                if (next.has(idx)) next.delete(idx); else next.add(idx);
                                return next;
                              })}
                              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                                isSkipped
                                  ? isDark ? 'bg-dark-bg border-dark-border opacity-40' : 'bg-gray-50 border-light-border opacity-40'
                                  : isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                                isSkipped
                                  ? isDark ? 'border-dark-border' : 'border-gray-300'
                                  : 'border-accent bg-accent'
                              }`}>
                                {!isSkipped && <Check size={11} strokeWidth={3} className="text-white" />}
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
                            </button>
                          );
                        })}
                      </div>
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

                <AnimatePresence>
                  {showNewSection && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {/* Search bar */}
                      <div className={`relative mb-2`}>
                        <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search by name..."
                          className={`w-full pl-8 pr-8 py-2 rounded-lg text-sm outline-none border ${
                            isDark
                              ? 'bg-dark-card border-dark-border text-white placeholder:text-muted'
                              : 'bg-white border-light-border text-dark-bg placeholder:text-muted'
                          }`}
                        />
                        {search && (
                          <button
                            type="button"
                            onClick={() => setSearch('')}
                            className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${muted}`}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Sort + Select all row — hidden when searching */}
                      {!search && (
                        <div className="flex items-center justify-between mb-2">
                          <div className={`flex rounded-lg overflow-hidden border text-[11px] font-medium ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
                            {(['recent', 'az'] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSortOrder(s)}
                                className={`px-2.5 py-1 transition-colors ${
                                  sortOrder === s
                                    ? 'bg-accent text-dark-bg'
                                    : isDark ? 'bg-dark-card text-muted' : 'bg-white text-muted'
                                }`}
                              >
                                {s === 'recent' ? 'Most Recent' : 'A – Z'}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (skippedNew.size === 0) {
                                setSkippedNew(new Set(result.newContacts.map((_, i) => i)));
                              } else {
                                setSkippedNew(new Set());
                              }
                            }}
                            className="text-[11px] font-medium text-accent"
                          >
                            {skippedNew.size === 0 ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        {[...result.newContacts.map((c, i) => ({ c, i }))]
                          .filter(({ c }) =>
                            !search || c.name.toLowerCase().includes(search.toLowerCase())
                          )
                          .sort((a, b) => {
                            if (search) return a.c.name.localeCompare(b.c.name);
                            if (sortOrder === 'az') return a.c.name.localeCompare(b.c.name);
                            const parseDate = (d: string) => d ? new Date(d).getTime() : 0;
                            return parseDate(b.c.connectedOn) - parseDate(a.c.connectedOn);
                          })
                          .map(({ c, i }) => {
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
                        {search && result.newContacts.filter(c =>
                          c.name.toLowerCase().includes(search.toLowerCase())
                        ).length === 0 && (
                          <p className={`text-sm text-center py-6 ${muted}`}>No results for &ldquo;{search}&rdquo;</p>
                        )}
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
              {readyUpdates > 0 && readyNew > 0
                ? `Refresh ${readyUpdates} · Add ${readyNew}`
                : readyUpdates > 0
                ? `Refresh ${readyUpdates} contact${readyUpdates !== 1 ? 's' : ''}`
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
