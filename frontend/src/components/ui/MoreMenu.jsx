import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ellipsis } from 'lucide-react';
import { IconButton } from './Button';

/** "⋯" button with a small menu. Items: { label, icon, onClick, danger }; falsy items are skipped. */
export default function MoreMenu({ items, label = 'More options', light = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const visible = items.filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => !ref.current?.contains(event.target) && setOpen(false);
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!visible.length) return null;

  return (
    <div ref={ref} className="relative shrink-0">
      <IconButton icon={Ellipsis} label={label} size={18} aria-expanded={open} onClick={() => setOpen((value) => !value)} className={`size-9 ${light ? 'text-white hover:bg-white/10 hover:text-white' : ''}`} />
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-10 z-30 min-w-48 origin-top-right rounded-2xl border border-line bg-card p-1 text-ink shadow-xl shadow-black/10"
          >
            {visible.map(({ label: text, icon: Icon, onClick, danger }) => (
              <button
                key={text}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onClick();
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-ink/5 ${danger ? 'text-accent' : ''}`}
              >
                <Icon size={16} className="shrink-0" />
                {text}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
