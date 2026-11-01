import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Search', icon: Icon = Search, className = '', ...props }) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="input pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden" {...props} />
      {value && (
        <button type="button" aria-label="Clear" onClick={() => onChange('')} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-ink/5">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
