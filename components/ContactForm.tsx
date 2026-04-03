'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { nanoid } from 'nanoid';
import { Camera, Plus, X, Star, GraduationCap, Briefcase } from 'lucide-react';
import type { Contact, Education, Job } from '@/lib/types';
import { createEmptyContact } from '@/lib/utils';
import { compressImage } from '@/lib/avatar';
import TagInput from './TagInput';
import AutoSuggestInput from './AutoSuggestInput';
import Avatar from './Avatar';

export type SuggestionPools = {
  role: string[];
  company: string[];
  university: string[];
  homeLocation: string[];
  howMet: string[];
  whereMet: string[];
  eventOrContext: string[];
};

export default function ContactForm({
  contact,
  allUsedTags,
  suggestionPools,
  onSave,
  onCancel,
  isDark,
}: {
  contact: Contact | null;
  allUsedTags: string[];
  suggestionPools: SuggestionPools;
  onSave: (contact: Contact) => void;
  onCancel: () => void;
  isDark: boolean;
}) {
  const isEdit = !!contact && !!contact.id;
  const [form, setForm] = useState(() => {
    if (contact) {
      const { id, dateAdded, lastUpdated, ...rest } = contact;
      return { ...createEmptyContact(), ...rest };
    }
    return createEmptyContact();
  });

  const nameRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEdit) {
      setTimeout(() => nameRef.current?.focus(), 200);
    }
  }, [isEdit]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      set('photoUrl', dataUrl);
    } catch {
      // silently fail
    }
  };

  const canSave = form.name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const now = new Date().toISOString();
    const saved: Contact = {
      ...form,
      id: contact?.id ?? nanoid(),
      dateAdded: contact?.dateAdded ?? now,
      lastUpdated: now,
    };
    onSave(saved);
  };

  const set = (field: string, value: string | string[]) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  // Education helpers
  const addEducation = () => {
    const edu: Education = { id: nanoid(), university: '', program: '', gradYear: '', isPrimary: false };
    setForm((f) => ({ ...f, education: [...(f.education || []), edu] }));
  };
  const updateEducation = (id: string, patch: Partial<Education>) => {
    setForm((f) => {
      let education = (f.education || []).map((e) => (e.id === id ? { ...e, ...patch } : e));
      if (patch.isPrimary) education = education.map((e) => (e.id === id ? e : { ...e, isPrimary: false }));
      return { ...f, education };
    });
  };
  const removeEducation = (id: string) => {
    setForm((f) => ({ ...f, education: (f.education || []).filter((e) => e.id !== id) }));
  };

  // Jobs helpers
  const addJob = () => {
    const job: Job = { id: nanoid(), company: '', role: '', isCurrent: false };
    setForm((f) => ({ ...f, jobs: [...(f.jobs || []), job] }));
  };
  const updateJob = (id: string, patch: Partial<Job>) => {
    setForm((f) => {
      let jobs = (f.jobs || []).map((j) => (j.id === id ? { ...j, ...patch } : j));
      if (patch.isCurrent) jobs = jobs.map((j) => (j.id === id ? j : { ...j, isCurrent: false }));
      return { ...f, jobs };
    });
  };
  const removeJob = (id: string) => {
    setForm((f) => ({ ...f, jobs: (f.jobs || []).filter((j) => j.id !== id) }));
  };

  const inputClass = `w-full px-3 py-2.5 rounded-lg text-sm outline-none border ${
    isDark
      ? 'bg-dark-card border-dark-border text-white placeholder:text-muted'
      : 'bg-white border-light-border text-dark-bg placeholder:text-muted'
  }`;

  const labelClass = 'text-xs font-medium text-muted font-[family-name:var(--font-outfit)] uppercase tracking-wider mb-1.5 block';
  const optLabel = (text: string) => `${text} (optional)`;
  const reqLabel = (text: string) => `${text} *`;

  const sectionLabel = (text: string) => (
    <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-3 mt-6 first:mt-0">
      {text}
    </h3>
  );

  const saveButtonClass = `text-sm font-bold font-[family-name:var(--font-outfit)] ${
    canSave ? 'text-accent' : 'text-muted opacity-50'
  }`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="pt-4 px-4 pb-24"
    >
      {/* Nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onCancel} className="text-muted text-sm font-medium">
          Cancel
        </button>
        <h2 className="font-[family-name:var(--font-outfit)] text-sm font-semibold">
          {isEdit ? 'Edit Contact' : 'New Contact'}
        </h2>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={saveButtonClass}
        >
          Save
        </button>
      </div>

      {/* Photo */}
      <div className="flex justify-center mb-4">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="relative group"
        >
          <Avatar
            name={form.name || '?'}
            photoUrl={form.photoUrl}
            size="lg"
          />
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
            <Camera size={20} className="text-white" />
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

      {/* Basics */}
      {sectionLabel('Basics')}
      <div className="space-y-3">
        <div>
          <label className={labelClass}>{reqLabel('Name')}</label>
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Full name"
            className={`${inputClass} ${!form.name.trim() ? 'border-accent/30' : ''}`}
          />
        </div>
        <div>
          <label className={labelClass}>{optLabel('Home Location')}</label>
          <AutoSuggestInput
            value={form.homeLocation}
            onChange={(v) => set('homeLocation', v)}
            suggestions={suggestionPools.homeLocation}
            placeholder="City"
            inputClass={inputClass}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Education */}
      {sectionLabel('Education (optional)')}
      <div className="space-y-2">
        {(form.education || []).map((edu) => (
          <div
            key={edu.id}
            className={`rounded-lg p-3 border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}
          >
            <div className="flex items-start gap-2">
              <GraduationCap size={14} className="text-muted mt-2.5 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <AutoSuggestInput
                  value={edu.university}
                  onChange={(v) => updateEducation(edu.id, { university: v })}
                  suggestions={suggestionPools.university}
                  placeholder="University"
                  inputClass={`${inputClass} py-1.5 text-xs`}
                  isDark={isDark}
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={edu.program}
                    onChange={(e) => updateEducation(edu.id, { program: e.target.value })}
                    placeholder="Programme"
                    className={`${inputClass} py-1.5 text-xs flex-1`}
                  />
                  <input
                    type="text"
                    value={edu.gradYear}
                    onChange={(e) => updateEducation(edu.id, { gradYear: e.target.value })}
                    placeholder="Year"
                    className={`${inputClass} py-1.5 text-xs w-16`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updateEducation(edu.id, { isPrimary: !edu.isPrimary })}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${edu.isPrimary ? 'text-accent' : 'text-muted'}`}
                >
                  <Star size={11} fill={edu.isPrimary ? 'currentColor' : 'none'} />
                  {edu.isPrimary ? 'Shown on card' : 'Show on card'}
                </button>
              </div>
              <button type="button" onClick={() => removeEducation(edu.id)} className="text-muted hover:text-red-400 mt-1 flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addEducation} className="flex items-center gap-2 text-xs text-accent font-medium py-2">
          <Plus size={14} /> Add University
        </button>
      </div>

      {/* Work */}
      {sectionLabel('Work (optional)')}
      <div className="space-y-2">
        {(form.jobs || []).map((job) => (
          <div
            key={job.id}
            className={`rounded-lg p-3 border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'}`}
          >
            <div className="flex items-start gap-2">
              <Briefcase size={14} className="text-muted mt-2.5 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="flex gap-1.5">
                  <AutoSuggestInput
                    value={job.role}
                    onChange={(v) => updateJob(job.id, { role: v })}
                    suggestions={suggestionPools.role}
                    placeholder="Role"
                    inputClass={`${inputClass} py-1.5 text-xs flex-1`}
                    isDark={isDark}
                  />
                  <AutoSuggestInput
                    value={job.company}
                    onChange={(v) => updateJob(job.id, { company: v })}
                    suggestions={suggestionPools.company}
                    placeholder="Company"
                    inputClass={`${inputClass} py-1.5 text-xs flex-1`}
                    isDark={isDark}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updateJob(job.id, { isCurrent: !job.isCurrent })}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${job.isCurrent ? 'text-accent' : 'text-muted'}`}
                >
                  <Star size={11} fill={job.isCurrent ? 'currentColor' : 'none'} />
                  {job.isCurrent ? 'Current' : 'Mark as current'}
                </button>
              </div>
              <button type="button" onClick={() => removeJob(job.id)} className="text-muted hover:text-red-400 mt-1 flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addJob} className="flex items-center gap-2 text-xs text-accent font-medium py-2">
          <Plus size={14} /> Add Job
        </button>
      </div>

      {/* Classification */}
      {sectionLabel('Classification')}
      <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
        {(['inner', 'wider'] as const).map((val) => (
          <button
            key={val}
            onClick={() => set('classification', val)}
            className={`flex-1 py-2.5 text-sm font-medium font-[family-name:var(--font-outfit)] transition-colors ${
              form.classification === val
                ? 'bg-accent text-dark-bg'
                : isDark
                ? 'bg-dark-card text-muted-light'
                : 'bg-white text-muted'
            }`}
          >
            {val === 'inner' ? 'Inner Circle' : 'Wider Network'}
          </button>
        ))}
      </div>

      {/* How You Met */}
      {sectionLabel('How You Met')}
      <div className="space-y-3">
        <div>
          <label className={labelClass}>{optLabel('How did you meet?')}</label>
          <AutoSuggestInput
            value={form.howMet}
            onChange={(v) => set('howMet', v)}
            suggestions={suggestionPools.howMet}
            placeholder="Through a mutual friend, at a conference..."
            inputClass={inputClass}
            isDark={isDark}
          />
        </div>
        <div>
          <label className={labelClass}>{optLabel('Where?')}</label>
          <AutoSuggestInput
            value={form.whereMet}
            onChange={(v) => set('whereMet', v)}
            suggestions={suggestionPools.whereMet}
            placeholder="City or location"
            inputClass={inputClass}
            isDark={isDark}
          />
        </div>
        <div>
          <label className={labelClass}>{optLabel('Event or Context')}</label>
          <AutoSuggestInput
            value={form.eventOrContext}
            onChange={(v) => set('eventOrContext', v)}
            suggestions={suggestionPools.eventOrContext}
            placeholder="IE Orientation, UBS Intern Drinks, Wedding..."
            inputClass={inputClass}
            isDark={isDark}
          />
        </div>
        <div>
          <label className={labelClass}>{optLabel('When?')}</label>
          <input type="text" value={form.dateMet} onChange={(e) => set('dateMet', e.target.value)} placeholder="Summer 2024, March 2023..." className={inputClass} />
        </div>
      </div>

      {/* Contact Info */}
      {sectionLabel('Contact Info')}
      <div className="space-y-3">
        <div>
          <label className={labelClass}>{optLabel('Phone')}</label>
          <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+34 612 345 678" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{optLabel('Email')}</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@email.com" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{optLabel('LinkedIn URL')}</label>
          <input type="url" value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{optLabel('Birthday')}</label>
          <input type="date" value={form.birthday} onChange={(e) => set('birthday', e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Notes */}
      {sectionLabel('Notes (optional)')}
      <textarea
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        placeholder="Interests, conversation topics, things to remember..."
        rows={4}
        className={`${inputClass} resize-none`}
      />

      {/* Reconnect Reminder */}
      {sectionLabel('Reconnect Reminder (optional)')}
      <div className={`flex flex-wrap gap-2`}>
        {[
          { label: 'None', value: null },
          { label: '2 weeks', value: 2 },
          { label: '4 weeks', value: 4 },
          { label: '8 weeks', value: 8 },
          { label: '12 weeks', value: 12 },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => set('reconnectIntervalWeeks', option.value as unknown as string)}
            className={`px-3 py-2 rounded-lg text-xs font-medium font-[family-name:var(--font-outfit)] transition-colors ${
              form.reconnectIntervalWeeks === option.value
                ? 'bg-accent text-dark-bg'
                : isDark
                ? 'bg-dark-card border border-dark-border text-muted-light'
                : 'bg-white border border-light-border text-muted'
            }`}
          >
            {option.label}
          </button>
        ))}
        {/* Custom weeks option */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={52}
            value={
              form.reconnectIntervalWeeks !== null &&
              ![2, 4, 8, 12].includes(form.reconnectIntervalWeeks)
                ? form.reconnectIntervalWeeks
                : ''
            }
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              set('reconnectIntervalWeeks', (isNaN(v) || v < 1 ? null : v) as unknown as string);
            }}
            placeholder="Custom"
            className={`w-20 px-2 py-2 rounded-lg text-xs font-medium text-center outline-none border ${
              form.reconnectIntervalWeeks !== null &&
              ![null, 2, 4, 8, 12].includes(form.reconnectIntervalWeeks)
                ? 'bg-accent text-dark-bg border-accent'
                : isDark
                ? 'bg-dark-card border-dark-border text-muted-light'
                : 'bg-white border-light-border text-muted'
            }`}
          />
          <span className="text-xs text-muted">weeks</span>
        </div>
      </div>

      {/* Tags */}
      {sectionLabel('Tags')}
      <TagInput
        tags={form.tags}
        onChange={(tags) => set('tags', tags)}
        allUsedTags={allUsedTags}
        isDark={isDark}
      />

      {/* Sticky bottom Save button */}
      <div
        className={`fixed bottom-16 left-0 right-0 z-40 border-t px-4 py-3 ${
          isDark ? 'bg-dark-bg border-dark-border' : 'bg-light-bg border-light-border'
        }`}
      >
        <div className="mx-auto max-w-[480px]">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full py-3 rounded-lg text-sm font-semibold font-[family-name:var(--font-outfit)] transition-colors ${
              canSave
                ? 'bg-accent text-dark-bg active:scale-[0.98]'
                : 'bg-muted/20 text-muted cursor-not-allowed'
            }`}
          >
            {isEdit ? 'Save Changes' : 'Save Contact'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
