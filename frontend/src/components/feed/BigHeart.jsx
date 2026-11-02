import { AnimatePresence, motion } from 'framer-motion';
import { Heart } from 'lucide-react';

/** The big heart that pops over a photo or reel on a double-tap. Raise `burst` to play it; `onDone` resets it. */
export default function BigHeart({ burst, onDone }) {
  return (
    <AnimatePresence>
      {burst > 0 && (
        <motion.span
          key={burst}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.25, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 14 }}
          onAnimationComplete={onDone}
          className="pointer-events-none absolute inset-0 grid place-items-center text-white drop-shadow-xl"
        >
          <Heart size={96} className="fill-current" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}
