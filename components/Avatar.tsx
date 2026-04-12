'use client';

import { getInitials, getAvatarColor } from '@/lib/avatar';

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-20 h-20 text-xl',
};

export default function Avatar({
  name,
  photoUrl,
  size = 'sm',
}: {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  isDark?: boolean;
}) {
  const sizeClass = SIZES[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }

  const initials = getInitials(name);
  const color = getAvatarColor(name);

  return (
    <div
      className={`${sizeClass} rounded-full shrink-0 flex items-center justify-center font-semibold font-[family-name:var(--font-outfit)] text-white`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
