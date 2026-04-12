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

  const headerContent = (
    <>
      <h1 className="font-[family-name:var(--font-outfit)] text-[19px] font-semibold tracking-tight">
        InTouch
      </h1>
    </>
  );

  const addButton = (
    <motion.button
      onClick={onAdd}
      whileTap={{ scale: 0.92 }}
      className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent text-dark-bg transition-transform"
      style={{ boxShadow: '0 2px 8px rgba(45,212,191,0.30)' }}
    >
      <Plus size={18} strokeWidth={2.5} />
    </motion.button>
  );

  if (contacts.length === 0) {
    return (
      <div className="pt-4 px-4">
        <div className="flex items-center justify-between mb-6">
          {headerContent}
          {addButton}
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
          {headerContent}
          {syncStatus && <SyncIndicator status={syncStatus} />}
        </div>
        {addButton}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/60" />
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
        <p className="text-xs text-muted font-[family-name:var(--font-outfit)]">
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
      <div className="space-y-2">
        {displayed.map((contact) => (
          <motion.button
            key={contact.id}
            onClick={() => onSelect(contact)}
            whileTap={{ scale: 0.985 }}
            className={`relative overflow-hidden w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 ${
              isDark
                ? 'bg-dark-card border-dark-border hover:border-accent/20 card-shadow-dark'
                : 'bg-white border-light-border hover:border-accent/25 card-shadow'
            }`}
          >
            {/* Inner circle accent bar — absolute so it never shifts card content */}
            {contact.classification === 'inner' && (
              <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent/50 rounded-r-sm" />
            )}
            <div className="flex items-center gap-3">
              <Avatar name={contact.name} photoUrl={contact.photoUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-outfit)] font-semibold text-[14px] leading-snug truncate">
                  {contact.name}
                </p>
                {(() => {
                  const dj = getDisplayJob(contact);
                  return (dj.role || dj.company) ? (
                    <p className="text-xs text-muted mt-0.5 truncate leading-snug">
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
                  <div className="flex items-center gap-2 mt-1.5">
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
                  <div className="flex gap-1 flex-wrap justify-end">
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

      {displayed.length === 0 && (
        <p className="text-center text-muted text-sm py-12">No contacts match your filters.</p>
      )}
    </div>
  );
}
