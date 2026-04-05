'use client';

import { useState } from 'react';
import { ArrowLeft, Pencil, Trash2, MapPin, Phone, Mail, ExternalLink, Cake, Clock, GraduationCap, Briefcase, Star, CalendarClock, Plus, Check, X, CalendarPlus } from 'lucide-react';

function downloadICS(contactName: string, description: string, date: string) {
  const dt = date.replace(/-/g, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//InTouch//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@intouch`,
    `DTSTART;VALUE=DATE:${dt}`,
    `DTEND;VALUE=DATE:${dt}`,
    `SUMMARY:${description} — ${contactName}`,
    'DESCRIPTION:Planned interaction from InTouch',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${contactName.replace(/\s+/g, '-')}-${date}.ics`;
  a.click();
}
import { nanoid } from 'nanoid';
import { motion, AnimatePresence } from 'framer-motion';
import type { Contact } from '@/lib/types';
import { buildHowMetSentence, capitalizeTag, getDisplayJob, getDisplayEducation } from '@/lib/utils';
import InteractionLog from './InteractionLog';
import Avatar from './Avatar';

export default function ContactDetail({
  contact,
  onBack,
  onEdit,
  onDelete,
  onLogInteraction,
  onDeleteInteraction,
  onAddPlanned,
  onCompletePlanned,
  isDark,
}: {
  contact: Contact;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLogInteraction: (date: string, note: string, type?: import('@/lib/types').InteractionType, duration?: string, initiator?: 'you' | 'them') => void;
  onDeleteInteraction?: (interactionId: string) => void;
  onAddPlanned?: (date: string, description: string) => void;
  onCompletePlanned?: (plannedId: string) => void;
  isDark: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planDate, setPlanDate] = useState('');
  const [planDesc, setPlanDesc] = useState('');

  const howMet = buildHowMetSentence(contact);
  const hasContactInfo = contact.phone || contact.email || contact.linkedinUrl || contact.birthday;
  const displayJob = getDisplayJob(contact);
  const displayEdu = getDisplayEducation(contact);
  const hasHowMet = contact.howMet || contact.whereMet || contact.eventOrContext || contact.dateMet;

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const sectionClass = `p-4 rounded-lg border ${
    isDark ? 'bg-dark-card border-dark-border' : 'bg-light-card border-light-border'
  }`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="pt-4 px-4 pb-4"
    >
      {/* Nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-muted text-sm">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className={`w-9 h-9 flex items-center justify-center rounded-lg ${
              isDark ? 'bg-dark-card' : 'bg-light-border'
            }`}
          >
            <Pencil size={16} className="text-muted-light" />
          </button>
          <button
            onClick={handleDelete}
            className={`h-9 px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium ${
              confirmDelete
                ? 'bg-red-500/15 text-red-400'
                : isDark
                ? 'bg-dark-card text-muted-light'
                : 'bg-light-border text-muted'
            }`}
          >
            <Trash2 size={14} />
            {confirmDelete && <span>Tap to confirm</span>}
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-3">
          <Avatar name={contact.name} photoUrl={contact.photoUrl} size="md" />
        </div>
        <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">
          {contact.name}
        </h2>
        {(displayJob.role || displayJob.company) && (
          <p className="text-muted mt-1">
            {displayJob.role}
            {displayJob.role && displayJob.company && ' @ '}
            {displayJob.company}
          </p>
        )}
        {displayEdu && (
          <p className="text-muted text-sm mt-0.5">{displayEdu}</p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              contact.classification === 'inner'
                ? 'bg-accent/15 text-accent'
                : isDark
                ? 'bg-dark-border text-muted-light'
                : 'bg-light-border text-muted'
            }`}
          >
            {contact.classification === 'inner' ? 'Inner Circle' : 'Wider Network'}
          </span>
          {contact.homeLocation && (
            <span className="text-xs text-muted flex items-center gap-1">
              <MapPin size={12} />
              {contact.homeLocation}
            </span>
          )}
          {contact.reconnectIntervalWeeks && (
            <span className="text-xs text-muted flex items-center gap-1">
              <Clock size={12} />
              Every {contact.reconnectIntervalWeeks}w
            </span>
          )}
          {contact.reconnectDate && (
            <span className="text-xs text-muted flex items-center gap-1">
              <Clock size={12} />
              Remind {new Date(contact.reconnectDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        {contact.lastContacted && (
          <p className="text-xs text-muted mt-2">
            Last contacted{' '}
            {new Date(contact.lastContacted + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {/* How We Met */}
        {hasHowMet && (
          <div className={sectionClass}>
            <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              How we connected
            </h3>
            <p className="text-sm leading-relaxed">{howMet}</p>
          </div>
        )}

        {/* Contact Info */}
        {hasContactInfo && (
          <div className={sectionClass}>
            <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Contact
            </h3>
            <div className="space-y-2.5">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm text-accent">
                  <Phone size={14} />
                  {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-accent">
                  <Mail size={14} />
                  {contact.email}
                </a>
              )}
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-accent"
                >
                  <ExternalLink size={14} />
                  LinkedIn Profile
                </a>
              )}
              {contact.birthday && (
                <div className="flex items-center gap-3 text-sm">
                  <Cake size={14} className="text-muted" />
                  {new Date(contact.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Education */}
        {contact.education && contact.education.length > 0 && (
          <div className={sectionClass}>
            <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Education
            </h3>
            <div className="space-y-2.5">
              {contact.education.map((edu) => (
                <div key={edu.id} className="flex items-start gap-2.5">
                  <GraduationCap size={14} className="text-muted mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{edu.university}</p>
                    {(edu.program || edu.gradYear) && (
                      <p className="text-xs text-muted mt-0.5">
                        {edu.program}{edu.program && edu.gradYear && ' · '}{edu.gradYear}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work */}
        {contact.jobs && contact.jobs.length > 0 && (
          <div className={sectionClass}>
            <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Work
            </h3>
            <div className="space-y-2.5">
              {contact.jobs.map((job) => (
                <div key={job.id} className="flex items-start gap-2.5">
                  <Briefcase size={14} className="text-muted mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {job.role}{job.role && job.company && ' @ '}{job.company}
                    </p>
                    {job.isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-accent mt-0.5">
                        <Star size={10} fill="currentColor" /> Current
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className={sectionClass}>
          <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Notes
          </h3>
          {contact.notes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
          ) : (
            <p className="text-sm text-muted italic">Add notes about this person...</p>
          )}
        </div>

        {/* Interactions */}
        <div className={sectionClass}>
          <InteractionLog
            interactions={contact.interactions}
            onAdd={(date, note, type, duration, initiator) => onLogInteraction(date, note, type, duration, initiator)}
            onDelete={onDeleteInteraction}
            isDark={isDark}
          />
        </div>

        {/* Planned Interactions */}
        {onAddPlanned && (
          <div className={sectionClass}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider">
                Planned
              </h3>
              <button
                onClick={() => setShowPlanForm(!showPlanForm)}
                className="flex items-center gap-1 text-[11px] text-accent font-medium"
              >
                <Plus size={14} />
                Plan
              </button>
            </div>

            <AnimatePresence>
              {showPlanForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden mb-3"
                >
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={planDate}
                      onChange={(e) => setPlanDate(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg text-sm outline-none border ${
                        isDark ? 'bg-dark-bg border-dark-border text-white' : 'bg-light-bg border-light-border text-dark-bg'
                      }`}
                    />
                    <input
                      type="text"
                      value={planDesc}
                      onChange={(e) => setPlanDesc(e.target.value)}
                      placeholder="Coffee, call, dinner..."
                      className={`w-full px-3 py-2 rounded-lg text-sm outline-none border ${
                        isDark ? 'bg-dark-bg border-dark-border text-white placeholder:text-muted' : 'bg-light-bg border-light-border text-dark-bg placeholder:text-muted'
                      }`}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (planDate && planDesc.trim()) {
                            onAddPlanned(planDate, planDesc.trim());
                            setPlanDate('');
                            setPlanDesc('');
                            setShowPlanForm(false);
                          }
                        }}
                        disabled={!planDate || !planDesc.trim()}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold font-[family-name:var(--font-outfit)] transition-transform ${
                          planDate && planDesc.trim()
                            ? 'bg-accent text-dark-bg active:scale-[0.98]'
                            : 'bg-muted/20 text-muted cursor-not-allowed'
                        }`}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setShowPlanForm(false)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium ${isDark ? 'text-muted-light' : 'text-muted'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {(contact.plannedInteractions || []).filter((p) => !p.completed).length === 0 && !showPlanForm ? (
              <p className="text-sm text-muted italic">No upcoming plans.</p>
            ) : (
              <div className="space-y-2">
                {[...(contact.plannedInteractions || [])]
                  .filter((p) => !p.completed)
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((p) => {
                    const today = new Date().toISOString().slice(0, 10);
                    const isToday = p.date === today;
                    const isOverdue = p.date < today;
                    return (
                      <div key={p.id} className="flex items-start gap-2.5">
                        <CalendarClock size={13} className={`mt-0.5 shrink-0 ${isToday ? 'text-blue-400' : isOverdue ? 'text-red-400' : 'text-muted'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted">
                            {new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {isToday && <span className="text-blue-400 font-medium ml-1">Today</span>}
                            {isOverdue && <span className="text-red-400 font-medium ml-1">Overdue</span>}
                          </p>
                          <p className="text-sm mt-0.5">{p.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <button
                            onClick={() => downloadICS(contact.name, p.description, p.date)}
                            className="w-6 h-6 flex items-center justify-center rounded-full text-muted hover:text-accent transition-colors"
                            title="Add to calendar"
                          >
                            <CalendarPlus size={13} />
                          </button>
                          {onCompletePlanned && (
                            <button
                              onClick={() => onCompletePlanned(p.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-accent/15 text-accent active:scale-[0.9] transition-transform"
                              title="Mark complete & log interaction"
                            >
                              <Check size={12} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className={sectionClass}>
            <h3 className="font-[family-name:var(--font-outfit)] text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-accent/15 text-accent px-2.5 py-1 rounded-md text-xs font-medium"
                >
                  {capitalizeTag(tag)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

    </motion.div>
  );
}
