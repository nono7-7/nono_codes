'use client';

import { X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// BUMP THIS VERSION + UPDATE features[] WHEN ANNOUNCING A NEW FEATURE
// ─────────────────────────────────────────────────────────────
export const WHATS_NEW_VERSION = '1.0';

const features = [
  'Import phone contacts directly from your iPhone or Android via vCard (.vcf)',
  'Reach-Out filter — flag contacts you want to follow up with',
  'Smart filter chips: Upcoming, Interacted, Reach Out',
  'Push notifications at 9 AM UTC for planned interactions',
  'Network breakdown by Firm, Role, and University',
];
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = `intouch-whats-new-${WHATS_NEW_VERSION}`;

export function shouldShowWhatsNew(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(STORAGE_KEY);
}

export function dismissWhatsNew(): void {
  localStorage.setItem(STORAGE_KEY, '1');
}

export default function WhatsNew({
  isOpen,
  onClose,
  isDark,
}: {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}) {
  const handleClose = () => {
    dismissWhatsNew();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          <motion.div
            className={`relative w-full max-w-md rounded-t-2xl ${isDark ? 'bg-dark-card' : 'bg-white'} px-5 pt-5 pb-10 z-10`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className={`mx-auto mb-4 w-10 h-1 rounded-full ${isDark ? 'bg-dark-border' : 'bg-gray-200'}`} />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-accent" />
                <h2 className="font-semibold text-base">What's New</h2>
              </div>
              <button type="button" onClick={handleClose} className="p-1 text-muted">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                  <p className="text-sm leading-relaxed">{f}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-accent/15 border border-accent/30 text-accent text-sm font-semibold active:scale-[0.98] transition-all"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
