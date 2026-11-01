import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useMedia } from '../../hooks/useMedia';

/** Bottom sheet on phones (drag the handle down to close), centered dialog on larger screens. */
export default function Sheet({ open, onClose, title, size = 'md', children }) {
  const desktop = useMedia('(min-width: 768px)');
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const motionProps = desktop
    ? { initial: { opacity: 0, scale: 0.96, y: 16 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 8 } }
    : {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        drag: 'y',
        dragControls: drag,
        dragListener: false,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: 0, bottom: 0.7 },
        onDragEnd: (_, info) => (info.offset.y > 110 || info.velocity.y > 600) && onClose(),
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="sheet" className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
          <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-card shadow-2xl md:rounded-3xl ${size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-lg'}`}
            {...motionProps}
          >
            <div onPointerDown={(event) => drag.start(event)} className="shrink-0 touch-none px-5 pt-2.5 md:pt-5">
              <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" />
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid size-9 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink">
                  <X size={19} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
