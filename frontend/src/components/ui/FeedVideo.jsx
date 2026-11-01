import { useEffect, useRef } from 'react';
import { videoUrl } from '../../lib/format';

/** Plays muted while mostly on screen and pauses once scrolled away, like Instagram. Data Saver turns autoplay off. */
export default function FeedVideo({ src }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (navigator.connection?.saveData) return undefined;
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? video.play().catch(() => {}) : video.pause()), { threshold: 0.6 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return <video ref={ref} src={videoUrl(src)} poster={videoUrl(src, true) || undefined} muted loop playsInline controls preload="none" className="max-h-[560px] w-full rounded-2xl bg-black" />;
}
