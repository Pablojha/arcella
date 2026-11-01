import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Heart, MessageSquare, Share2, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePostActions } from '../../hooks/usePostActions';
import { videoUrl } from '../../lib/format';
import ReportSheet from '../ReportSheet';
import Avatar from '../ui/Avatar';
import Sheet from '../ui/Sheet';
import Comments from './Comments';

function ReelButton({ icon: Icon, label, count, active, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={active} className="flex flex-col items-center gap-1 text-xs font-semibold drop-shadow">
      <span className={`grid size-11 place-items-center rounded-full bg-black/35 backdrop-blur-sm transition active:scale-90 ${active ? 'text-accent' : ''}`}>
        <Icon size={22} className={active ? 'fill-current' : ''} />
      </span>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

/**
 * One full-screen reel. It plays while on screen (muted if the browser blocks sound), a tap pauses,
 * a double tap likes, and the actions run down the right side like Instagram.
 */
export default function Reel({ post, muted, onMutedChange, onActive }) {
  const ref = useRef(null);
  const callbacks = useRef({ onMutedChange, onActive });
  const { like, toggleLike, saved, toggleSave, share } = usePostActions(post);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [reporting, setReporting] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [heart, setHeart] = useState(0);

  useEffect(() => {
    callbacks.current = { onMutedChange, onActive };
  });

  useEffect(() => {
    const video = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
          return;
        }
        callbacks.current.onActive();
        video.currentTime = 0;
        video.play().catch(() => {
          callbacks.current.onMutedChange(true);
          video.muted = true;
          video.play().catch(() => {});
        });
      },
      { threshold: 0.7 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => (ref.current.paused ? ref.current.play().catch(() => {}) : ref.current.pause());

  const likeByDoubleTap = () => {
    setHeart((count) => count + 1);
    if (!like.active) toggleLike();
  };

  return (
    <section className="flex h-dvh snap-start snap-always items-center justify-center">
      <div className="relative aspect-[9/16] h-full max-w-full overflow-hidden bg-black">
        <video
          ref={ref}
          src={videoUrl(post.video)}
          poster={videoUrl(post.video, true) || undefined}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onClick={togglePlay}
          onDoubleClick={likeByDoubleTap}
          className="size-full object-cover"
        />
        <AnimatePresence>
          {heart > 0 && (
            <motion.span
              key={heart}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.25, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14 }}
              onAnimationComplete={() => setHeart(0)}
              className="pointer-events-none absolute inset-0 grid place-items-center text-white drop-shadow-xl"
            >
              <Heart size={96} className="fill-current" />
            </motion.span>
          )}
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-16 space-y-2 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Link to={`/u/${post.author?.username}`} className="flex w-fit max-w-full items-center gap-2.5 font-semibold">
            <Avatar user={post.author} size={36} />
            <span className="truncate">{post.author?.name}</span>
          </Link>
          {post.text && (
            <button type="button" onClick={() => setExpanded((value) => !value)} className={`block whitespace-pre-line break-words text-left text-sm text-white/90 ${expanded ? 'max-h-40 overflow-y-auto' : 'line-clamp-2'}`}>
              {post.text}
            </button>
          )}
        </div>
        <div className="absolute bottom-0 right-0 flex flex-col items-center gap-4 p-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
          <ReelButton icon={Heart} label="Like" active={like.active} count={like.count} onClick={toggleLike} />
          <ReelButton icon={MessageSquare} label="Comments" count={commentsCount} onClick={() => setCommentsOpen(true)} />
          <ReelButton icon={Share2} label="Share" onClick={share} />
          <ReelButton icon={Bookmark} label="Save" active={saved} onClick={toggleSave} />
          <ReelButton icon={muted ? VolumeX : Volume2} label={muted ? 'Unmute' : 'Mute'} onClick={() => onMutedChange(!muted)} />
        </div>
      </div>
      <Sheet open={commentsOpen} onClose={() => setCommentsOpen(false)} title="Comments">
        <Comments post={post} onCount={(change) => setCommentsCount((count) => count + change)} onReport={setReporting} />
      </Sheet>
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </section>
  );
}
