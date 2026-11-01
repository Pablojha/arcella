import { motion } from 'framer-motion';

const LETTERS = 'arcella.'.split('');

/** "arcella." in Space Grotesk; `animated` lets the letters rise one by one. */
export default function Wordmark({ animated = false, delay = 1, className = '' }) {
  if (!animated) {
    return (
      <span className={`font-display font-bold tracking-tight ${className}`}>
        arcella<span className="text-accent">.</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex overflow-hidden font-display font-bold tracking-tight ${className}`} aria-label="arcella.">
      {LETTERS.map((letter, index) => (
        <motion.span
          key={index}
          aria-hidden
          className={letter === '.' ? 'text-accent' : ''}
          initial={{ y: '0.9em', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: delay + index * 0.07, type: 'spring', stiffness: 320, damping: 22 }}
        >
          {letter}
        </motion.span>
      ))}
    </span>
  );
}
