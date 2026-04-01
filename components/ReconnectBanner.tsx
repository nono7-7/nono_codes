'use client';

import { useMemo } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Contact } from '@/lib/types';
import { getOverdueContacts } from '@/lib/utils';

function weeksOverdue(contact: Contact): number {
  if (!contact.reconnectIntervalWeeks) return 0;
  const last = contact.lastContacted ? new Date(contact.lastContacted).getTime() : 0;
  const elapsed = Date.now() - last;
  const intervalMs = contact.reconnectIntervalWeeks * 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((elapsed - intervalMs) / (7 * 24 * 60 * 60 * 1000)));
}

export default function ReconnectBanner({
  contacts,
  enabled,
  dismissed,
  onDismiss,
  onSelect,
  onMarkContacted,
  isDark,
}: {
  contacts: Contact[];
  enabled: boolean;
  dismissed: boolean;
  onDismiss: () => void;
  onSelect: (contact: Contact) => void;
  onMarkContacted: (contactId: string) => void;
  isDark: boolean;
}) {
  const overdue = useMemo(() => getOverdueContacts(contacts), [contacts]);

  if (!enabled || overdue.length === 0 || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`mx-4 mb-3 rounded-lg border overflow-hidden ${
          isDark ? 'bg-accent/10 border-accent/20' : 'bg-accent/5 border-accent/15'
        }`}
      >
        <div className="px-4 py-3 flex items-start gap-3">
          <Bell size={18} className="text-accent shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold font-[family-name:var(--font-outfit)] text-accent mb-1">
              {overdue.length === 1 ? 'Time to Reconnect' : `${overdue.length} People to Reconnect With`}
            </p>
            <div className="space-y-1.5">
              {overdue.slice(0, 5).map((c) => {
                const weeks = weeksOverdue(c);
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <button
                      onClick={() => onSelect(c)}
                      className="text-sm hover:text-accent transition-colors truncate flex-1 text-left"
                    >
                      {c.name}
                      <span className="text-xs text-muted ml-1.5">
                        {weeks > 0 ? `${weeks}w overdue` : 'due'}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkContacted(c.id);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-accent/15 text-accent shrink-0 active:scale-[0.9] transition-transform"
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
              {overdue.length > 5 && (
                <p className="text-xs text-muted">+{overdue.length - 5} more</p>
              )}
            </div>
          </div>
          <button onClick={onDismiss} className="text-muted hover:text-accent shrink-0">
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
