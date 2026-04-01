'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { nanoid } from 'nanoid';
import { Camera } from 'lucide-react';
import type { Contact } from '@/lib/types';
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
          <label className={labelClass}>{optLabel('Role')}</label>
          <AutoSuggestInput
            value={form.role}
            onChange={(v) => set('role', v)}
            suggestions={suggestionPools.role}
            placeholder="Job title, student, etc."
            inputClass={inputClass}
            isDark={isDark}
          />
        </div>
        <div>
          <label className={labelClass}>{optLabel('Company')}</label>
          <AutoSuggestInput
            value={form.company}
            onChange={(v) => set('company', v)}
            suggestions={suggestionPools.company}
            placeholder="Company name"
            inputClass={inputClass}
            isDark={isDark}
          />
        </div>
        <div>
          <label className={labelClass}>{optLabel('University')}</label>
          <AutoSuggestInput
            value={form.university}
            onChange={(v) => set('university', v)}
            suggestions={suggestionPools.university}
            placeholder="University or school"
            inputClass={inputClass}
            isDark={isDark}
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
