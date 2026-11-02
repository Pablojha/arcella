import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { mediaUrl, videoUrl } from '../../lib/format';

/**
 * Full-screen viewer for photos and videos. `items` are image URLs or { url, kind: 'image' | 'video' }; it is controlled,
 * with `index` null when closed. Pinch or double-tap zooms a photo, swiping sideways moves between items, swiping down closes.
 */
export default function Lightbox({ items, index, onChange }) {
  const [zoomed, setZoomed] = useState(false);
  const open = index != null;
  const list = items.map((item) => (typeof item === 'string' ? { url: item, kind: 'image' } : item));
  const many = list.length > 1;
  const item = open ? list[index] : null;

  const go = (step) => {
    setZoomed(false);
    onChange((index + step + list.length) % list.length);
  };
  const close = () => {
    setZoomed(false);
    onChange(null);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onChange(null);
      if (many && event.key === 'ArrowRight') onChange((index + 1) % list.length);
      if (many && event.key === 'ArrowLeft') onChange((index - 1 + list.length) % list.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, many, index, list.length, onChange]);

  const stop = (event) => event.stopPropagation();
  const arrow = 'absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 md:grid';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="lightbox" className="fixed inset-0 z-[80] bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            key={index}
            className="grid size-full place-items-center"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            drag={!zoomed}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={{ left: many ? 0.5 : 0.1, right: many ? 0.5 : 0.1, top: 0.1, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) close();
              else if (many && Math.abs(info.offset.x) > 70) go(info.offset.x < 0 ? 1 : -1);
            }}
          >
            {item.kind === 'video' ? (
              <video src={videoUrl(item.url)} controls autoPlay playsInline onClick={stop} className="max-h-[86dvh] max-w-[94vw] rounded-lg" />
            ) : (
              <TransformWrapper doubleClick={{ mode: 'toggle' }} panning={{ disabled: !zoomed }} onTransformed={(_, state) => setZoomed(state.scale > 1.01)}>
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                  <img src={mediaUrl(item.url, 2000)} alt="" draggable={false} onClick={stop} className="max-h-[86dvh] max-w-[94vw] select-none object-contain" />
                </TransformComponent>
              </TransformWrapper>
            )}
          </motion.div>
          <button type="button" aria-label="Close" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-full bg-white/10 text-white">
            <X size={20} />
          </button>
          {many && (
            <>
              <button type="button" aria-label="Previous" onClick={(event) => (stop(event), go(-1))} className={`${arrow} left-4`}>
                <ChevronLeft />
              </button>
              <button type="button" aria-label="Next" onClick={(event) => (stop(event), go(1))} className={`${arrow} right-4`}>
                <ChevronRight />
              </button>
              <span className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                {index + 1} / {list.length}
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
