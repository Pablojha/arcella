import { useEffect, useRef, useState } from 'react';
import { Clapperboard, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { videoUrl } from '../../lib/format';

/**
 * A video post as a vertical reel: plays muted while mostly on screen (not with Data Saver on), the speaker
 * button toggles sound, and tapping opens the full-screen Reels viewer at this post.
 */
export default function ReelVideo({ post }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = ref.current;
    if (navigator.connection?.saveData) return undefined;
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? video.play().catch(() => {}) : video.pause()), { threshold: 0.6 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[calc(78vh*9/16)] overflow-hidden rounded-2xl bg-black">
      <video
        ref={ref}
        src={videoUrl(post.video)}
        poster={videoUrl(post.video, true) || undefined}
        muted={muted}
        loop
        playsInline
        preload="none"
        onTimeUpdate={(event) => setProgress(event.target.currentTime / event.target.duration || 0)}
        onClick={() => navigate(`/reels?start=${post._id}`)}
        className="size-full cursor-pointer object-cover"
      />
      <span className="chip pointer-events-none absolute left-3 top-3 bg-black/45 text-white backdrop-blur-sm">
        <Clapperboard size={12} /> Reel
      </span>
      <button type="button" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted((value) => !value)} className="absolute bottom-4 right-3 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
        {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
        <div className="h-full bg-white transition-[width] duration-300 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
