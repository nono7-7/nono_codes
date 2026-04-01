'use client';

import { useState } from 'react';
import { Plus, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Interaction } from '@/lib/types';

export default function InteractionLog({
  interactions,
  onAdd,
  isDark,
}: {
  interactions: Interaction[];
  onAdd: (date: string, note: string) => void;
  isDark: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!date) return;
    onAdd(date, note.trim());
    setNote('');
    setDate(new Date().toISOString().slice(0, 10));
    setShowForm(false);
  };

  const inputClass = `w-full px-3 py-2 rounded-lg text-sm outline-none border ${
    isDark
      ? 'bg-dark-bg border-dark-border text-white placeholder:text-muted'
      : 'bg-light-bg border-light-border text-dark-bg placeholder:text-muted'
  }`;

  const sorted = [...interactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider">
          Interactions
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-[11px] text-accent font-medium"
        >
          <Plus size={14} />
          Log
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mb-3"
          >
            <div className="space-y-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Quick note (optional)..."
                className={inputClass}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold font-[family-name:var(--font-outfit)] bg-accent text-dark-bg active:scale-[0.98] transition-transform"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium ${
                    isDark ? 'text-muted-light' : 'text-muted'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted italic">No interactions logged yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((interaction) => (
            <div key={interaction.id} className="flex items-start gap-2.5">
              <MessageCircle size={13} className="text-accent mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted">
                  {new Date(interaction.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                {interaction.note && (
                  <p className="text-sm mt-0.5">{interaction.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
