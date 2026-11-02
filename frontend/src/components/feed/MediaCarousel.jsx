import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePressGestures } from '../../hooks/usePressGestures';
import { mediaUrl } from '../../lib/format';
import Lightbox from '../ui/Lightbox';
import BigHeart from './BigHeart';

// Every slide takes the first photo's shape, kept between portrait 4:5 and landscape 1.91:1; beyond that it is cropped.
const fit = (ratio) => Math.min(Math.max(ratio, 4 / 5), 1.91);

function Slide({ src, onLoad }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative size-full shrink-0 snap-center snap-always">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-ink/10" />}
      <img
        src={mediaUrl(src, 1080)}
        srcSet={`${mediaUrl(src, 640)} 640w, ${mediaUrl(src, 1080)} 1080w`}
        sizes="(min-width: 640px) 470px, 100vw"
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event.currentTarget);
        }}
        className={`size-full select-none object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

function Arrow({ icon: Icon, label, onClick, className }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-black opacity-0 shadow transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 pointer-fine:grid ${className}`}
    >
      <Icon size={18} />
    </button>
  );
}

/**
 * A post's photos, full width: one photo, or a carousel to swipe with a "2/4" counter (the dots sit in the action
 * row, reported through `onSlide`). Tap opens the full-screen viewer, double-tap likes with a big heart, and each
 * photo's space shimmers until it loads. Older posts without a saved shape take it from the first photo once loaded.
 */
export default function MediaCarousel({ images, aspect, onDoubleTap, onSlide }) {
  const track = useRef(null);
  const [index, setIndex] = useState(0);
  const [measured, setMeasured] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [heart, setHeart] = useState(0);
  const count = images.length;
  const gestures = usePressGestures({
    onTap: () => setViewer(index),
    onDoubleTap: () => {
      setHeart((value) => value + 1);
      onDoubleTap();
    },
  });

  const settle = (event) => {
    const { scrollLeft, clientWidth } = event.currentTarget;
    const current = Math.round(scrollLeft / clientWidth);
    if (current === index) return;
    setIndex(current);
    onSlide?.(current);
  };

  const go = (to) => track.current.scrollTo({ left: to * track.current.clientWidth, behavior: 'smooth' });

  const measure = (image) => {
    if (image.naturalWidth && image.naturalHeight) setMeasured(image.naturalWidth / image.naturalHeight);
  };

  return (
    <div className="group relative overflow-hidden bg-line" style={{ aspectRatio: fit(aspect ?? measured ?? 1) }}>
      <div
        ref={track}
        {...gestures}
        onScroll={settle}
        onKeyDown={(event) => event.key === 'Enter' && setViewer(index)}
        tabIndex={0}
        role="group"
        aria-label={count > 1 ? `Photo ${index + 1} of ${count}` : 'Photo'}
        className="no-scrollbar flex size-full touch-manipulation snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        {images.map((src, slide) => (
          <Slide key={src} src={src} onLoad={slide === 0 && !aspect ? measure : undefined} />
        ))}
      </div>
      {count > 1 && (
        <>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
            {index + 1}/{count}
          </span>
          {index > 0 && <Arrow icon={ChevronLeft} label="Previous photo" onClick={() => go(index - 1)} className="left-2" />}
          {index < count - 1 && <Arrow icon={ChevronRight} label="Next photo" onClick={() => go(index + 1)} className="right-2" />}
        </>
      )}
      <BigHeart burst={heart} onDone={() => setHeart(0)} />
      <Lightbox items={images} index={viewer} onChange={setViewer} />
    </div>
  );
}
