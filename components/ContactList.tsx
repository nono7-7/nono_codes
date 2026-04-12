'use client';

import { useMemo } from 'react';
import { Search, Plus, MapPin, Mail, Phone, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Contact, ActiveFilter, SortOrder } from '@/lib/types';
import { filterContacts, sortContacts, getTopTags, capitalizeTag, getDisplayJob, getDisplayEducation, hasActiveFilters } from '@/lib/utils';
import FilterChips from './FilterChips';
import SortSelector from './SortSelector';
import SyncIndicator, { type SyncStatus } from './SyncIndicator';
import Avatar from './Avatar';
import EmptyState from './EmptyState';

export default function ContactList({
  contacts,
  filter,
  onFilterChange,
  onSelect,
  onAdd,
  sortOrder,
  onSortChange,
  syncStatus,
  isDark,
}: {
  contacts: Contact[];
  filter: ActiveFilter;
  onFilterChange: (filter: ActiveFilter) => void;
  onSelect: (contact: Contact) => void;
  onAdd: () => void;
  sortOrder: SortOrder;
  onSortChange: (sort: SortOrder) => void;
  syncStatus?: SyncStatus;
  isDark: boolean;
}) {
  const topTags = useMemo(() => getTopTags(contacts), [contacts]);
  const filtered = useMemo(() => sortContacts(filterContacts(contacts, filter), sortOrder), [contacts, filter, sortOrder]);
  const displayed = filtered;

  const hasAnyFilter = hasActiveFilters(filter);

  if (contacts.length === 0) {
    return (
      <div className="pt-4 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight">
            InTouch
          </h1>
          <button
            onClick={onAdd}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent text-dark-bg active:scale-[0.96] transition-transform"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
        <EmptyState onAdd={onAdd} isDark={isDark} />
      </div>
    );
  }

  return (
    <div className="pt-4 px-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h1 className="font-[family-name:var(--font-outfit)] text-xl font-black tracking-tight">
            InTouch
          </h1>
          {syncStatus && <SyncIndicator status={syncStatus} />}
        </div>
        <motion.button
          onClick={onAdd}
          whileTap={{ scale: 0.92 }}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent text-dark-bg shadow-sm active:shadow-none transition-shadow"
          style={{ boxShadow: '0 2px 8px rgba(45,212,191,0.35)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70" />
        <input
          type="text"
          value={filter.search}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          placeholder="Search your network..."
          className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent/40 ${
            isDark
              ? 'bg-dark-card border-dark-border text-white placeholder:text-muted/60'
              : 'bg-white border-light-border text-dark-bg placeholder:text-muted/60 card-shadow'
          }`}
        />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <FilterChips
          filter={filter}
          onFilterChange={onFilterChange}
          topTags={topTags}
          isDark={isDark}
        />
      </div>

      {/* Count + Sort */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted/70 font-[family-name:var(--font-outfit)] tracking-wide uppercase">
          {hasAnyFilter
            ? `${displayed.length} result${displayed.length !== 1 ? 's' : ''}`
            : `${contacts.length} connection${contacts.length !== 1 ? 's' : ''}`}
        </p>
        <SortSelector
          value={sortOrder}
          onChange={onSortChange}
          isDark={isDark}
        />
      </div>

      {/* Cards */}
      <div className="space-y-2.5">
        {displayed.map((contact) => (
          <motion.button
            key={contact.id}
            onClick={() => onSelect(contact)}
            whileTap={{ scale: 0.985 }}
            className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 ${
              isDark
                ? 'bg-dark-card border-dark-border hover:border-accent/25 card-shadow-dark'
                : 'bg-white border-light-border hover:border-accent/30 card-shadow'
            } ${contact.classification === 'inner' ? 'border-l-[3px] border-l-accent/60' : ''}`}
          >
            <div className="flex items-center gap-3.5">
              <Avatar name={contact.name} photoUrl={contact.photoUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-outfit)] font-bold text-[15px] leading-snug truncate">
                  {contact.name}
                </p>
                {(() => {
                  const dj = getDisplayJob(contact);
                  return (dj.role || dj.company) ? (
                    <p className="text-[13px] text-muted mt-0.5 truncate leading-snug">
                      {dj.role && dj.company ? `${dj.role} · ${dj.company}` : dj.role || dj.company}
                    </p>
                  ) : null;
                })()}
                {(() => {
                  const de = getDisplayEducation(contact);
                  return de ? <p className="text-xs text-muted/70 mt-0.5 truncate">{de}</p> : null;
                })()}
                {contact.homeLocation && (
                  <p className="text-xs text-muted/70 mt-1 flex items-center gap-1">
                    <MapPin size={10} />
                    {contact.homeLocation}
                  </p>
                )}
                {(contact.email || contact.phone) && (
                  <div className="flex items-center gap-2.5 mt-2">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} className="text-muted/60 hover:text-accent transition-colors">
                        <Mail size={13} />
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()} className="text-muted/60 hover:text-accent transition-colors">
                        <Phone size={13} />
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted/60 hover:text-accent transition-colors">
                        <MessageCircle size={13} />
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0 self-start pt-0.5">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide ${
                    contact.classification === 'inner'
                      ? 'bg-accent/15 text-accent'
                      : isDark
                      ? 'bg-dark-border/80 text-muted-light'
                      : 'bg-slate-100 text-muted'
                  }`}
                >
                  {contact.classification === 'inner' ? 'Inner' : 'Wider'}
                </span>
                {contact.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {contact.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                          isDark ? 'bg-dark-border/60 text-muted' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {capitalizeTag(tag)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {displayed.length === 0 && (
        <p className="text-center text-muted text-sm py-12">No contacts match your filters.</p>
      )}
    </div>
  );
}
