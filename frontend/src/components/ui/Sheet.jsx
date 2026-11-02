import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useMedia } from '../../hooks/useMedia';
import { useViewportHeight } from '../../hooks/useViewportHeight';

// Open sheets, newest last: Escape closes only the top one, and the page scrolls again once none is open.
const stack = [];

/**
 * Bottom sheet on phones (drag the handle down to close), centered dialog on larger screens. An `expandable` sheet
 * opens part-way up and goes full screen when its handle is dragged up (dragging down steps back). A `footer`, such
 * as a comment box, stays pinned under the scrolling content and above the on-screen keyboard.
 */
export default function Sheet({ open, onClose, title, size = 'md', expandable = false, footer, children }) {
  const desktop = useMedia('(min-width: 768px)');
  const drag = useDragControls();
  const [full, setFull] = useState(false);
  const close = useRef(onClose);
  useViewportHeight(open && Boolean(footer));

  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const id = Symbol('sheet');
    stack.push(id);
    const onKey = (event) => event.key === 'Escape' && stack.at(-1) === id && close.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      stack.splice(stack.indexOf(id), 1);
      document.removeEventListener('keydown', onKey);
      if (!stack.length) document.body.style.overflow = '';
    };
  }, [open]);

  const height = expandable && { height: full ? '100dvh' : '75dvh' };
  const motionProps = desktop
    ? { initial: { opacity: 0, scale: 0.96, y: 16 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 8 } }
    : {
        initial: { y: '100%', ...height },
        animate: { y: 0, ...height },
        exit: { y: '100%' },
        drag: 'y',
        dragControls: drag,
        dragListener: false,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: expandable && !full ? 0.3 : 0, bottom: 0.7 },
        onDragEnd: (_, { offset, velocity }) => {
          if (expandable && !full && (offset.y < -60 || velocity.y < -600)) setFull(true);
          else if (offset.y > 110 || velocity.y > 600) {
            if (full) setFull(false);
            else onClose();
          }
        },
      };

  return createPortal(
    <AnimatePresence onExitComplete={() => setFull(false)}>
      {open && (
        <div key="sheet" className={`fixed inset-x-0 z-[60] flex items-end justify-center md:items-center md:p-6 ${footer ? 'top-[var(--app-top,0px)] h-[var(--app-height,100dvh)]' : 'inset-y-0'}`}>
          <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={`relative flex w-full flex-col bg-card shadow-2xl md:rounded-3xl md:border md:border-line ${full ? 'pt-[env(safe-area-inset-top)]' : 'rounded-t-3xl border border-line'} ${expandable ? 'max-h-full md:h-[min(85vh,760px)]' : 'max-h-[92dvh]'} ${size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-lg'}`}
            {...motionProps}
          >
            {/* Unselectable, so dragging it with a mouse never starts a text selection (which cancels the next drag). */}
            <div onPointerDown={(event) => drag.start(event)} className="shrink-0 touch-none select-none px-5 pt-2.5 md:pt-5">
              <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" />
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid size-9 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink">
                  <X size={19} />
                </button>
              </div>
            </div>
            <div className={`overflow-y-auto overscroll-contain px-5 pt-3 ${footer ? 'min-h-0 flex-1 pb-3' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'}`}>{children}</div>
            {footer}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
