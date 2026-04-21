'use client';

import { useState, useRef } from 'react';
import { X, Upload, Smartphone, Globe, Check, AlertTriangle, ArrowLeft, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseVCardFile } from '@/lib/import/vcardParser';
import { saveContact, getAllContacts } from '@/lib/db';
import type { Contact } from '@/lib/types';

type Step = 'instructions' | 'preview' | 'saving' | 'done';

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
  const [saving, setSaving] = useState(false);
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
      // Deduplicate against existing contacts by name+phone
      const existing = await getAllContacts();
      const existingKeys = new Set(
        existing.map((c) => `${c.name.toLowerCase()}|${c.phones?.[0]?.number ?? ''}`)
      );
      const dupeIndices = new Set<number>();
      parsed.forEach((c, i) => {
        if (existingKeys.has(`${c.name.toLowerCase()}|${c.phones?.[0]?.number ?? ''}`)) {
          dupeIndices.add(i);
        }
      });
      setContacts(parsed);
      setSkipped(dupeIndices);
      setStep('preview');
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

  const handleSave = async () => {
    setSaving(true);
    setStep('saving');
    let count = 0;
    for (let i = 0; i < contacts.length; i++) {
      if (skipped.has(i)) continue;
      await saveContact(contacts[i]);
      count++;
    }
    setSaving(false);
    setStep('done');
    setTimeout(() => onComplete(count), 800);
  };

  const readyCount = contacts.length - skipped.size;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
        <button type="button" onClick={onCancel} className={`p-1 ${muted}`}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold text-base flex-1">Import Phone Contacts</h2>
        <button type="button" onClick={onCancel} className={`p-1 ${muted}`}>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Instructions step */}
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

              {/* Option A: Mac/PC */}
              <p className={`text-xs font-semibold mb-1.5 text-accent`}>Option A — Mac or PC (recommended, select specific contacts)</p>
              <div className={`rounded-lg p-3 space-y-2.5 text-[13px] mb-3 ${card}`}>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                  <p>On a <strong>Mac or PC</strong>, open <strong>iCloud.com</strong> in a browser and sign in with your Apple ID. Click <strong>Contacts</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <p>Select the contacts you want. Hold <strong>Cmd</strong> (Mac) or <strong>Ctrl</strong> (Windows) while clicking to select multiple. Click the first, then Ctrl+click each additional one.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <p>Click the <strong>share/export button</strong> (↑ icon) at the top right → <strong>Export vCard</strong>. A .vcf file will download.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
                  <p>Open InTouch on that same computer, come back here and tap <strong>Choose .vcf file</strong> to upload it.</p>
                </div>
              </div>

              {/* Option B: iPhone only */}
              <p className={`text-xs font-semibold mb-1.5 text-accent`}>Option B — iPhone only (one contact at a time)</p>
              <div className={`rounded-lg px-3 py-2.5 text-[13px] ${card}`}>
                <p>Go to the <strong>Contacts app</strong> → tap a contact → <strong>Share Contact</strong> → <strong>Save to Files</strong>. Repeat for each contact, then upload the .vcf files here one by one.</p>
              </div>
            </div>

            {/* Android */}
            <div className={`rounded-xl p-4 ${stepCard}`}>
              <div className="flex items-center gap-2 mb-3">
                <Globe size={16} className="text-accent" />
                <p className="text-sm font-semibold">Android</p>
              </div>
              <div className={`rounded-lg p-3 space-y-2.5 text-[13px] ${card}`}>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                  <p>Open the <strong>Contacts app</strong> on your Android phone.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <p>Tap the <strong>three-dot menu</strong> (⋮) → <strong>Select contacts</strong>. Tick the ones you want to export.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <p>Tap the menu again → <strong>Export to .vcf</strong> (or <strong>Share</strong> → save to Files). A .vcf file will be saved.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
                  <p>Come back here and tap <strong>Choose .vcf file</strong> below to upload it.</p>
                </div>
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

        {/* Preview step */}
        {step === 'preview' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-accent" />
              <p className="text-sm font-medium">
                {readyCount} of {contacts.length} contact{contacts.length !== 1 ? 's' : ''} will be imported
              </p>
            </div>
            <p className={`text-xs mb-3 ${muted}`}>
              Tap a contact to skip/include it. Duplicates are pre-skipped.
            </p>

            <div className="space-y-1.5">
              {contacts.map((c, i) => {
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
                    {skipped.has(i) && (
                      <span className={`text-[10px] flex-shrink-0 ${muted}`}>skip</span>
                    )}
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

      {/* Sticky footer — always above bottom nav */}
      {(step === 'instructions' || step === 'preview') && (
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
          {step === 'preview' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={readyCount === 0}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                readyCount === 0
                  ? 'opacity-40 bg-accent/10 border border-accent/20 text-accent cursor-not-allowed'
                  : 'bg-accent/15 border border-accent/30 text-accent active:scale-[0.98]'
              }`}
            >
              Import {readyCount} contact{readyCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
