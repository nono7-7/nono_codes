'use client';

import { useState, useRef } from 'react';
import { X, Upload, Smartphone, Globe, Check, AlertTriangle, ArrowLeft, Users, GitMerge, Plus, SkipForward } from 'lucide-react';
import { parseVCardFile } from '@/lib/import/vcardParser';
import { saveContact, getAllContacts } from '@/lib/db';
import type { Contact } from '@/lib/types';

type Step = 'instructions' | 'merges' | 'preview' | 'saving' | 'done';

type MergeCandidate = {
  incomingIndex: number;
  incoming: Contact;
  existing: Contact;
  fieldsToAdd: string[];
  decision: 'merge' | 'skip' | null;
};

// ── Name matching ────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function nameTokens(name: string): string[] {
  return normalizeName(name).split(/\s+/).filter(Boolean);
}

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  // Token overlap: all words in the shorter name appear in the longer
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (shorter.length === 0) return false;
  return shorter.every((token) => longer.includes(token));
}

function normalizePhone(p: string): string {
  return p.replace(/\D/g, '');
}

// ── Fields to add ────────────────────────────────────────────────────

function computeFieldsToAdd(incoming: Contact, existing: Contact): string[] {
  const fields: string[] = [];

  const existingPhoneNums = new Set(
    (existing.phones ?? []).map((p) => normalizePhone(p.number))
  );
  const newPhones = (incoming.phones ?? []).filter(
    (p) => p.number && !existingPhoneNums.has(normalizePhone(p.number))
  );
  if (newPhones.length > 0)
    fields.push(`${newPhones.length} phone${newPhones.length > 1 ? 's' : ''}`);

  const existingEmailAddrs = new Set(
    (existing.emails ?? []).map((e) => e.address.toLowerCase())
  );
  const newEmails = (incoming.emails ?? []).filter(
    (e) => e.address && !existingEmailAddrs.has(e.address.toLowerCase())
  );
  if (newEmails.length > 0)
    fields.push(`${newEmails.length} email${newEmails.length > 1 ? 's' : ''}`);

  if (!existing.company && incoming.company) fields.push('company');
  if (!existing.homeLocation && incoming.homeLocation) fields.push('location');
  if (!existing.birthday && incoming.birthday) fields.push('birthday');
  if (!existing.notes && incoming.notes) fields.push('notes');

  return fields;
}

// ── Merge apply ──────────────────────────────────────────────────────

function applyMerge(existing: Contact, incoming: Contact): Contact {
  const existingPhoneNums = new Set(
    (existing.phones ?? []).map((p) => normalizePhone(p.number))
  );
  const newPhones = (incoming.phones ?? []).filter(
    (p) => p.number && !existingPhoneNums.has(normalizePhone(p.number))
  );

  const existingEmailAddrs = new Set(
    (existing.emails ?? []).map((e) => e.address.toLowerCase())
  );
  const newEmails = (incoming.emails ?? []).filter(
    (e) => e.address && !existingEmailAddrs.has(e.address.toLowerCase())
  );

  return {
    ...existing,
    phones: [...(existing.phones ?? []), ...newPhones],
    emails: [...(existing.emails ?? []), ...newEmails],
    company: existing.company || incoming.company || '',
    homeLocation: existing.homeLocation || incoming.homeLocation || '',
    birthday: existing.birthday || incoming.birthday || '',
    notes: existing.notes || incoming.notes || '',
    lastUpdated: new Date().toISOString(),
  };
}

// ── Component ────────────────────────────────────────────────────────

