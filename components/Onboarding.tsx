'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Search, ArrowRight, MapPin, Globe, Bell, QrCode } from 'lucide-react';

const slides = [
  {
    icon: UserPlus,
    title: 'Add Your Connections',
    description: 'Quickly save anyone you meet — their name, role, company, how you met, and more. Only the name is required, everything else is optional.',
    example: (
      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-left text-xs space-y-1.5 mt-4">
        <p className="font-semibold text-sm">Marco Rodriguez</p>
        <p className="text-muted">Investment Analyst @ Goldman Sachs</p>
        <p className="text-muted flex items-center gap-1"><MapPin size={10} /> London</p>
        <p className="text-muted italic">Met at GS Banking Academy in London, Summer 2024</p>
      </div>
    ),
  },
  {
    icon: Search,
    title: 'Search Everything',
    description: 'Find anyone instantly. Search by name, company, event where you met, location, tags, or even your notes. Combine filters to narrow down.',
    example: (
      <div className="mt-4 space-y-2">
        <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-muted">
          🔍 &quot;Goldman&quot; → finds all Goldman Sachs contacts
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-muted">
          🔍 &quot;Madrid&quot; → finds everyone you met in Madrid
        </div>
      </div>
    ),
  },
  {
    icon: Globe,
    title: 'See Your Network',
    description: 'Get a visual breakdown of your connections by location, company, tags, events, and more. See inner circle vs wider network splits at a glance.',
    example: (
      <div className="mt-4 space-y-1.5 text-xs">
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <span>London</span>
          <span className="text-accent">12 contacts</span>
        </div>
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <span>Madrid</span>
          <span className="text-accent">8 contacts</span>
        </div>
      </div>
    ),
  },
  {
    icon: Bell,
    title: 'Stay Connected',
    description: 'Set reconnect reminders on any contact and InTouch will nudge you when it\'s time to reach out. Log interactions to keep track of your conversations.',
    example: (
      <div className="mt-4 space-y-1.5 text-xs">
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <span>Sarah Chen</span>
          <span className="text-accent">2w overdue</span>
        </div>
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <span>James Park</span>
          <span className="text-accent">due today</span>
        </div>
      </div>
    ),
  },
  {
    icon: QrCode,
    title: 'Share Your Card',
    description: 'Generate your personal QR code from Settings. Anyone can scan it to instantly add you as a contact — no typing needed.',
    example: (
      <div className="mt-4 flex justify-center">
        <div className="bg-white p-3 rounded-xl inline-block">
          {/* Mock QR code */}
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)', width: 84 }}>
            {[
              1,1,1,1,1,1,1,
              1,0,0,0,0,0,1,
              1,0,1,0,1,0,1,
              1,0,0,1,0,0,1,
              1,0,1,0,1,0,1,
              1,0,0,0,0,0,1,
              1,1,1,1,1,1,1,
            ].map((v, i) => (
              <div key={i} className={`w-3 h-3 rounded-[1px] ${v ? 'bg-zinc-900' : 'bg-white'}`} />
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: ArrowRight,
    title: 'You\'re All Set',
    description: 'Your data stays on your device. No tracking, no uploads. Start building your network — it only takes seconds to add someone.',
    example: null,
  },
];

export default function Onboarding({
  onComplete,
  isDark,
}: {
  onComplete: () => void;
  isDark: boolean;
}) {
  const [step, setStep] = useState(0);
  const isLast = step === slides.length - 1;
  const slide = slides[step];
  const Icon = slide.icon;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6 ${isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-zinc-900'}`}>
      <div className="w-full max-w-[380px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${isDark ? 'bg-dark-card' : 'bg-light-border'}`}>
              <Icon size={28} className="text-accent" />
            </div>

            {/* Title */}
            <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold tracking-tight mb-3">
              {slide.title}
            </h2>

            {/* Description */}
            <p className="text-muted text-sm leading-relaxed">
              {slide.description}
            </p>

            {/* Example */}
            {slide.example}
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-8 mb-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-accent' : 'w-1.5 bg-muted/30'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onComplete}
            className="text-xs text-muted hover:text-accent transition-colors px-3 py-2"
          >
            Skip
          </button>
          <button
            onClick={() => (isLast ? onComplete() : setStep(step + 1))}
            className="flex-1 py-3 rounded-lg bg-accent text-dark-bg text-sm font-semibold font-[family-name:var(--font-outfit)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {isLast ? 'Get Started' : 'Next'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
