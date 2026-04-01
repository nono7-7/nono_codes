'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { capitalizeTag, DEFAULT_TAGS } from '@/lib/utils';

export default function TagInput({
  tags,
  onChange,
  allUsedTags,
  isDark,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  allUsedTags: string[];
  isDark: boolean;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [...new Set([...allUsedTags, ...DEFAULT_TAGS])].filter(
    (t) => !tags.includes(t)
  );

  const filtered = input.trim()
    ? suggestions.filter((t) => t.includes(input.toLowerCase()))
    : suggestions;

  const addTag = (tag: string) => {
    const normalized = tag.toLowerCase().trim();
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized]);
    }
    setInput('');
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-3">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-accent/15 text-accent px-2.5 py-1 rounded-md text-xs font-medium"
            >
              {capitalizeTag(tag)}
              <button onClick={() => removeTag(tag)} className="hover:text-white">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a tag and press Enter..."
        className={`w-full px-3 py-2.5 rounded-lg text-sm outline-none border ${
          isDark
            ? 'bg-dark-card border-dark-border text-white placeholder:text-muted'
            : 'bg-white border-light-border text-dark-bg placeholder:text-muted'
        }`}
      />

      <div className="flex flex-wrap gap-1.5">
        {filtered.slice(0, 12).map((tag) => (
          <button
            key={tag}
            onClick={() => addTag(tag)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              isDark
                ? 'bg-dark-card text-muted-light hover:text-white hover:bg-dark-border'
                : 'bg-light-border text-muted hover:text-dark-bg'
            }`}
          >
            {capitalizeTag(tag)}
          </button>
        ))}
      </div>
    </div>
  );
}
