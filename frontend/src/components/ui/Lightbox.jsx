import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { mediaUrl } from '../../lib/format';

/** Full-screen image viewer. Controlled: `index` is null when closed; swipe or arrow keys to move. */
export default function Lightbox({ images, index, onChange }) {
  const open = index != null;
  const many = images.length > 1;
  const go = (step) => onChange((index + step + images.length) % images.length);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onChange(null);
      if (many && event.key === 'ArrowRight') onChange((index + 1) % images.length);
      if (many && event.key === 'ArrowLeft') onChange((index - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, many, index, images.length, onChange]);

  const arrow = 'absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 md:grid';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="lightbox" className="fixed inset-0 z-[80] grid place-items-center bg-black/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onChange(null)}>
          <motion.img
            key={index}
            src={mediaUrl(images[index], 2000)}
            alt=""
            className="max-h-[86dvh] max-w-[94vw] select-none rounded-lg object-contain"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            drag={many ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={(_, info) => Math.abs(info.offset.x) > 70 && go(info.offset.x < 0 ? 1 : -1)}
            onClick={(event) => event.stopPropagation()}
          />
          <button type="button" aria-label="Close" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-full bg-white/10 text-white">
            <X size={20} />
          </button>
          {many && (
            <>
              <button type="button" aria-label="Previous" onClick={(event) => (event.stopPropagation(), go(-1))} className={`${arrow} left-4`}>
                <ChevronLeft />
              </button>
              <button type="button" aria-label="Next" onClick={(event) => (event.stopPropagation(), go(1))} className={`${arrow} right-4`}>
                <ChevronRight />
              </button>
              <span className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                {index + 1} / {images.length}
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
