'use client';

import { useMemo } from 'react';
import { Cake, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Contact } from '@/lib/types';

export default function BirthdayBanner({
  contacts,
  dismissed,
  onDismiss,
  onSelect,
  isDark,
}: {
  contacts: Contact[];
  dismissed: boolean;
  onDismiss: () => void;
  onSelect: (contact: Contact) => void;
  isDark: boolean;
}) {
  const birthdayContacts = useMemo(() => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `-${month}-${day}`;

    return contacts.filter((c) => c.birthday && c.birthday.endsWith(todayStr));
  }, [contacts]);

  if (birthdayContacts.length === 0 || dismissed) return null;

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
          <Cake size={18} className="text-accent shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold font-[family-name:var(--font-outfit)] text-accent mb-1">
              {birthdayContacts.length === 1 ? 'Birthday Today!' : `${birthdayContacts.length} Birthdays Today!`}
            </p>
            <div className="space-y-1">
              {birthdayContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="text-sm hover:text-accent transition-colors block truncate"
                >
                  🎂 {c.name}
                  {c.company ? ` — ${c.company}` : ''}
                </button>
              ))}
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
