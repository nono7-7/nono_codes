'use client';

import { Users, Globe, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Tab } from '@/lib/types';

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'network', label: 'Network', icon: Globe },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function BottomNav({
  active,
  onChange,
  isDark,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  isDark: boolean;
}) {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 border-t ${
        isDark ? 'bg-dark-bg border-dark-border' : 'bg-light-bg border-light-border'
      }`}
    >
      <div className="mx-auto max-w-[480px] flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center gap-1 px-6 py-2 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-3 right-3 h-0.5 bg-accent rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                size={20}
                className={isActive ? 'text-accent' : 'text-muted'}
              />
              <span
                className={`text-[11px] font-medium font-[family-name:var(--font-outfit)] ${
                  isActive ? 'text-accent' : 'text-muted'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
