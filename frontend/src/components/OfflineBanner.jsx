import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';

const subscribe = (onChange) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

export default function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="status"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 top-0 z-[95] flex justify-center px-4 pt-[max(0.5rem,env(safe-area-inset-top))]"
        >
          <span className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper shadow-lg">
            <WifiOff size={14} /> You're offline. New content will load when you reconnect.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
