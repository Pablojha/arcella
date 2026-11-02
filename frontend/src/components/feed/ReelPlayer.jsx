import { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { usePressGestures } from '../../hooks/usePressGestures';
import { videoUrl } from '../../lib/format';
import { playExclusive } from '../../lib/media';

/**
 * A reel's video, filling its box (cover, so never any bars). It plays while `threshold` of it is on screen and pauses
 * off screen, one video at a time; with `restart` it starts over each time it comes back. Its thumbnail stays up until
 * playback starts, a spinner shows while it buffers, and a failed load offers Retry. `onTap` gets the <video>.
 */
export default function ReelPlayer({ src, muted, threshold, autoPlay = true, restart = false, preload = 'metadata', onActive, onSoundBlocked, onTap, onDoubleTap }) {
  const ref = useRef(null);
  const callbacks = useRef({ onActive, onSoundBlocked });
  const [started, setStarted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const poster = videoUrl(src, true);
  const gestures = usePressGestures({ onTap: () => onTap?.(ref.current), onDoubleTap });

  useEffect(() => {
    callbacks.current = { onActive, onSoundBlocked };
  });

  useEffect(() => {
    if (!autoPlay) return undefined;
    const video = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
          return;
        }
        callbacks.current.onActive?.();
        if (restart) video.currentTime = 0;
        video.play().catch((error) => {
          if (error.name !== 'NotAllowedError' || video.muted) return;
          // The browser wants a tap before playing sound: carry on muted.
          callbacks.current.onSoundBlocked?.();
          video.muted = true;
          video.play().catch(() => {});
        });
      },
      { threshold },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [autoPlay, restart, threshold]);

  const retry = () => {
    setFailed(false);
    ref.current.load();
    ref.current.play().catch(() => {});
  };

  return (
    <>
      <video
        ref={ref}
        src={videoUrl(src)}
        muted={muted}
        loop
        playsInline
        // Without a thumbnail, load enough to show the first frame instead.
        preload={poster ? preload : 'metadata'}
        {...gestures}
        onPlay={(event) => playExclusive(event.currentTarget)}
        onPlaying={() => {
          setStarted(true);
          setBuffering(false);
        }}
        onWaiting={() => setBuffering(true)}
        onError={() => setFailed(true)}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime / event.currentTarget.duration || 0)}
        className="size-full touch-manipulation object-cover"
      />
      {poster && <img src={poster} alt="" className={`pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-300 ${started ? 'opacity-0' : ''}`} />}
      {buffering && !failed && <span className="pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-1/2 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />}
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 p-6 text-center text-sm text-white">
          <div className="space-y-3">
            <p>Couldn't load this video.</p>
            <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-semibold text-black">
              <RotateCw size={15} /> Retry
            </button>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/25">
        <div className="h-full bg-white transition-[width] duration-300 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
    </>
  );
}
