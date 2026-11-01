const normalize = (option) => (typeof option === 'object' ? option : { value: option, label: option });

/** Single-select filter chips. On phones they scroll sideways, bleeding to the screen edge unless `bleed` is off. */
export default function Chips({ options, value, onChange, allLabel = 'All', bleed = true }) {
  const items = [...(allLabel ? [{ value: '', label: allLabel }] : []), ...options.map(normalize)];
  return (
    <div className={`no-scrollbar flex gap-2 overflow-x-auto md:flex-wrap ${bleed ? '-mx-4 px-4 md:mx-0 md:px-0' : ''}`}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition ${item.value === value ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink/80 hover:border-ink/30'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
