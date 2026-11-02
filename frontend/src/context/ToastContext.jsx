import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const TONES = { success: 'text-brand', error: 'text-accent', info: 'text-muted' };
let nextId = 0;

/** Toasts: `toast.info(message, { action: { label, onClick }, duration })`; an action button closes its toast. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (type, message, { action, duration = 3800 } = {}) => {
      const id = ++nextId;
      setToasts((list) => [...list.slice(-2), { id, type, message, action }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const toast = useMemo(() => ({ success: (m, o) => push('success', m, o), error: (m, o) => push('error', m, o), info: (m, o) => push('info', m, o) }), [push]);

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
          {toasts.map(({ id, type, message, action }) => {
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
                {action && (
                  <button
                    type="button"
                    onClick={() => {
                      action.onClick();
                      dismiss(id);
                    }}
                    className="-my-1 ml-auto shrink-0 rounded-full px-2 py-1 font-semibold text-brand hover:bg-brand/10"
                  >
                    {action.label}
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}

export const useToast = () => useContext(ToastContext);
