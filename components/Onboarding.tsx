'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Search, Globe, Bell, QrCode, ArrowRight,
  MessageCircle, CalendarClock, FileSpreadsheet, MapPin, Tag, Check, AtSign, Cloud, Smartphone, Monitor,
} from 'lucide-react';

// Example card/row classes that adapt to dark/light
const card = 'bg-accent/5 border border-accent/15 rounded-lg';
const cardXl = 'bg-accent/5 border border-accent/15 rounded-xl';
const blueCard = 'bg-blue-500/10 border border-blue-500/20 rounded-lg';
const greenCard = 'bg-green-500/10 border border-green-500/20 rounded-lg';
const amberCard = 'bg-amber-500/10 border border-amber-500/20 rounded-lg';
const mutedCard = 'bg-muted/5 border border-muted/15 rounded-lg';

const slides = [
  // ── 1. Add Connections ──────────────────────────────────────────
  {
    icon: UserPlus,
    color: 'bg-accent/15',
    title: 'Add Anyone in Seconds',
    description:
      'Save a contact the moment you meet them. Name is the only required field — add role, company, how you met, location, notes, and more at your own pace.',
    example: (
      <div className={`${cardXl} p-3.5 text-left text-xs space-y-1.5 mt-4`}>
        <p className="font-semibold text-sm">Marco Rodriguez</p>
        <p className="text-muted">Investment Analyst @ Goldman Sachs</p>
        <p className="text-muted flex items-center gap-1">
          <MapPin size={10} /> London
        </p>
        <p className="text-muted italic">Met at GS Banking Academy, Summer 2024</p>
        <div className="flex gap-1.5 flex-wrap pt-0.5">
          {['finance', 'banking', 'ib'].map((t) => (
            <span key={t} className="bg-accent/20 text-accent px-1.5 py-0.5 rounded text-[10px]">
              {t}
            </span>
          ))}
        </div>
      </div>
    ),
  },

  // ── 2. Search & Filter ──────────────────────────────────────────
  {
    icon: Search,
    color: 'bg-accent/15',
    title: 'Search & Filter Everything',
    description:
      'Find anyone instantly across name, company, notes, events, tags, location, and more. Stack multiple tag filters to pinpoint exactly who you need.',
    example: (
      <div className="mt-4 space-y-2 text-xs">
        <div className={`${card} px-3 py-2 flex items-center gap-2`}>
          <Tag size={11} className="text-accent" />
          <span className="text-accent font-medium">Investment Banking</span>
          <span className="text-muted">+</span>
          <MapPin size={11} className="text-accent" />
          <span className="text-accent font-medium">Madrid</span>
          <span className="text-muted ml-auto">4</span>
        </div>
        <div className={`${mutedCard} px-3 py-2 text-muted`}>
          Search &quot;IE&quot; &rarr; all IE Business School contacts
        </div>
        <div className={`${mutedCard} px-3 py-2 text-muted`}>
          Search &quot;Goldman&quot; &rarr; everyone at Goldman Sachs
        </div>
      </div>
    ),
  },

  // ── 3. Log Interactions ─────────────────────────────────────────
  {
    icon: MessageCircle,
    color: 'bg-blue-500/15',
    title: 'Log Every Interaction',
    description:
      'Track every conversation, coffee, or call. Open any contact and log a note with a date — build a full history of your relationship over time.',
    example: (
      <div className="mt-4 space-y-2 text-xs">
        {[
          { date: 'Mar 2025', note: 'Coffee at IE campus — discussed VC internship' },
          { date: 'Jan 2025', note: 'Connected at GS Alumni drinks in London' },
        ].map((item, i) => (
          <div key={i} className={`${blueCard} px-3 py-2.5 flex items-start gap-2.5`}>
            <MessageCircle size={12} className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-muted mb-0.5">{item.date}</p>
              <p className="text-sm">{item.note}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },

  // ── 4. Plan Future Interactions ─────────────────────────────────
  {
    icon: CalendarClock,
    color: 'bg-blue-500/15',
    title: 'Plan & Get Reminded',
    description:
      'Schedule a future interaction with a date. InTouch sends you an email reminder 2 days before and on the day — then prompts you to log how it went. Email reminders are on by default and can be changed in Settings.',
    example: (
      <div className="mt-4 space-y-2 text-xs">
        <div className={`${blueCard} px-3 py-2.5 flex items-start gap-2.5`}>
          <CalendarClock size={12} className="text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-blue-400 font-medium mb-0.5">Sarah Chen — Today</p>
            <p className="text-sm">Catch-up call re: summer internship</p>
          </div>
          <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center shrink-0">
            <Check size={10} className="text-blue-400" strokeWidth={3} />
          </div>
        </div>
        <div className={`${mutedCard} px-3 py-2.5 flex items-start gap-2.5`}>
          <CalendarClock size={12} className="text-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-muted mb-0.5">James Park — Apr 18</p>
            <p className="text-sm">Lunch near Canary Wharf</p>
          </div>
        </div>
        <div className={`${mutedCard} px-3 py-2 flex items-center gap-2`}>
          <AtSign size={11} className="text-muted shrink-0" />
          <p className="text-muted text-[10px]">Email reminders 2 days before &amp; day of &middot; toggle in Settings</p>
        </div>
      </div>
    ),
  },

  // ── 5. Reconnect Reminders ──────────────────────────────────────
  {
    icon: Bell,
    color: 'bg-accent/15',
    title: 'Never Lose Touch',
    description:
      'Set a recurring reminder on any contact — every 2, 4, 8, or 12 weeks — or pick a specific date. InTouch tells you when it\'s time to reach out.',
    example: (
      <div className="mt-4 space-y-1.5 text-xs">
        <div className={`${card} px-3 py-2.5 flex items-center gap-2.5`}>
          <Bell size={12} className="text-accent shrink-0" />
          <p className="text-accent font-medium">2 People to Reconnect With</p>
        </div>
        {[
          { name: 'Sarah Chen', status: '2w overdue' },
          { name: 'James Park', status: 'due today' },
        ].map((c) => (
          <div key={c.name} className={`${mutedCard} flex items-center justify-between px-3 py-2`}>
            <span className="text-sm">{c.name}</span>
            <span className="text-accent font-medium">{c.status}</span>
          </div>
        ))}
      </div>
    ),
  },

  // ── 6. Network View ─────────────────────────────────────────────
  {
    icon: Globe,
    color: 'bg-accent/15',
    title: 'See Your Network',
    description:
      'Get a live breakdown of your connections by location, company, university, tags, and more. Tap any row to instantly filter your contacts list.',
    example: (
      <div className="mt-4 space-y-1.5 text-xs">
        {[
          { label: 'London', inner: 8, wider: 12 },
          { label: 'Madrid', inner: 3, wider: 5 },
          { label: 'New York', inner: 2, wider: 4 },
        ].map((row) => (
          <div key={row.label} className={`${mutedCard} px-3 py-2 flex items-center gap-3`}>
            <span className="flex-1 text-sm">{row.label}</span>
            <span className="text-accent text-[10px]">{row.inner}</span>
            <span className="text-muted text-[10px]">/</span>
            <span className="text-muted text-[10px]">{row.wider}</span>
            <div className="w-16 h-1.5 rounded-full bg-muted/15 overflow-hidden flex">
              <div className="h-full bg-accent" style={{ width: `${(row.inner / (row.inner + row.wider)) * 100}%` }} />
              <div className="h-full bg-muted/30" style={{ width: `${(row.wider / (row.inner + row.wider)) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },

  // ── 7. Bulk Import ──────────────────────────────────────────────
  {
    icon: FileSpreadsheet,
    color: 'bg-green-500/15',
    title: 'Import from Spreadsheets',
    description:
      'Already have contacts in a CSV or Excel file? Upload it and InTouch auto-maps the columns, flags duplicates, and lets you review before saving.',
    example: (
      <div className="mt-4 space-y-2 text-xs">
        <div className={`${mutedCard} !rounded-xl p-3 space-y-2`}>
          <p className="text-muted mb-1">Detected columns:</p>
          {[
            { col: 'Full Name', field: 'Name' },
            { col: 'Work Email', field: 'Email' },
            { col: 'Organisation', field: 'Company' },
            { col: 'Mobile', field: 'Phone' },
          ].map((row) => (
            <div key={row.col} className="flex items-center gap-2">
              <span className="text-muted w-24 truncate">{row.col}</span>
              <ArrowRight size={10} className="text-muted shrink-0" />
              <span className="text-accent font-medium">{row.field}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className={`flex-1 ${greenCard} px-2 py-1.5 text-center`}>
            <p className="text-green-500 font-bold text-sm">54</p>
            <p className="text-muted text-[10px]">Ready</p>
          </div>
          <div className={`flex-1 ${amberCard} px-2 py-1.5 text-center`}>
            <p className="text-amber-500 font-bold text-sm">3</p>
            <p className="text-muted text-[10px]">Duplicate</p>
          </div>
          <div className={`flex-1 ${mutedCard} px-2 py-1.5 text-center`}>
            <p className="text-muted font-bold text-sm">0</p>
            <p className="text-muted text-[10px]">Invalid</p>
          </div>
        </div>
      </div>
    ),
  },

  // ── 8. QR Code ──────────────────────────────────────────────────
  {
    icon: QrCode,
    color: 'bg-accent/15',
    title: 'Share Your Card',
    description:
      'Generate your personal QR code from Settings. Choose which fields to share — phone, email, LinkedIn, location — and let anyone scan to add you instantly.',
    example: (
      <div className="mt-4 flex items-center gap-4 justify-center">
        <div className="bg-white p-3 rounded-xl border border-muted/15">
          <div
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: 'repeat(7, 1fr)', width: 84 }}
          >
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
        <div className="text-xs text-left space-y-2">
          {['Name', 'Phone', 'Email', 'LinkedIn'].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent flex items-center justify-center">
                <Check size={8} strokeWidth={3} className="text-white" />
              </div>
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 9. Cloud Sync ───────────────────────────────────────────────
  {
    icon: Cloud,
    color: 'bg-accent/15',
    title: 'Always In Sync',
    description:
      'Cloud sync is on by default. Your contacts and profile stay identical across every device you log into — phone, laptop, or tablet. Turn it off any time in Settings.',
    example: (
      <div className="mt-4 space-y-2.5 text-xs">
        <div className={`${card} px-3 py-2.5 flex items-center gap-3`}>
          <Smartphone size={14} className="text-accent shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">iPhone</p>
            <p className="text-muted text-[10px]">Add a contact → saved instantly</p>
          </div>
          <Cloud size={12} className="text-accent" />
        </div>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-px h-3 bg-accent/30" />
            <p className="text-[10px] text-accent font-medium">syncs automatically</p>
            <div className="w-px h-3 bg-accent/30" />
          </div>
        </div>
        <div className={`${card} px-3 py-2.5 flex items-center gap-3`}>
          <Monitor size={14} className="text-accent shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Laptop</p>
            <p className="text-muted text-[10px]">Log in → all contacts appear</p>
          </div>
          <Cloud size={12} className="text-accent" />
        </div>
        <div className={`${mutedCard} px-3 py-2 flex items-center gap-2`}>
          <Check size={11} className="text-accent shrink-0" strokeWidth={3} />
          <p className="text-muted text-[10px]">Contacts &amp; profile info sync · toggle off anytime in Settings</p>
        </div>
      </div>
    ),
  },

  // ── 10. All Set ──────────────────────────────────────────────────
  {
    icon: ArrowRight,
    color: 'bg-accent/15',
    title: "You're All Set",
    description:
      'Start building your network — it only takes seconds to add someone.',
    example: (
      <div className="mt-6 space-y-2.5 text-xs text-left">
        {[
          'Add contacts as you meet people',
          'Log interactions to track relationships',
          'Plan future meetings with email reminders',
          'Import existing contacts from CSV / XLSX',
          'Share your card via QR code',
          'Everything synced across all your devices',
        ].map((tip) => (
          <div key={tip} className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
              <Check size={9} className="text-accent" strokeWidth={3} />
            </div>
            <span className="text-sm">{tip}</span>
          </div>
        ))}
      </div>
    ),
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
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-6 py-8 ${
        isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-zinc-900'
      }`}
    >
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
            <div
              className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${slide.color}`}
            >
              <Icon size={28} className="text-accent" />
            </div>

            {/* Title */}
            <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold tracking-tight mb-3">
              {slide.title}
            </h2>

            {/* Description */}
            <p className="text-muted text-sm leading-relaxed">{slide.description}</p>

            {/* Example */}
            {slide.example}
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-8 mb-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-5 bg-accent' : 'w-1.5 bg-muted/30'
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
            {!isLast && <ArrowRight size={16} />}
          </button>
        </div>

        {/* Step counter */}
        <p className="text-center text-[11px] text-muted/50 mt-3">
          {step + 1} of {slides.length}
        </p>
      </div>
    </div>
  );
}
