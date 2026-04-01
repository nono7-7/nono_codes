'use client';

import { UserPlus } from 'lucide-react';

export default function EmptyState({
  onAdd,
  isDark,
}: {
  onAdd: () => void;
  isDark: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
          isDark ? 'bg-dark-card' : 'bg-light-border'
        }`}
      >
        <UserPlus size={32} className="text-muted" />
      </div>
      <h3 className="font-[family-name:var(--font-outfit)] text-lg font-semibold mb-2">
        Your network starts here
      </h3>
      <p className="text-muted text-sm mb-8 text-center">
        Add your first connection to get started.
      </p>
      <button
        onClick={onAdd}
        className="bg-accent text-dark-bg px-6 py-3 rounded-lg font-[family-name:var(--font-outfit)] font-semibold text-sm active:scale-[0.98] transition-transform"
      >
        Add your first contact
      </button>
    </div>
  );
}
