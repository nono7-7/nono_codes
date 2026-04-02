'use client';

import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import type { UserProfile } from '@/lib/types';
import { encodeProfileForSharing } from '@/lib/share';
import Avatar from './Avatar';

function sharedFieldsList(profile: UserProfile): string[] {
  const fields: string[] = [];
  if (profile.shareJobs && profile.jobs.length > 0) {
    const cur = profile.jobs.find((j) => j.isCurrent) ?? profile.jobs[0];
    if (cur.role || cur.company) fields.push(`${cur.role}${cur.role && cur.company ? ' @ ' : ''}${cur.company}`);
  }
  if (profile.sharePhone && profile.phone)           fields.push(profile.phone);
  if (profile.shareEmail && profile.email)           fields.push(profile.email);
  if (profile.shareLinkedin && profile.linkedinUrl)  fields.push('LinkedIn');
  if (profile.shareLocation && profile.mainLocation) fields.push(profile.mainLocation);
  if (profile.shareEducation && profile.education.length > 0) fields.push(profile.education[0].university);
  return fields;
}

export default function UserQRModal({
  profile,
  onClose,
  isDark,
}: {
  profile: UserProfile;
  onClose: () => void;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = encodeProfileForSharing(profile);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const fields = sharedFieldsList(profile);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={`relative w-full max-w-[320px] rounded-2xl p-6 ${isDark ? 'bg-dark-card' : 'bg-white'}`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-accent">
          <X size={18} />
        </button>

        {/* Profile */}
        <div className="flex flex-col items-center mb-5">
          <Avatar name={profile.name || '?'} photoUrl={profile.photoUrl} size="md" />
          <h3 className="font-[family-name:var(--font-outfit)] font-semibold text-base mt-3">
            {profile.name || 'Your Profile'}
          </h3>
          {fields.length > 0 && (
            <p className="text-[11px] text-muted mt-1 text-center leading-relaxed">
              Sharing: {fields.join(' · ')}
            </p>
          )}
        </div>

        {/* QR */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-xl">
            <QRCodeSVG
              value={shareUrl}
              size={180}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#0A0A0B"
            />
          </div>
        </div>

        <p className="text-center text-[11px] text-muted mb-4">
          Scan to add you as a contact in InTouch
        </p>

        <button
          onClick={handleCopy}
          className={`w-full py-2.5 rounded-lg text-xs font-semibold font-[family-name:var(--font-outfit)] flex items-center justify-center gap-1.5 transition-colors ${
            copied
              ? 'bg-accent/15 text-accent'
              : isDark
              ? 'bg-dark-border text-muted hover:text-white'
              : 'bg-light-border text-muted hover:text-zinc-900'
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </motion.div>
    </motion.div>
  );
}
