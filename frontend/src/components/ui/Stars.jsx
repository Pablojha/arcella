import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export default function Stars({ value = 0, onChange, size = 22, label }) {
  return (
    <div className="flex gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={label ? `${label}: ${value} of 5` : `${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button key={n} type="button" whileTap={onChange && { scale: 0.75 }} disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="disabled:cursor-default">
          <Star size={size} className={n <= value ? 'fill-accent text-accent' : 'text-ink/20'} />
        </motion.button>
      ))}
    </div>
  );
}
