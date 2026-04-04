'use client';

import { MapPin, GraduationCap, Briefcase, X } from 'lucide-react';
import type { ActiveFilter } from '@/lib/types';
import { capitalizeTag } from '@/lib/utils';

export default function FilterChips({
  filter,
  onFilterChange,
  topTags,
  isDark,
}: {
  filter: ActiveFilter;
  onFilterChange: (filter: ActiveFilter) => void;
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

  const fieldActiveStyle = 'bg-accent/15 text-accent';

  // Active field filters to show as removable chips
  const fieldChips: { label: string; icon: React.ReactNode; onRemove: () => void }[] = [];
  if (filter.homeLocation) {
    fieldChips.push({
      label: filter.homeLocation,
      icon: <MapPin size={11} />,
      onRemove: () => onFilterChange({ ...filter, homeLocation: null }),
    });
  }
  if (filter.university) {
    fieldChips.push({
      label: filter.university,
      icon: <GraduationCap size={11} />,
      onRemove: () => onFilterChange({ ...filter, university: null }),
    });
  }
  if (filter.company) {
    fieldChips.push({
      label: filter.company,
      icon: <Briefcase size={11} />,
      onRemove: () => onFilterChange({ ...filter, company: null }),
    });
  }

  const toggleTag = (tag: string) => {
    const isActive = filter.tags.includes(tag);
    const newTags = isActive
      ? filter.tags.filter((t) => t !== tag)
      : [...filter.tags, tag];
    onFilterChange({ ...filter, tags: newTags });
  };

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
      {classChips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onFilterChange({ ...filter, classification: chip.value })}
          className={`${chipBase} ${filter.classification === chip.value ? activeStyle : inactiveStyle}`}
        >
          {chip.label}
        </button>
      ))}

      {/* Active field filters */}
      {fieldChips.map((chip) => (
        <button
          key={chip.label}
          onClick={chip.onRemove}
          className={`${chipBase} ${fieldActiveStyle}`}
        >
          {chip.icon}
          {chip.label}
          <X size={12} />
        </button>
      ))}

      {topTags.map((tag) => {
        const isActive = filter.tags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`${chipBase} ${isActive ? activeStyle : inactiveStyle}`}
          >
            {capitalizeTag(tag)}
            {isActive && <X size={12} />}
          </button>
        );
      })}
    </div>
  );
}
