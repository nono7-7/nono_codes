'use client';

import { useState } from 'react';
import { Plus, Phone, MessageCircle, Link2, CalendarDays, Coffee, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Interaction, InteractionType } from '@/lib/types';

const TYPES: { value: InteractionType; label: string }[] = [
  { value: 'coffee',   label: 'Coffee'   },
  { value: 'call',     label: 'Call'     },
  { value: 'message',  label: 'Message'  },
  { value: 'event',    label: 'Event'    },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'other',    label: 'Other'    },
];

function TypeIcon({ type, size = 13 }: { type?: InteractionType; size?: number }) {
  const cls = 'shrink-0 mt-0.5';
  switch (type) {
    case 'coffee':   return <Coffee   size={size} className={`${cls} text-amber-400`}  />;
    case 'call':     return <Phone    size={size} className={`${cls} text-green-400`}  />;
    case 'message':  return <MessageCircle size={size} className={`${cls} text-blue-400`} />;
    case 'event':    return <CalendarDays  size={size} className={`${cls} text-purple-400`} />;
    case 'linkedin': return <Link2    size={size} className={`${cls} text-sky-400`}   />;
    default:         return <MessageCircle size={size} className={`${cls} text-accent`} />;
  }
}

export default function InteractionLog({
  interactions,
  onAdd,
  onDelete,
  isDark,
}: {
  interactions: Interaction[];
  onAdd: (date: string, note: string, type?: InteractionType, duration?: string, initiator?: 'you' | 'them') => void;
  onDelete?: (interactionId: string) => void;
  isDark: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [type, setType] = useState<InteractionType | undefined>(undefined);
  const [duration, setDuration] = useState('');
  const [initiator, setInitiator] = useState<'you' | 'them' | undefined>(undefined);
  const [filterType, setFilterType] = useState<InteractionType | 'all'>('all');

  const handleSubmit = () => {
    if (!date) return;
    onAdd(date, note.trim(), type, duration.trim() || undefined, initiator);
    setNote('');
    setDuration('');
    setType(undefined);
    setInitiator(undefined);
    setDate(new Date().toISOString().slice(0, 10));
    setShowForm(false);
  };

  const inputClass = `w-full px-3 py-2 rounded-lg text-sm outline-none border ${
    isDark
      ? 'bg-dark-bg border-dark-border text-white placeholder:text-muted'
      : 'bg-light-bg border-light-border text-dark-bg placeholder:text-muted'
  }`;

  const pillBase = 'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors';

  const sorted = [...interactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filtered = filterType === 'all'
    ? sorted
    : sorted.filter((i) => i.type === filterType);

  // Only show type filter if there's more than one type present
  const usedTypes = [...new Set(interactions.map((i) => i.type).filter(Boolean))] as InteractionType[];
  const showFilter = usedTypes.length > 1 || (usedTypes.length === 1 && interactions.some((i) => !i.type));

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

      {/* Log form */}
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
              {/* Date */}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />

              {/* Type pills */}
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(type === t.value ? undefined : t.value)}
                    className={`${pillBase} ${
                      type === t.value
                        ? 'bg-accent text-dark-bg'
                        : isDark
                        ? 'bg-dark-border text-muted-light'
                        : 'bg-light-border text-muted'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Initiator toggle */}
              <div className="flex gap-2">
                {(['you', 'them'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setInitiator(initiator === v ? undefined : v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      initiator === v
                        ? 'bg-accent text-dark-bg'
                        : isDark
                        ? 'bg-dark-border text-muted-light'
                        : 'bg-light-border text-muted'
                    }`}
                  >
                    {v === 'you' ? 'You reached out' : 'They reached out'}
                  </button>
                ))}
              </div>

              {/* Duration */}
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Duration (e.g. 30 min, 1 hour) — optional"
                className={inputClass}
              />

              {/* Note */}
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
                  className={`px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'text-muted-light' : 'text-muted'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Type filter */}
      {showFilter && sorted.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button
            onClick={() => setFilterType('all')}
            className={`${pillBase} ${filterType === 'all' ? 'bg-accent text-dark-bg' : isDark ? 'bg-dark-border text-muted-light' : 'bg-light-border text-muted'}`}
          >
            All
          </button>
          {usedTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(filterType === t ? 'all' : t)}
              className={`${pillBase} ${filterType === t ? 'bg-accent text-dark-bg' : isDark ? 'bg-dark-border text-muted-light' : 'bg-light-border text-muted'}`}
            >
              {TYPES.find((x) => x.value === t)?.label ?? t}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted italic">
          {sorted.length === 0 ? 'No interactions logged yet.' : 'No interactions match this filter.'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((interaction) => (
            <div key={interaction.id} className="flex items-start gap-2.5">
              <TypeIcon type={interaction.type} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs text-muted">
                    {new Date(interaction.date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                  {interaction.duration && (
                    <span className="text-[10px] text-muted">· {interaction.duration}</span>
                  )}
                  {interaction.initiator && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${interaction.initiator === 'you' ? 'text-accent' : 'text-muted'}`}>
                      {interaction.initiator === 'you'
                        ? <ArrowUpRight size={10} />
                        : <ArrowDownLeft size={10} />}
                      {interaction.initiator === 'you' ? 'You' : 'Them'}
                    </span>
                  )}
                </div>
                {interaction.note && (
                  <p className="text-sm mt-0.5">{interaction.note}</p>
                )}
              </div>
              {onDelete && (
                <button
                  onClick={() => onDelete(interaction.id)}
                  className="text-muted/40 hover:text-red-400 transition-colors mt-0.5 shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
