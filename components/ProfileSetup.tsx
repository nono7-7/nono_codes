'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight, QrCode, GraduationCap, Briefcase, Plus, X, Star, MapPin, Cake } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { UserProfile, Education, Job, PhoneEntry, EmailEntry } from '@/lib/types';

interface Props {
  onComplete: (profile: UserProfile) => void;
  isDark: boolean;
}

export default function ProfileSetup({ onComplete, isDark }: Props) {
  const [name, setName] = useState('');
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [birthday, setBirthday] = useState('');
  const [mainLocation, setMainLocation] = useState('');
  const [education, setEducation] = useState<Education[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const inputBase =
    'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-accent/30 focus:border-accent/50';
  const inputTheme = isDark
    ? 'bg-dark-card border-dark-border text-white placeholder-muted/50'
    : 'bg-white border-light-border text-zinc-900 placeholder-slate-400';
  const cardTheme = isDark
    ? 'bg-dark-card border-dark-border'
    : 'bg-white border-light-border';
  const labelCls = 'block text-xs font-semibold text-muted mb-1.5 tracking-wide uppercase';

  // ── Education handlers ──
  const addEducation = () =>
    setEducation((prev) => [...prev, { id: nanoid(), university: '', program: '', gradYear: '', isPrimary: false }]);

  const updateEducation = (id: string, patch: Partial<Education>) =>
    setEducation((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const removeEducation = (id: string) =>
    setEducation((prev) => prev.filter((e) => e.id !== id));

  // ── Job handlers ──
  const addJob = () =>
    setJobs((prev) => [...prev, { id: nanoid(), company: '', role: '', isCurrent: false }]);

  const updateJob = (id: string, patch: Partial<Job>) =>
    setJobs((prev) => {
      let updated = prev.map((j) => (j.id === id ? { ...j, ...patch } : j));
      if (patch.isCurrent) updated = updated.map((j) => (j.id === id ? j : { ...j, isCurrent: false }));
      return updated;
    });

  const removeJob = (id: string) =>
    setJobs((prev) => prev.filter((j) => j.id !== id));

  // ── Phone handlers ──
  const addPhone = () =>
    setPhones((prev) => [...prev, { id: nanoid(), label: 'personal' as const, number: '' }]);
  const updatePhone = (id: string, patch: Partial<PhoneEntry>) =>
    setPhones((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removePhone = (id: string) =>
    setPhones((prev) => prev.filter((p) => p.id !== id));

  // ── Email handlers ──
  const addEmail = () =>
    setEmails((prev) => [...prev, { id: nanoid(), label: 'personal' as const, address: '' }]);
  const updateEmail = (id: string, patch: Partial<EmailEntry>) =>
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEmail = (id: string) =>
    setEmails((prev) => prev.filter((e) => e.id !== id));

  const handleSave = () => {
    onComplete({
      name: name.trim(),
      photoUrl: '',
      phones,
      emails,
      linkedinUrl: linkedinUrl.trim(),
      birthday: birthday.trim(),
      mainLocation: mainLocation.trim(),
      education,
      jobs,
      sharePhone: true,
      shareEmail: true,
      shareLinkedin: true,
      shareBirthday: true,
      shareLocation: true,
      shareEducation: true,
      shareJobs: true,
    });
  };

  const handleSkip = () => {
    onComplete({
      name: '',
      photoUrl: '',
      phones: [],
      emails: [],
      linkedinUrl: '',
      birthday: '',
      mainLocation: '',
      education: [],
      jobs: [],
      sharePhone: true,
      shareEmail: true,
      shareLinkedin: true,
      shareBirthday: true,
      shareLocation: true,
      shareEducation: true,
      shareJobs: true,
    });
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center px-6 py-10 ${
        isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-zinc-900'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[380px] pt-6"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-accent/15">
          <User size={28} className="text-accent" />
        </div>

        {/* Header */}
        <div className="text-center mb-7">
          <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold tracking-tight mb-2">
            Set Up Your Profile
          </h2>
          <p className="text-muted text-sm leading-relaxed">
            Add your details so contacts can add you instantly when they scan your QR code.
          </p>
        </div>

        {/* ── Basic info ── */}
        <div className="space-y-3.5">
          <div>
            <label className={labelCls}>Your name</label>
            <input type="text" placeholder="Full name" value={name}
              onChange={(e) => setName(e.target.value)} autoComplete="name"
              className={`${inputBase} ${inputTheme}`} />
          </div>
          {/* Phones */}
          <div>
            <label className={labelCls}>Phone number</label>
            <div className="space-y-2">
              {phones.map((p) => (
                <div key={p.id} className="flex gap-2 items-center">
                  <select value={p.label} onChange={(e) => updatePhone(p.id, { label: e.target.value as PhoneEntry['label'] })}
                    className={`${inputBase} ${inputTheme} w-[100px] shrink-0 py-2`}>
                    <option value="personal">Personal</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="tel" placeholder="+44 7700 900000" value={p.number}
                    onChange={(e) => updatePhone(p.id, { number: e.target.value })}
                    className={`${inputBase} ${inputTheme} flex-1`} />
                  <button type="button" onClick={() => removePhone(p.id)} className="text-muted hover:text-red-400 shrink-0"><X size={15} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addPhone} className="flex items-center gap-1.5 text-xs text-accent font-medium py-1.5 mt-1">
              <Plus size={13} /> Add phone
            </button>
          </div>
          {/* Emails */}
          <div>
            <label className={labelCls}>Contact email</label>
            <div className="space-y-2">
              {emails.map((e) => (
                <div key={e.id} className="flex gap-2 items-center">
                  <select value={e.label} onChange={(ev) => updateEmail(e.id, { label: ev.target.value as EmailEntry['label'] })}
                    className={`${inputBase} ${inputTheme} w-[100px] shrink-0 py-2`}>
                    <option value="personal">Personal</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="email" placeholder="you@example.com" value={e.address}
                    onChange={(ev) => updateEmail(e.id, { address: ev.target.value })}
                    className={`${inputBase} ${inputTheme} flex-1`} />
                  <button type="button" onClick={() => removeEmail(e.id)} className="text-muted hover:text-red-400 shrink-0"><X size={15} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addEmail} className="flex items-center gap-1.5 text-xs text-accent font-medium py-1.5 mt-1">
              <Plus size={13} /> Add email
            </button>
          </div>
          <div>
            <label className={labelCls}>LinkedIn URL</label>
            <input type="url" placeholder="linkedin.com/in/yourname" value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)} autoComplete="url"
              className={`${inputBase} ${inputTheme}`} />
          </div>
          <div>
            <label className={`${labelCls} flex items-center gap-1.5`}>
              <MapPin size={11} className="text-muted" /> Location
            </label>
            <input type="text" placeholder="London, UK" value={mainLocation}
              onChange={(e) => setMainLocation(e.target.value)}
              className={`${inputBase} ${inputTheme}`} />
          </div>
          <div>
            <label className={`${labelCls} flex items-center gap-1.5`}>
              <Cake size={11} className="text-muted" /> Birthday
            </label>
            <div className="flex items-center gap-2">
              <input type="date" value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className={`${inputBase} ${inputTheme} w-auto`}
                style={{ maxWidth: '180px' }} />
              {birthday && (
                <button
                  type="button"
                  onClick={() => setBirthday('')}
                  className="text-xs text-muted hover:text-accent transition-colors shrink-0 px-1 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Work ── */}
        <div className="mt-7">
          <p className="text-xs font-semibold text-muted tracking-wide uppercase mb-3">Work</p>
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className={`rounded-lg p-3 border ${cardTheme}`}>
                <div className="flex items-start gap-2">
                  <Briefcase size={13} className="text-muted mt-2.5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-1.5">
                      <input type="text" value={job.role}
                        onChange={(e) => updateJob(job.id, { role: e.target.value })}
                        placeholder="Role" className={`${inputBase} py-1.5 text-xs flex-1`} />
                      <input type="text" value={job.company}
                        onChange={(e) => updateJob(job.id, { company: e.target.value })}
                        placeholder="Company" className={`${inputBase} py-1.5 text-xs flex-1`} />
                    </div>
                    <button type="button"
                      onClick={() => updateJob(job.id, { isCurrent: !job.isCurrent })}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        job.isCurrent ? 'text-accent' : 'text-muted'
                      }`}>
                      <Star size={11} fill={job.isCurrent ? 'currentColor' : 'none'} />
                      {job.isCurrent ? 'Current' : 'Mark as current'}
                    </button>
                  </div>
                  <button type="button" onClick={() => removeJob(job.id)}
                    className="text-muted hover:text-red-400 mt-1 shrink-0">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addJob}
            className="flex items-center gap-2 text-xs text-accent font-medium py-2 mt-1">
            <Plus size={14} /> Add Job
          </button>
        </div>

        {/* ── Education ── */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-muted tracking-wide uppercase mb-3">Education</p>
          <div className="space-y-2">
            {education.map((edu) => (
              <div key={edu.id} className={`rounded-lg p-3 border ${cardTheme}`}>
                <div className="flex items-start gap-2">
                  <GraduationCap size={13} className="text-muted mt-2.5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-1.5">
                      <input type="text" value={edu.university}
                        onChange={(e) => updateEducation(edu.id, { university: e.target.value })}
                        placeholder="University" className={`${inputBase} py-1.5 text-xs flex-1`} />
                      <input type="text" value={edu.program}
                        onChange={(e) => updateEducation(edu.id, { program: e.target.value })}
                        placeholder="Programme" className={`${inputBase} py-1.5 text-xs flex-1`} />
                    </div>
                    <input type="text" value={edu.gradYear}
                      onChange={(e) => updateEducation(edu.id, { gradYear: e.target.value })}
                      placeholder="Graduation year" className={`${inputBase} py-1.5 text-xs w-full`} />
                  </div>
                  <button type="button" onClick={() => removeEducation(edu.id)}
                    className="text-muted hover:text-red-400 mt-1 shrink-0">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addEducation}
            className="flex items-center gap-2 text-xs text-accent font-medium py-2 mt-1 mb-2">
            <Plus size={14} /> Add University
          </button>
        </div>

        {/* QR note */}
        <div className={`mt-4 flex items-start gap-3 rounded-xl px-4 py-3.5 border ${
          isDark ? 'bg-accent/8 border-accent/20' : 'bg-teal-50 border-teal-200/60'
        }`}>
          <QrCode size={15} className="text-accent shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-semibold text-accent">All fields are shared via QR by default.</span>{' '}
            You can choose exactly which fields appear in your QR code at any time in{' '}
            <span className="font-medium">Settings.</span>
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3 pb-10">
          <button type="button" onClick={handleSkip}
            className="text-xs text-muted hover:text-accent transition-colors px-3 py-2 shrink-0">
            Skip for now
          </button>
          <button type="button" onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-accent text-dark-bg text-sm font-semibold font-[family-name:var(--font-outfit)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            Save &amp; Get Started
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
