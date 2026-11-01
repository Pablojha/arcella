import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 64;
const MAX_PULL = 90;
const MIN_SPIN_MS = 700;

/** Touch "pull down to refresh" for feeds, which works in the browser, the installed PWA and the Android app. */
export default function PullToRefresh({ onRefresh, children }) {
  const offset = useMotionValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const rotate = useTransform(offset, [0, MAX_PULL], [0, 300]);
  const opacity = useTransform(offset, [0, 36], [0, 1]);

  useEffect(() => {
    let startY = null;
    const onStart = (event) => {
      const sheetOpen = document.body.style.overflow === 'hidden';
      startY = window.scrollY <= 0 && !busy.current && !sheetOpen ? event.touches[0].clientY : null;
    };
    const onMove = (event) => {
      if (startY !== null) offset.set(Math.max(0, Math.min((event.touches[0].clientY - startY) * 0.45, MAX_PULL)));
    };
    const onEnd = async () => {
      if (startY === null) return;
      startY = null;
      if (offset.get() < THRESHOLD) return animate(offset, 0);
      busy.current = true;
      setRefreshing(true);
      animate(offset, 52);
      await Promise.all([onRefresh(), new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS))]);
      busy.current = false;
      setRefreshing(false);
      animate(offset, 0);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [offset, onRefresh]);

  return (
    <div className="min-w-0">
      <motion.div style={{ height: offset }} className="flex items-end justify-center overflow-hidden md:hidden" aria-hidden={!refreshing}>
        <motion.span style={{ rotate, opacity }} className={`mb-2 grid size-9 place-items-center rounded-full border border-line bg-card text-brand shadow-sm ${refreshing ? 'animate-spin' : ''}`}>
          <RefreshCw size={17} />
        </motion.span>
      </motion.div>
      {children}
    </div>
  );
}
