'use client';

import { useMemo } from 'react';
import { CalendarClock, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Contact, PlannedInteraction } from '@/lib/types';
import { getPlannedDue } from '@/lib/utils';

export default function PlannedBanner({
  contacts,
  dismissed,
  onDismiss,
  onSelect,
  onComplete,
  isDark,
}: {
  contacts: Contact[];
  dismissed: boolean;
  onDismiss: () => void;
  onSelect: (contact: Contact) => void;
  onComplete: (contactId: string, plannedId: string) => void;
  isDark: boolean;
}) {
  const due = useMemo(() => getPlannedDue(contacts), [contacts]);

  if (due.length === 0 || dismissed) return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`mx-4 mb-3 rounded-lg border overflow-hidden ${
          isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-500/5 border-blue-500/15'
        }`}
      >
        <div className="px-4 py-3 flex items-start gap-3">
          <CalendarClock size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold font-[family-name:var(--font-outfit)] text-blue-400 mb-1">
              {due.length === 1 ? 'Planned Interaction Due' : `${due.length} Planned Interactions Due`}
            </p>
            <div className="space-y-1.5">
              {due.slice(0, 5).map(({ contact: c, planned: p }) => (
                <div key={p.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onSelect(c)}
                    className="text-sm hover:text-blue-400 transition-colors truncate flex-1 text-left"
                  >
                    {c.name}
                    <span className="text-xs text-muted ml-1.5">
                      {p.description}
                      {p.date < today && ' (overdue)'}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete(c.id, p.id);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-400/15 text-blue-400 shrink-0 active:scale-[0.9] transition-transform"
                    title="Mark as done & log interaction"
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
              {due.length > 5 && (
                <p className="text-xs text-muted">+{due.length - 5} more</p>
              )}
            </div>
          </div>
          <button onClick={onDismiss} className="text-muted hover:text-blue-400 shrink-0">
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
