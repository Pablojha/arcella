import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const TONES = { success: 'text-brand', error: 'text-accent', info: 'text-muted' };
let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((type, message) => {
    const id = ++nextId;
    setToasts((list) => [...list.slice(-2), { id, type, message }]);
    setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 3800);
  }, []);

  const toast = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push]);

  useEffect(() => {
    const onSlow = () => toast.info('Waking up the server. Free hosting can take up to a minute on the first visit.');
    window.addEventListener('api:slow', onSlow);
    return () => window.removeEventListener('api:slow', onSlow);
  }, [toast]);

  return (
    <ToastContext value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6">
        <AnimatePresence>
          {toasts.map(({ id, type, message }) => {
            const Icon = ICONS[type];
            return (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm shadow-xl shadow-black/10"
                role="status"
              >
                <Icon size={18} className={`mt-px shrink-0 ${TONES[type]}`} />
                <span className="min-w-0 break-words">{message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}

export const useToast = () => useContext(ToastContext);
