'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function AutoSuggestInput({
  value,
  onChange,
  suggestions,
  placeholder,
  inputClass,
  isDark,
  type = 'text',
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  inputClass: string;
  isDark: boolean;
  type?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Word-level matching: any typed word matches any word in a suggestion
  const filtered = (() => {
    if (!value || value.trim().length < 2) return [];
    const words = value.toLowerCase().trim().split(/\s+/);
    return suggestions
      .filter((s) => {
        const lower = s.toLowerCase();
        // Don't suggest exact match
        if (lower === value.toLowerCase().trim()) return false;
        // Match if any typed word appears anywhere in the suggestion
        return words.some((w) => lower.includes(w));
      })
      .slice(0, 5);
  })();

  const showDropdown = focused && filtered.length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      setFocused(false);
      setActiveIndex(-1);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClass}
      />
      {showDropdown && (
        <div
          className={`absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border shadow-sm overflow-hidden ${
            isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border'
          }`}
        >
          {filtered.map((suggestion, i) => (
            <button
              key={suggestion}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur before click registers
                selectSuggestion(suggestion);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === activeIndex
                  ? 'bg-accent/15 text-accent'
                  : isDark
                  ? 'text-muted-light hover:bg-dark-border'
                  : 'text-zinc-700 hover:bg-light-border'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
