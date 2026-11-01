import { motion } from 'framer-motion';

export default function Toggle({ checked, onChange, label, hint }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 text-left">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={`relative flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${checked ? 'justify-end bg-brand' : 'justify-start bg-ink/15'}`}>
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} className="size-5 rounded-full bg-white shadow" />
      </span>
    </button>
  );
}
