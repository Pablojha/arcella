import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

const BURST = Array.from({ length: 6 }, (_, index) => (index / 6) * Math.PI * 2);

/** Toggle with a "pop" and a small burst, played only when the user switches it on. */
export default function LikeButton({ active, count, onToggle, icon: Icon = Heart, label = 'Like' }) {
  const [pops, setPops] = useState(0);

  const click = () => {
    if (!active) setPops((n) => n + 1);
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={active}
      aria-label={label}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition ${active ? 'text-accent' : 'text-muted hover:bg-ink/5 hover:text-ink'}`}
    >
      <span className="relative grid place-items-center">
        <motion.span key={pops} initial={pops ? { scale: 0.3 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 11 }}>
          <Icon size={18} className={active ? 'fill-current' : ''} />
        </motion.span>
        {active &&
          pops > 0 &&
          BURST.map((angle) => (
            <motion.span
              key={`${pops}-${angle}`}
              className="absolute size-1 rounded-full bg-accent"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos(angle) * 15, y: Math.sin(angle) * 15, opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            />
          ))}
      </span>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
