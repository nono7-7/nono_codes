'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Contact } from '@/lib/types';
import { capitalizeTag } from '@/lib/utils';

/* ── Stat Card ─────────────────────────────────────────── */

function StatCard({ label, value, isDark }: { label: string; value: number; isDark: boolean }) {
  return (
    <div
      className={`flex-1 p-4 rounded-lg border text-center ${
        isDark ? 'bg-dark-card border-dark-border' : 'bg-light-card border-light-border'
      }`}
    >
      <p className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-accent">
        {value}
      </p>
      <p className="text-[11px] text-muted mt-0.5 font-[family-name:var(--font-outfit)]">
        {label}
      </p>
    </div>
  );
}

/* ── Breakdown Row (with inner/wider split) ────────────── */

function BreakdownRow({
  label,
  total,
  inner,
  wider,
  max,
  onClick,
  isDark,
}: {
  label: string;
  total: number;
  inner: number;
  wider: number;
  max: number;
  onClick: () => void;
  isDark: boolean;
}) {
  const innerPct = max > 0 ? (inner / max) * 100 : 0;
  const widerPct = max > 0 ? (wider / max) * 100 : 0;

  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-2 group">
      <span className="text-sm flex-1 text-left truncate group-hover:text-accent transition-colors">
        {label}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-accent font-medium w-5 text-right">{inner}</span>
        <span className="text-[10px] text-muted">/</span>
        <span className={`text-[10px] font-medium w-5 text-left ${isDark ? 'text-muted-light' : 'text-muted'}`}>
          {wider}
        </span>
      </div>
      <span className="text-xs text-muted w-6 text-right font-medium">{total}</span>
      <div
        className={`w-24 h-2 rounded-full overflow-hidden flex ${
          isDark ? 'bg-dark-border' : 'bg-light-border'
        }`}
      >
        <div
          className="h-full bg-accent rounded-l-full transition-all"
          style={{ width: `${innerPct}%` }}
        />
        <div
          className={`h-full transition-all ${isDark ? 'bg-muted/40' : 'bg-muted/30'}`}
          style={{ width: `${widerPct}%` }}
        />
      </div>
    </button>
  );
}

/* ── Collapsible Section ───────────────────────────────── */

type BreakdownEntry = { label: string; total: number; inner: number; wider: number; filterValue: string };

