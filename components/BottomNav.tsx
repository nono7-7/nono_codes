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
        isDark
          ? 'bg-dark-bg/95 border-dark-border backdrop-blur-md'
          : 'bg-light-bg/95 border-light-border backdrop-blur-md'
      }`}
      style={{ boxShadow: isDark ? '0 -4px 24px rgba(0,0,0,0.3)' : '0 -4px 24px rgba(0,0,0,0.06)' }}
    >
      <div className="mx-auto max-w-[480px] flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center gap-1 px-5 py-2 relative flex-1 rounded-xl transition-all duration-150"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className={`absolute inset-0 rounded-xl ${isDark ? 'bg-accent/10' : 'bg-accent/8'}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={`transition-colors duration-150 ${isActive ? 'text-accent' : 'text-muted'}`}
                />
              </motion.div>
              <span
                className={`text-[11px] font-[family-name:var(--font-outfit)] transition-all duration-150 relative ${
                  isActive ? 'text-accent font-bold' : 'text-muted font-medium'
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
