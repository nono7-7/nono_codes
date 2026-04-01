'use client';

import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import type { Contact } from '@/lib/types';
import { encodeContactForSharing } from '@/lib/share';
import Avatar from './Avatar';

export default function ContactShareModal({
  contact,
  onClose,
  isDark,
}: {
  contact: Contact;
  onClose: () => void;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = encodeContactForSharing(contact);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={`relative w-full max-w-[320px] rounded-2xl p-6 ${
          isDark ? 'bg-dark-card' : 'bg-white'
        }`}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-accent"
        >
          <X size={18} />
        </button>

        {/* Contact info */}
        <div className="flex flex-col items-center mb-5">
          <Avatar name={contact.name} photoUrl={contact.photoUrl} size="md" />
          <h3 className="font-[family-name:var(--font-outfit)] font-semibold text-base mt-3">
            {contact.name}
          </h3>
          {(contact.role || contact.company) && (
            <p className="text-xs text-muted mt-0.5">
              {contact.role}
              {contact.role && contact.company && ' @ '}
              {contact.company}
            </p>
          )}
        </div>

        {/* QR Code */}
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
          Scan to add this contact to InTouch
        </p>

        {/* Copy Link */}
        <button
          onClick={handleCopy}
          className={`w-full py-2.5 rounded-lg text-xs font-semibold font-[family-name:var(--font-outfit)] flex items-center justify-center gap-1.5 transition-colors ${
            copied
              ? 'bg-accent/15 text-accent'
              : isDark
              ? 'bg-dark-border text-muted-light hover:text-white'
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
