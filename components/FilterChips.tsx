'use client';

import { X } from 'lucide-react';
import { capitalizeTag } from '@/lib/utils';

export default function FilterChips({
  classification,
  onClassification,
  activeTag,
  onTag,
  topTags,
  isDark,
}: {
  classification: 'all' | 'inner' | 'wider';
  onClassification: (v: 'all' | 'inner' | 'wider') => void;
  activeTag: string | null;
  onTag: (tag: string | null) => void;
  topTags: string[];
  isDark: boolean;
}) {
  const classChips: { label: string; value: 'all' | 'inner' | 'wider' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Inner', value: 'inner' },
    { label: 'Wider', value: 'wider' },
  ];

  const chipBase = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-[family-name:var(--font-outfit)] whitespace-nowrap transition-colors`;

  const activeStyle = 'bg-accent text-dark-bg';
  const inactiveStyle = isDark
    ? 'bg-dark-card text-muted-light hover:text-white'
    : 'bg-light-border text-muted hover:text-dark-bg';

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
      {classChips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onClassification(chip.value)}
          className={`${chipBase} ${classification === chip.value ? activeStyle : inactiveStyle}`}
        >
          {chip.label}
        </button>
      ))}

      {topTags.map((tag) => (
        <button
          key={tag}
          onClick={() => onTag(activeTag === tag ? null : tag)}
          className={`${chipBase} ${activeTag === tag ? activeStyle : inactiveStyle}`}
        >
          {capitalizeTag(tag)}
          {activeTag === tag && <X size={12} />}
        </button>
      ))}
    </div>
  );
}
