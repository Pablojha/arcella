import { motion } from 'framer-motion';

/** Fades and lifts list items in, staggered by their position on the current page. */
export default function Reveal({ index = 0, className, children }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: (index % 12) * 0.04, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
