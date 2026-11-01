import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from './brand/Logo';
import Wordmark from './brand/Wordmark';

const MESSAGES = ['Laying out the grid', 'Pinning up the drawings', 'Sharpening the pencils', 'Inking the details'];
const SLOW_AFTER_MS = 7000;

/** Architectural dimension line: extension lines, oblique ticks and a drawn measurement. */
function DimensionLine({ progress, label }) {
  const tick = 'absolute top-1/2 h-3 w-px -translate-y-1/2 rotate-45 bg-ink';
  return (
    <div className="mt-10 w-64 max-w-[80vw]">
      <div className="relative h-5 overflow-hidden text-center text-xs font-medium text-muted">
        <AnimatePresence mode="wait">
          <motion.span key={label} className="absolute inset-0" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.25 }}>
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="relative mt-2 h-5">
        <span className="absolute left-0 top-0 h-full w-px bg-ink/50" />
        <span className="absolute right-0 top-0 h-full w-px bg-ink/50" />
        <span className="absolute inset-x-0 top-1/2 h-px bg-ink/15" />
        <motion.span className="absolute left-0 top-1/2 h-px w-full origin-left bg-brand" animate={{ scaleX: progress }} transition={{ ease: 'easeOut', duration: 0.3 }} />
        <span className={`${tick} left-0`} />
        <motion.span className={tick} animate={{ left: `${progress * 100}%` }} transition={{ ease: 'easeOut', duration: 0.3 }} />
      </div>
      <p className="mt-1.5 text-center font-mono text-[10px] tracking-widest text-muted">{Math.round(progress * 100)}%</p>
    </div>
  );
}

export default function LoadingScreen({ done }) {
  const [progress, setProgress] = useState(0.06);
  const [message, setMessage] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setProgress((value) => (done ? 1 : value + (0.9 - value) * 0.09)), 140);
    return () => clearInterval(id);
  }, [done]);

  useEffect(() => {
    const cycle = setInterval(() => setMessage((index) => (index + 1) % MESSAGES.length), 1100);
    const wake = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      clearInterval(cycle);
      clearTimeout(wake);
    };
  }, []);

  return (
    <motion.div className="grid-paper fixed inset-0 z-[100] grid place-items-center bg-paper px-6" exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.45 }}>
      <div className="flex flex-col items-center">
        <Logo size={88} animated />
        <Wordmark animated delay={1.05} className="mt-5 text-[40px] leading-none" />
        <DimensionLine progress={progress} label={slow && !done ? 'Waking up the server…' : MESSAGES[message]} />
      </div>
    </motion.div>
  );
}
