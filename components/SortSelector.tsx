'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { SortOrder } from '@/lib/types';

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'dateAdded', label: 'Date Added' },
  { value: 'company', label: 'Company' },
  { value: 'lastContacted', label: 'Last Contacted' },
];

export default function SortSelector({
  value,
  onChange,
  isDark,
}: {
  value: SortOrder;
  onChange: (sort: SortOrder) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === value)?.label ?? 'Name';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
          isDark
            ? 'text-muted-light hover:bg-dark-border'
            : 'text-muted hover:bg-light-border'
        }`}
      >
        <ArrowUpDown size={12} />
        {currentLabel}
      </button>
      {open && (
        <div
          className={`absolute z-50 right-0 top-full mt-1 rounded-lg border shadow-lg overflow-hidden min-w-[140px] ${
            isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'
          }`}
        >
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                option.value === value
                  ? 'bg-accent/15 text-accent font-medium'
                  : isDark
                  ? 'text-muted-light hover:bg-dark-border'
                  : 'text-zinc-700 hover:bg-light-border'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
