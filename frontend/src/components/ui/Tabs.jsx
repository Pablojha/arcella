import { useId } from 'react';
import { motion } from 'framer-motion';

/** Tab strip with an animated indicator. `variant="pill"` renders a segmented control. */
export default function Tabs({ tabs, value, onChange, variant = 'line', className = '' }) {
  const id = useId();
  const pill = variant === 'pill';
  return (
    <div role="tablist" className={`no-scrollbar flex overflow-x-auto ${pill ? 'gap-1 rounded-full bg-ink/5 p-1' : 'gap-1 border-b border-line'} ${className}`}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`relative flex shrink-0 items-center whitespace-nowrap px-3.5 text-sm font-medium transition-colors ${pill ? 'h-8 flex-1 justify-center rounded-full' : 'h-11'} ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            {active && (
              <motion.span
                layoutId={id}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className={pill ? 'absolute inset-0 rounded-full bg-card shadow-sm' : 'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand'}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {tab.icon && <tab.icon size={15} />}
              {tab.label}
              {tab.count > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-4 text-on-accent">{tab.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
