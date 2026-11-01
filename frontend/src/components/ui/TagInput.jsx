import { useState } from 'react';
import { X } from 'lucide-react';

/** Chip input: Enter or comma adds a tag, Backspace on empty removes the last; suggestions add on tap. */
export default function TagInput({ value = [], onChange, suggestions = [], placeholder = 'Type and press Enter', max = 20 }) {
  const [text, setText] = useState('');

  const add = (raw) => {
    const tag = raw.trim().replace(/,+$/, '');
    if (tag && value.length < max && !value.some((item) => item.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setText('');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add(text);
    } else if (event.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
  };

  const open = suggestions.filter((item) => !value.includes(item) && item.toLowerCase().includes(text.toLowerCase())).slice(0, 8);

  return (
    <div>
      <div className="input flex flex-wrap items-center gap-1.5 py-2">
        {value.map((tag) => (
          <span key={tag} className="chip bg-brand/10 text-ink">
            <span className="truncate">{tag}</span>
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((item) => item !== tag))} className="text-muted hover:text-ink">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(event) => (event.target.value.endsWith(',') ? add(event.target.value) : setText(event.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => text && add(text)}
          placeholder={value.length ? '' : placeholder}
          className="min-w-24 flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted/70"
        />
      </div>
      {open.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {open.map((item) => (
            <button key={item} type="button" onClick={() => add(item)} className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted transition hover:border-brand hover:text-brand">
              + {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
