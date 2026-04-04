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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight">
            InTouch
          </h1>
          {syncStatus && <SyncIndicator status={syncStatus} />}
        </div>
        <button
          onClick={onAdd}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent text-dark-bg active:scale-[0.96] transition-transform"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          value={filter.search}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          placeholder="Search your network..."
          className={`w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none border ${
            isDark
              ? 'bg-dark-card border-dark-border text-white placeholder:text-muted'
              : 'bg-white border-light-border text-dark-bg placeholder:text-muted'
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
        <p className="text-xs text-muted font-[family-name:var(--font-outfit)]">
          {hasAnyFilter
            ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
            : `${contacts.length} connection${contacts.length !== 1 ? 's' : ''}`}
        </p>
        <SortSelector value={sortOrder} onChange={onSortChange} isDark={isDark} />
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {filtered.map((contact) => (
          <motion.button
            key={contact.id}
            onClick={() => onSelect(contact)}
            whileTap={{ scale: 0.98 }}
            className={`w-full text-left p-4 rounded-lg border transition-colors ${
              isDark
                ? 'bg-dark-card border-dark-border hover:border-muted/30'
                : 'bg-light-card border-light-border hover:border-muted/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <Avatar name={contact.name} photoUrl={contact.photoUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-outfit)] font-semibold text-sm truncate">
                  {contact.name}
                </p>
                {(() => {
                  const dj = getDisplayJob(contact);
                  return (dj.role || dj.company) ? (
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {dj.role}{dj.role && dj.company && ' @ '}{dj.company}
                    </p>
                  ) : null;
                })()}
                {(() => {
                  const de = getDisplayEducation(contact);
                  return de ? <p className="text-xs text-muted mt-0.5 truncate">{de}</p> : null;
                })()}
                {contact.homeLocation && (
                  <p className="text-xs text-muted mt-1 flex items-center gap-1">
                    <MapPin size={11} />
                    {contact.homeLocation}
                  </p>
                )}
                {(contact.email || contact.phone) && (
                  <div className="flex items-center gap-2 mt-1.5">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted hover:text-accent transition-colors"
                      >
                        <Mail size={13} />
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted hover:text-accent transition-colors"
                      >
                        <Phone size={13} />
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted hover:text-accent transition-colors"
                      >
                        <MessageCircle size={13} />
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    contact.classification === 'inner'
                      ? 'bg-accent/15 text-accent'
                      : isDark
                      ? 'bg-dark-border text-muted-light'
                      : 'bg-light-border text-muted'
                  }`}
                >
                  {contact.classification === 'inner' ? 'Inner' : 'Wider'}
                </span>
                {contact.tags.length > 0 && (
                  <div className="flex gap-1">
                    {contact.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isDark ? 'bg-dark-border text-muted' : 'bg-light-border text-muted'
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

      {filtered.length === 0 && hasAnyFilter && (
        <p className="text-center text-muted text-sm py-12">No contacts match your filters.</p>
      )}
    </div>
  );
}