export default function VCardImport({
  isDark,
  onComplete,
  onCancel,
}: {
  isDark: boolean;
  onComplete: (count: number) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>('instructions');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [mergeCandidates, setMergeCandidates] = useState<MergeCandidate[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const card = isDark ? 'bg-dark-card border border-dark-border' : 'bg-white border border-light-border';
  const stepCard = isDark ? 'bg-dark-bg border border-dark-border' : 'bg-gray-50 border border-light-border';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';

  const handleFile = async (file: File) => {
    setError('');
    try {
      const parsed = await parseVCardFile(file);
      if (parsed.length === 0) {
        setError('No contacts found in this file. Make sure it is a valid .vcf file.');
        return;
      }

      const existing = await getAllContacts();

      // Build merge candidates and dupe indices
      const merges: MergeCandidate[] = [];
      const dupeIndices = new Set<number>();
      const mergedIndices = new Set<number>();

      parsed.forEach((incoming, i) => {
        // Find name match in existing contacts
        const match = existing.find((e) => namesMatch(e.name, incoming.name));
        if (!match) return;

        const fieldsToAdd = computeFieldsToAdd(incoming, match);

        if (fieldsToAdd.length === 0) {
          // Nothing new — treat as duplicate, skip
          dupeIndices.add(i);
        } else {
          // Has something useful to add — merge candidate
          merges.push({
            incomingIndex: i,
            incoming,
            existing: match,
            fieldsToAdd,
            decision: null,
          });
          mergedIndices.add(i);
        }
      });

      // Also skip exact name+phone duplicates for non-merge contacts
      const existingKeys = new Set(
        existing.map((c) => `${c.name.toLowerCase()}|${c.phones?.[0]?.number ?? ''}`)
      );
      parsed.forEach((c, i) => {
        if (mergedIndices.has(i)) return;
        if (existingKeys.has(`${c.name.toLowerCase()}|${c.phones?.[0]?.number ?? ''}`)) {
          dupeIndices.add(i);
        }
      });

      setContacts(parsed);
      setSkipped(dupeIndices);
      setMergeCandidates(merges);
      setStep(merges.length > 0 ? 'merges' : 'preview');
    } catch {
      setError('Could not read file. Make sure it is a valid .vcf vCard file.');
    }
  };

  const toggleSkip = (i: number) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const setMergeDecision = (incomingIndex: number, decision: 'merge' | 'skip') => {
    setMergeCandidates((prev) =>
      prev.map((m) => (m.incomingIndex === incomingIndex ? { ...m, decision } : m))
    );
  };

  const proceedToPreview = () => {
    // Mark all merge candidate indices as skipped in the normal import
    // (they'll be handled separately via merge logic)
    setSkipped((prev) => {
      const next = new Set(prev);
      mergeCandidates.forEach((m) => next.add(m.incomingIndex));
      return next;
    });
    setStep('preview');
  };

  const handleSave = async () => {
    setStep('saving');
    let count = 0;

    // Apply confirmed merges first
    for (const m of mergeCandidates) {
      if (m.decision === 'merge') {
        const merged = applyMerge(m.existing, m.incoming);
        await saveContact(merged);
        count++;
      }
    }

    // Import new contacts (non-skipped, non-merge-candidate)
    for (let i = 0; i < contacts.length; i++) {
      if (skipped.has(i)) continue;
      await saveContact(contacts[i]);
      count++;
    }

    setStep('done');
    setTimeout(() => onComplete(count), 800);
  };

  // Counts for preview
  const mergeIndices = new Set(mergeCandidates.map((m) => m.incomingIndex));
  const newContacts = contacts.filter((_, i) => !skipped.has(i) && !mergeIndices.has(i));
  const readyCount = newContacts.length;
  const pendingMerges = mergeCandidates.filter((m) => m.decision === null).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
        <button
          type="button"
          onClick={step === 'preview' && mergeCandidates.length > 0 ? () => setStep('merges') : onCancel}
          className={`p-1 ${muted}`}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold text-base flex-1">
          {step === 'merges' ? 'Possible Matches' : 'Import Phone Contacts'}
        </h2>
        <button type="button" onClick={onCancel} className={`p-1 ${muted}`}>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Instructions */}
        {step === 'instructions' && (
          <>
            <p className={`text-sm leading-relaxed ${muted}`}>
              Import contacts from your phone using a vCard (.vcf) file. Follow the steps below for your device.
            </p>

            {/* iPhone */}
            <div className={`rounded-xl p-4 ${stepCard}`}>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone size={16} className="text-accent" />
                <p className="text-sm font-semibold">iPhone</p>
              </div>
              <p className={`text-xs font-semibold mb-1.5 text-accent`}>Option A — Mac or PC (recommended)</p>
              <div className={`rounded-lg p-3 space-y-2.5 text-[13px] mb-3 ${card}`}>
                {[
                  'On a Mac or PC, open iCloud.com and sign in. Click Contacts.',
                  'Select the contacts you want. Hold Cmd (Mac) or Ctrl (Windows) to select multiple.',
                  'Click the share/export button (↑ icon) → Export vCard. A .vcf file will download.',
                  'Open InTouch on that same computer and tap Choose .vcf file below.',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                    <p dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </div>
                ))}
              </div>
              <p className={`text-xs font-semibold mb-1.5 text-accent`}>Option B — iPhone only (one at a time)</p>
              <div className={`rounded-lg px-3 py-2.5 text-[13px] ${card}`}>
                <p>Go to <strong>Contacts app</strong> → tap a contact → <strong>Share Contact</strong> → <strong>Save to Files</strong>. Upload here one by one.</p>
              </div>
            </div>

            {/* Android */}
            <div className={`rounded-xl p-4 ${stepCard}`}>
              <div className="flex items-center gap-2 mb-3">
                <Globe size={16} className="text-accent" />
                <p className="text-sm font-semibold">Android</p>
              </div>
              <div className={`rounded-lg p-3 space-y-2.5 text-[13px] ${card}`}>
                {[
                  'Open the Contacts app on your Android phone.',
                  'Tap the three-dot menu (⋮) → Select contacts. Tick the ones you want.',
                  'Tap the menu again → Export to .vcf (or Share → save to Files).',
                  'Come back here and tap Choose .vcf file below.',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
              <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${muted} ${isDark ? 'bg-dark-card' : 'bg-white'} border ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
                <strong>Google Contacts</strong> — on <strong>contacts.google.com</strong>, select contacts → <strong>Export</strong> → choose <strong>vCard (.vcf)</strong>.
              </div>
            </div>

            <p className={`text-[11px] text-center ${muted}`}>
              Fields imported: name, phone, email, company, job title, birthday, address, notes.
            </p>
          </>
        )}

        {/* Merge review */}
        {step === 'merges' && (
          <>
            <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
              <GitMerge size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                These contacts already exist in InTouch but your phone has extra details for them. Choose what to do with each one.
              </p>
            </div>

            <div className="space-y-3">
              {mergeCandidates.map((m) => (
                <div
                  key={m.incomingIndex}
                  className={`rounded-xl border overflow-hidden ${
                    m.decision === 'merge'
                      ? isDark ? 'border-teal-500/40 bg-teal-500/5' : 'border-teal-400/40 bg-teal-50/50'
                      : m.decision === 'skip'
                      ? isDark ? 'border-dark-border bg-dark-bg opacity-50' : 'border-light-border bg-gray-50 opacity-50'
                      : isDark ? 'border-dark-border bg-dark-card' : 'border-light-border bg-white'
                  }`}
                >
                  {/* Contact name row */}
                  <div className="px-4 pt-3 pb-2">
                    <p className="font-semibold text-sm">{m.existing.name}</p>
                    <p className={`text-[11px] mt-0.5 ${muted}`}>
                      {[m.existing.company, m.existing.phones?.[0]?.number].filter(Boolean).join(' · ') || 'No details yet'}
                    </p>
                  </div>

                  {/* Fields to add */}
                  <div className={`px-4 pb-3 flex flex-wrap gap-1.5`}>
                    {m.fieldsToAdd.map((f) => (
                      <span
                        key={f}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          isDark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-100 text-teal-700'
                        }`}
                      >
                        <Plus size={9} strokeWidth={3} />
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Decision buttons */}
                  <div className={`flex border-t ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
                    <button
                      type="button"
                      onClick={() => setMergeDecision(m.incomingIndex, 'skip')}
                      className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-r ${
                        isDark ? 'border-dark-border' : 'border-light-border'
                      } ${
                        m.decision === 'skip'
                          ? isDark ? 'text-gray-400' : 'text-gray-500'
                          : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <SkipForward size={12} />
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={() => setMergeDecision(m.incomingIndex, 'merge')}
                      className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        m.decision === 'merge'
                          ? 'text-teal-500'
                          : isDark ? 'text-gray-400 hover:text-teal-400' : 'text-gray-500 hover:text-teal-600'
                      }`}
                    >
                      <GitMerge size={12} />
                      Merge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Preview */}
        {step === 'preview' && (
          <>
            {/* Summary pills */}
            <div className="flex flex-wrap gap-2 mb-1">
              {mergeCandidates.filter((m) => m.decision === 'merge').length > 0 && (
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${isDark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>
                  🔀 {mergeCandidates.filter((m) => m.decision === 'merge').length} merge{mergeCandidates.filter((m) => m.decision === 'merge').length !== 1 ? 's' : ''}
                </span>
              )}
              {readyCount > 0 && (
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${isDark ? 'bg-accent/15 text-accent' : 'bg-accent/10 text-accent'}`}>
                  ✅ {readyCount} new
                </span>
              )}
              {skipped.size > 0 && (
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${isDark ? 'bg-dark-border text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  ⏭ {skipped.size} skipped
                </span>
              )}
            </div>
            <p className={`text-xs mb-3 ${muted}`}>Tap a contact to skip/include it.</p>

            <div className="space-y-1.5">
              {contacts.map((c, i) => {
                if (mergeIndices.has(i)) return null; // merges handled separately
                const isSkipped = skipped.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSkip(i)}
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
                      <p className="text-sm font-medium truncate">{c.name || '(no name)'}</p>
                      <p className={`text-[11px] truncate ${muted}`}>
                        {[c.phones?.[0]?.number, c.emails?.[0]?.address, c.company].filter(Boolean).join(' · ') || 'No details'}
                      </p>
                    </div>
                    {isSkipped && <span className={`text-[10px] flex-shrink-0 ${muted}`}>skip</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Saving */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${muted}`}>Saving contacts…</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center">
              <Check size={24} className="text-green-500" />
            </div>
            <p className="text-sm font-medium">Import complete</p>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      {(step === 'instructions' || step === 'merges' || step === 'preview') && (
        <div className={`px-4 pt-3 pb-6 border-t ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
          {step === 'instructions' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".vcf,text/vcard"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm mb-2">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/15 border border-accent/30 text-accent text-sm font-semibold active:scale-[0.98] transition-all"
              >
                <Upload size={18} />
                Choose .vcf file
              </button>
            </>
          )}

          {step === 'merges' && (
            <button
              type="button"
              onClick={proceedToPreview}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                pendingMerges > 0
                  ? 'bg-amber-500/15 border border-amber-400/30 text-amber-600 active:scale-[0.98]'
                  : 'bg-accent/15 border border-accent/30 text-accent active:scale-[0.98]'
              }`}
            >
              {pendingMerges > 0
                ? `Continue (${pendingMerges} undecided)`
                : 'Continue →'}
            </button>
          )}

          {step === 'preview' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={readyCount === 0 && mergeCandidates.filter((m) => m.decision === 'merge').length === 0}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                readyCount === 0 && mergeCandidates.filter((m) => m.decision === 'merge').length === 0
                  ? 'opacity-40 bg-accent/10 border border-accent/20 text-accent cursor-not-allowed'
                  : 'bg-accent/15 border border-accent/30 text-accent active:scale-[0.98]'
              }`}
            >
              {(() => {
                const mergeCount = mergeCandidates.filter((m) => m.decision === 'merge').length;
                const parts = [];
                if (mergeCount > 0) parts.push(`merge ${mergeCount}`);
                if (readyCount > 0) parts.push(`import ${readyCount}`);
                return parts.length > 0 ? parts.join(' · ') : 'Nothing to import';
              })()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
