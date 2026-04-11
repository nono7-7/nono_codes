'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight, QrCode } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

interface Props {
  onComplete: (profile: UserProfile) => void;
  isDark: boolean;
}

const BLANK_PROFILE: UserProfile = {
  name: '',
  photoUrl: '',
  phone: '',
  email: '',
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
};

export default function ProfileSetup({ onComplete, isDark }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const inputBase =
    'w-full px-3.5 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-accent/30 focus:border-accent/50';
  const inputTheme = isDark
    ? 'bg-dark-card border-dark-border text-white placeholder-muted/50'
    : 'bg-white border-light-border text-zinc-900 placeholder-slate-400';

  const handleSave = () => {
    onComplete({
      ...BLANK_PROFILE,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      linkedinUrl: linkedinUrl.trim(),
    });
  };

  const handleSkip = () => {
    onComplete(BLANK_PROFILE);
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-6 py-10 ${
        isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-zinc-900'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[380px]"
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

        {/* Fields */}
        <div className="space-y-3.5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 tracking-wide uppercase">
              Your name
            </label>
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={`${inputBase} ${inputTheme}`}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 tracking-wide uppercase">
              Phone number
            </label>
            <input
              type="tel"
              placeholder="+44 7700 900000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className={`${inputBase} ${inputTheme}`}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 tracking-wide uppercase">
              Contact email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={`${inputBase} ${inputTheme}`}
            />
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 tracking-wide uppercase">
              LinkedIn URL
            </label>
            <input
              type="url"
              placeholder="linkedin.com/in/yourname"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              autoComplete="url"
              className={`${inputBase} ${inputTheme}`}
            />
          </div>
        </div>

        {/* QR note */}
        <div
          className={`mt-5 flex items-start gap-3 rounded-xl px-4 py-3.5 border ${
            isDark
              ? 'bg-accent/8 border-accent/20'
              : 'bg-teal-50 border-teal-200/60'
          }`}
        >
          <QrCode size={15} className="text-accent shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-semibold text-accent">All fields are shared via QR by default.</span>{' '}
            You can choose exactly which fields appear in your QR code at any time in{' '}
            <span className="font-medium">Settings.</span>
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted hover:text-accent transition-colors px-3 py-2 shrink-0"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-accent text-dark-bg text-sm font-semibold font-[family-name:var(--font-outfit)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            Save &amp; Get Started
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
