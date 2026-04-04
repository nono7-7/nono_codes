'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, ArrowLeft, ArrowRight, Check, AlertTriangle,
  X, FileSpreadsheet, CheckCircle2, XCircle, Copy, ChevronDown,
} from 'lucide-react';
import type { Contact } from '@/lib/types';
import {
  parseFile,
  autoMapHeaders,
  validateRows,
  rowToContact,
  ALL_MAPPABLE_FIELDS,
} from '@/lib/import';
import type {
  ColumnMapping,
  ImportRow,
  ImportSummary,
  MappableField,
} from '@/lib/import';
import { saveContact } from '@/lib/db';

type Step = 'upload' | 'map' | 'preview' | 'saving' | 'done';

export default function BulkImport({
  existingContacts,
  onComplete,
  onCancel,
  isDark,
}: {
  existingContacts: Contact[];
  onComplete: (importedCount: number) => void;
  onCancel: () => void;
  isDark: boolean;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed data
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);

  // Mapping
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  // Preview
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary>({ total: 0, ready: 0, duplicate: 0, invalid: 0, skipped: 0 });

  // Save progress
  const [saveProgress, setSaveProgress] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  // ── Step 1: File Upload ───────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
        setError('Please upload a CSV or XLSX file.');
        return;
      }

      const parsed = await parseFile(file);
      if (parsed.rows.length === 0) {
        setError('File has no data rows.');
        return;
      }

      setFileName(file.name);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      // Auto-map headers
      const autoMappings = autoMapHeaders(parsed.headers, parsed.rows);
      setMappings(autoMappings);
      setStep('map');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Step 2: Mapping Confirmation ──────────────────────────────────

  const updateMapping = (index: number, field: MappableField | null) => {
    setMappings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], mappedTo: field, confidence: field ? 1.0 : 0 };

      // If another column already maps to this field, unmap it
      if (field && field !== 'skip') {
        for (let i = 0; i < next.length; i++) {
          if (i !== index && next[i].mappedTo === field) {
            next[i] = { ...next[i], mappedTo: null, confidence: 0 };
          }
        }
      }
      return next;
    });
  };

  const handleApplyMappings = () => {
    const hasNameMapping = mappings.some((m) => m.mappedTo === 'name');
    if (!hasNameMapping) {
      setError('You must map at least one column to "Name".');
      return;
    }
    setError(null);

    const { rows: validated, summary: sum } = validateRows(rawRows, mappings, headers, existingContacts);
    setRows(validated);
    setSummary(sum);
    setStep('preview');
  };

  // ── Step 3: Preview ───────────────────────────────────────────────

  const toggleRowSkip = (rowIndex: number) => {
    setRows((prev) => {
      const next = [...prev];
      const row = next[rowIndex];
      if (row.status === 'skipped') {
        // Un-skip: restore to ready (re-validation would be complex, just set ready)
        next[rowIndex] = { ...row, status: 'ready', statusReason: '' };
        setSummary((s) => ({ ...s, ready: s.ready + 1, skipped: s.skipped - 1 }));
      } else if (row.status === 'ready') {
        next[rowIndex] = { ...row, status: 'skipped', statusReason: 'Skipped by user' };
        setSummary((s) => ({ ...s, ready: s.ready - 1, skipped: s.skipped + 1 }));
      } else if (row.status === 'duplicate') {
        // Allow force-importing duplicates by toggling to ready
        next[rowIndex] = { ...row, status: 'ready', statusReason: '' };
        setSummary((s) => ({ ...s, ready: s.ready + 1, duplicate: s.duplicate - 1 }));
      }
      return next;
    });
  };

  // ── Step 4: Save ──────────────────────────────────────────────────

  const handleSave = async () => {
    setStep('saving');
    const toSave = rows.filter((r) => r.status === 'ready');
    let saved = 0;

    for (let i = 0; i < toSave.length; i++) {
      const contact = rowToContact(toSave[i].mapped);
      await saveContact(contact);
      saved++;
      setSaveProgress(Math.round(((i + 1) / toSave.length) * 100));
    }

    setSavedCount(saved);
    setStep('done');
  };

  // ── Shared Styles ─────────────────────────────────────────────────

  const cardCls = `rounded-lg border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-light-card border-light-border'}`;
  const btnPrimary = 'px-5 py-2.5 rounded-lg text-sm font-semibold font-[family-name:var(--font-outfit)] bg-accent text-dark-bg active:scale-[0.98] transition-transform';
  const btnSecondary = `px-5 py-2.5 rounded-lg text-sm font-medium font-[family-name:var(--font-outfit)] ${isDark ? 'text-muted-light' : 'text-muted'}`;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.2 }}
      className="pt-4 px-4 pb-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={step === 'upload' ? onCancel : () => {
            if (step === 'map') setStep('upload');
            else if (step === 'preview') setStep('map');
          }}
          className="flex items-center gap-1 text-muted text-sm"
        >
          <ArrowLeft size={18} />
          {step === 'upload' ? 'Cancel' : 'Back'}
        </button>
        <h2 className="font-[family-name:var(--font-outfit)] text-sm font-semibold">
          {step === 'upload' && 'Import Contacts'}
          {step === 'map' && 'Map Columns'}
          {step === 'preview' && 'Review Import'}
          {step === 'saving' && 'Saving...'}
          {step === 'done' && 'Import Complete'}
        </h2>
        <div className="w-12" />
      </div>

      {/* Progress indicator */}
      {step !== 'done' && step !== 'saving' && (
        <div className="flex gap-1.5 mb-6">
          {['upload', 'map', 'preview'].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                ['upload', 'map', 'preview'].indexOf(step) >= i ? 'bg-accent' : isDark ? 'bg-dark-border' : 'bg-light-border'
              }`}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
          <AlertTriangle size={14} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400">
            <X size={14} />
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`${cardCls} p-10 flex flex-col items-center gap-4 cursor-pointer border-dashed border-2 hover:border-accent/40 transition-colors`}
            >
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                <Upload size={24} className="text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium font-[family-name:var(--font-outfit)] mb-1">
                  Upload CSV or XLSX
                </p>
                <p className="text-xs text-muted">
                  Drag & drop or tap to browse
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] px-2 py-0.5 rounded ${isDark ? 'bg-dark-border text-muted-light' : 'bg-light-border text-muted'}`}>.csv</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${isDark ? 'bg-dark-border text-muted-light' : 'bg-light-border text-muted'}`}>.xlsx</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
              className="hidden"
            />

            <div className="mt-6 text-xs text-muted space-y-1.5">
              <p className="font-medium text-muted-light">Tips:</p>
              <p>• Each row in your file = one contact</p>
              <p>• The first row should be column headers</p>
              <p>• Column names are auto-matched — you can correct them</p>
              <p>• Duplicates are flagged, not imported silently</p>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Column Mapping ── */}
        {step === 'map' && (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={16} className="text-accent" />
              <span className="text-sm font-medium truncate">{fileName}</span>
              <span className="text-xs text-muted ml-auto">{rawRows.length} row{rawRows.length !== 1 ? 's' : ''}</span>
            </div>

            <p className="text-xs text-muted mb-4">
              We auto-detected column mappings below. Review and correct if needed — this applies to all rows.
            </p>

            <div className="space-y-2 mb-6">
              {mappings.map((m, i) => (
                <div key={i} className={`${cardCls} p-3`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.originalHeader}</p>
                      {m.sampleValues.length > 0 && (
                        <p className="text-[10px] text-muted truncate mt-0.5">
                          e.g. {m.sampleValues.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                    <ArrowRight size={12} className="text-muted shrink-0" />
                    <div className="relative shrink-0">
                      <select
                        value={m.mappedTo || ''}
                        onChange={(e) => updateMapping(i, (e.target.value || null) as MappableField | null)}
                        className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium outline-none border cursor-pointer ${
                          m.mappedTo && m.mappedTo !== 'skip'
                            ? 'border-accent/40 text-accent bg-accent/10'
                            : isDark
                            ? 'bg-dark-bg border-dark-border text-muted-light'
                            : 'bg-light-bg border-light-border text-muted'
                        }`}
                      >
                        {ALL_MAPPABLE_FIELDS.filter((f) => f.value !== 'skip').map((f) => (
                          <option key={f.value ?? 'null'} value={f.value ?? ''}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted" />
                    </div>
                  </div>
                  {m.confidence > 0 && m.confidence < 0.8 && m.mappedTo && (
                    <p className="text-[10px] text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} /> Low confidence — please verify
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={handleApplyMappings} className={btnPrimary}>
                Preview Import
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Preview ── */}
        {step === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Ready', value: summary.ready, color: 'text-green-400' },
                { label: 'Duplicate', value: summary.duplicate, color: 'text-amber-400' },
                { label: 'Invalid', value: summary.invalid, color: 'text-red-400' },
                { label: 'Skipped', value: summary.skipped, color: 'text-muted' },
              ].map((s) => (
                <div key={s.label} className={`${cardCls} p-3 text-center`}>
                  <p className={`font-[family-name:var(--font-outfit)] text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Row list */}
            <div className="space-y-1.5 mb-6 max-h-[50vh] overflow-y-auto">
              {rows.map((row, i) => (
                <button
                  key={i}
                  onClick={() => toggleRowSkip(i)}
                  className={`w-full text-left ${cardCls} px-3 py-2.5 flex items-center gap-2.5 transition-opacity ${
                    row.status === 'skipped' ? 'opacity-40' : ''
                  }`}
                >
                  {row.status === 'ready' && <CheckCircle2 size={14} className="text-green-400 shrink-0" />}
                  {row.status === 'duplicate' && <Copy size={14} className="text-amber-400 shrink-0" />}
                  {row.status === 'invalid' && <XCircle size={14} className="text-red-400 shrink-0" />}
                  {row.status === 'skipped' && <X size={14} className="text-muted shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {row.mapped.name || '(no name)'}
                    </p>
                    <p className="text-[10px] text-muted truncate">
                      {[row.mapped.role, row.mapped.company, row.mapped.email]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  {row.statusReason && (
                    <span className={`text-[10px] shrink-0 max-w-[120px] truncate ${
                      row.status === 'duplicate' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {row.statusReason}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-muted mb-4">
              Tap a row to skip/unskip it. Tap duplicates to force-import them.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={summary.ready === 0}
                className={`${btnPrimary} flex-1 ${summary.ready === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Import {summary.ready} Contact{summary.ready !== 1 ? 's' : ''}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: Saving ── */}
        {step === 'saving' && (
          <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Upload size={24} className="text-accent animate-pulse" />
            </div>
            <p className="text-sm font-medium font-[family-name:var(--font-outfit)] mb-3">
              Importing contacts...
            </p>
            <div className={`mx-auto w-48 h-2 rounded-full overflow-hidden ${isDark ? 'bg-dark-border' : 'bg-light-border'}`}>
              <div
                className="h-full bg-accent rounded-full transition-all duration-200"
                style={{ width: `${saveProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">{saveProgress}%</p>
          </motion.div>
        )}

        {/* ── STEP 5: Done ── */}
        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-green-400" />
            </div>
            <p className="text-lg font-bold font-[family-name:var(--font-outfit)] mb-1">
              {savedCount} Contact{savedCount !== 1 ? 's' : ''} Imported
            </p>
            <p className="text-sm text-muted mb-6">
              from {fileName}
            </p>
            <button
              onClick={() => onComplete(savedCount)}
              className={btnPrimary}
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