function BreakdownSection({
  title,
  entries,
  onTap,
  isDark,
  defaultOpen = true,
}: {
  title: string;
  entries: BreakdownEntry[];
  onTap: (value: string) => void;
  isDark: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (entries.length === 0) return null;

  const maxTotal = entries[0].total;

  const sectionClass = `p-4 rounded-lg border ${
    isDark ? 'bg-dark-card border-dark-border' : 'bg-light-card border-light-border'
  }`;

  return (
    <div className={`${sectionClass} mb-3`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-1"
      >
        <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted">{entries.length}</span>
          {open ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
        </div>
      </button>

      {/* Legend */}
      {open && (
        <div className="flex items-center justify-end gap-3 mb-1 mt-1">
          <span className="flex items-center gap-1 text-[10px] text-accent">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" /> Inner
          </span>
          <span className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-muted-light' : 'text-muted'}`}>
            <span className={`w-2 h-2 rounded-full inline-block ${isDark ? 'bg-muted/40' : 'bg-muted/30'}`} /> Wider
          </span>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {entries.map((e) => (
              <BreakdownRow
                key={e.label}
                label={e.label}
                total={e.total}
                inner={e.inner}
                wider={e.wider}
                max={maxTotal}
                onClick={() => onTap(e.filterValue)}
                isDark={isDark}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Helper: build frequency map with inner/wider splits ── */

function buildBreakdown(
  contacts: Contact[],
  extractor: (c: Contact) => string[],
  minCount = 1,
): BreakdownEntry[] {
  const map: Record<string, { total: number; inner: number; wider: number }> = {};

  for (const c of contacts) {
    const values = extractor(c);
    for (const raw of values) {
      const v = raw.trim();
      if (!v) continue;
      if (!map[v]) map[v] = { total: 0, inner: 0, wider: 0 };
      map[v].total++;
      if (c.classification === 'inner') map[v].inner++;
      else map[v].wider++;
    }
  }

  return Object.entries(map)
    .filter(([, data]) => data.total >= minCount)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([label, data]) => ({
      label,
      filterValue: label,
      ...data,
    }));
}

/* ── Main Component ────────────────────────────────────── */

export type NetworkFilterAction = {
  field: 'homeLocation' | 'company' | 'university' | 'role' | 'tag' | 'search';
  value: string;
};

export default function NetworkView({
  contacts,
  onFilter,
  isDark,
}: {
  contacts: Contact[];
  onFilter: (action: NetworkFilterAction) => void;
  isDark: boolean;
}) {
  const total = contacts.length;
  const inner = contacts.filter((c) => c.classification === 'inner').length;
  const wider = total - inner;

  // Breakdowns by every meaningful field
  const byLocation = useMemo(
    () => buildBreakdown(contacts, (c) => [c.homeLocation]),
    [contacts]
  );

  const byWhereMet = useMemo(
    () => buildBreakdown(contacts, (c) => [c.whereMet]),
    [contacts]
  );

  const byEvent = useMemo(
    () => buildBreakdown(contacts, (c) => [c.eventOrContext]),
    [contacts]
  );

  const byCompany = useMemo(
    () => buildBreakdown(contacts, (c) => [c.company]),
    [contacts]
  );

  const byUniversity = useMemo(
    () => buildBreakdown(contacts, (c) => [c.university]),
    [contacts]
  );

  const byTag = useMemo(
    () =>
      buildBreakdown(contacts, (c) => c.tags).map((e) => ({
        ...e,
        label: capitalizeTag(e.label),
        filterValue: e.filterValue,
      })),
    [contacts]
  );

  const byNationality = useMemo(
    () => buildBreakdown(contacts, (c) => [c.nationality]),
    [contacts]
  );

  const byRole = useMemo(
    () => buildBreakdown(contacts, (c) => [c.role]),
    [contacts]
  );

  const recent = useMemo(
    () =>
      [...contacts]
        .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
        .slice(0, 5),
    [contacts]
  );

  const sectionClass = `p-4 rounded-lg border ${
    isDark ? 'bg-dark-card border-dark-border' : 'bg-light-card border-light-border'
  }`;

  if (contacts.length === 0) {
    return (
      <div className="pt-4 px-4">
        <h1 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight mb-6">
          Network
        </h1>
        <p className="text-center text-muted py-16 text-sm">
          Add contacts to see your network overview.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="pt-4 px-4 pb-4"
    >
      <h1 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight mb-4">
        Network
      </h1>

      {/* Top stats */}
      <div className="flex gap-2 mb-4">
        <StatCard label="Total" value={total} isDark={isDark} />
        <StatCard label="Inner" value={inner} isDark={isDark} />
        <StatCard label="Wider" value={wider} isDark={isDark} />
      </div>

      {/* All breakdowns */}
      <BreakdownSection
        title="By Location"
        entries={byLocation}
        onTap={(v) => onFilter({ field: 'homeLocation', value: v })}
        isDark={isDark}
      />

      <BreakdownSection
        title="By Company"
        entries={byCompany}
        onTap={(v) => onFilter({ field: 'company', value: v })}
        isDark={isDark}
      />

      <BreakdownSection
        title="By University"
        entries={byUniversity}
        onTap={(v) => onFilter({ field: 'university', value: v })}
        isDark={isDark}
      />

      <BreakdownSection
        title="By Tag"
        entries={byTag}
        onTap={(v) => onFilter({ field: 'tag', value: v })}
        isDark={isDark}
      />

      <BreakdownSection
        title="By Event / Context"
        entries={byEvent}
        onTap={(v) => onFilter({ field: 'search', value: v })}
        isDark={isDark}
        defaultOpen={false}
      />

      <BreakdownSection
        title="By Where Met"
        entries={byWhereMet}
        onTap={(v) => onFilter({ field: 'search', value: v })}
        isDark={isDark}
        defaultOpen={false}
      />

      <BreakdownSection
        title="By Role"
        entries={byRole}
        onTap={(v) => onFilter({ field: 'role', value: v })}
        isDark={isDark}
      />

      <BreakdownSection
        title="By Nationality"
        entries={byNationality}
        onTap={(v) => onFilter({ field: 'search', value: v })}
        isDark={isDark}
        defaultOpen={false}
      />

      {/* Recent additions */}
      {recent.length > 0 && (
        <div className={sectionClass}>
          <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Recently Added
          </h3>
          <div className="space-y-2">
            {recent.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-1">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium truncate block">{c.name}</span>
                  {(c.role || c.company) && (
                    <span className="text-xs text-muted truncate block">
                      {c.role}{c.role && c.company ? ' @ ' : ''}{c.company}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      c.classification === 'inner'
                        ? 'bg-accent/15 text-accent'
                        : isDark
                        ? 'bg-dark-border text-muted-light'
                        : 'bg-light-border text-muted'
                    }`}
                  >
                    {c.classification === 'inner' ? 'Inner' : 'Wider'}
                  </span>
                  <span className="text-xs text-muted">
                    {c.dateAdded && !isNaN(new Date(c.dateAdded).getTime())
                      ? new Date(c.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
