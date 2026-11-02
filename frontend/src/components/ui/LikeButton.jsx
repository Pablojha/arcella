import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

const BURST = Array.from({ length: 6 }, (_, index) => (index / 6) * Math.PI * 2);

// "pill" carries a count (projects); "icon" is the bare, larger icon of a post's action row.
const VARIANTS = {
  pill: { button: 'h-9 gap-1.5 px-3 text-sm font-medium', idle: 'text-muted hover:bg-ink/5 hover:text-ink', size: 18 },
  icon: { button: 'size-10 justify-center active:scale-90', idle: 'hover:text-muted', size: 24 },
};

/** Toggle with a "pop" and a small burst, played only when the user switches it on. */
export default function LikeButton({ active, count, onToggle, icon: Icon = Heart, label = 'Like', variant = 'pill', activeClass = 'text-accent' }) {
  const [pops, setPops] = useState(0);
  const style = VARIANTS[variant];

  const click = () => {
    if (!active) setPops((n) => n + 1);
    onToggle();
  };

  return (
    <button type="button" onClick={click} aria-pressed={active} aria-label={label} className={`inline-flex items-center rounded-full transition ${style.button} ${active ? activeClass : style.idle}`}>
      <span className="relative grid place-items-center">
        <motion.span key={pops} initial={pops ? { scale: 0.3 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 11 }}>
          <Icon size={style.size} className={active ? 'fill-current' : ''} />
        </motion.span>
        {active &&
          pops > 0 &&
          BURST.map((angle) => (
            <motion.span
              key={`${pops}-${angle}`}
              className="absolute size-1 rounded-full bg-current"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos(angle) * style.size * 0.85, y: Math.sin(angle) * style.size * 0.85, opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            />
          ))}
      </span>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
