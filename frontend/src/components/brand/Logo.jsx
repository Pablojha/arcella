import { motion } from 'framer-motion';

/** Dome from (10,30) to (54,30), closed by four small arches back along the lower edge. */
const CANOPY = 'M10 30A22 22 0 0 1 54 30a5.5 5.5 0 0 0-11 0a5.5 5.5 0 0 0-11 0a5.5 5.5 0 0 0-11 0a5.5 5.5 0 0 0-11 0Z';

/**
 * Green tile with a white umbrella: arched canopy edge, drafting-pencil handle.
 * `animated` draws it: tile appears, pencil slides up, canopy springs open.
 */
export default function Logo({ size = 32, animated = false, className = '' }) {
  const from = (state) => (animated ? state : false);
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`shrink-0 ${className}`} role="img" aria-label="Arcella">
      <motion.rect width="64" height="64" rx="15" fill="#1d6b47" initial={from({ scale: 0.6, opacity: 0 })} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45, ease: 'backOut' }} style={{ originX: 0.5, originY: 0.5 }} />
      <motion.g initial={from({ y: 26, opacity: 0 })} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
        <rect x="29.6" y="29" width="4.8" height="17" rx="1" fill="#fff" />
        <path d="M29.6 46h4.8L32 53.4Z" fill="#fff" opacity="0.72" />
        <path d="M31.1 50.6h1.8l-.9 2.8Z" fill="#fff" />
      </motion.g>
      <motion.path
        d={CANOPY}
        fill="#fff"
        initial={from({ scaleX: 0.12, scaleY: 0.5, opacity: 0 })}
        animate={{ scaleX: 1, scaleY: 1, opacity: 1 }}
        transition={{ delay: 0.75, type: 'spring', stiffness: 260, damping: 11 }}
        style={{ originX: 0.5, originY: 0 }}
      />
    </svg>
  );
}
