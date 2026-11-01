import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import { Eye, Send, Trash, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { mediaUrl, timeAgo } from '../../lib/format';
import Avatar from '../ui/Avatar';

const DURATION = 5000;

function Viewer({ groups, index, onIndex, onSeen, onDeleted }) {
  const { user } = useAuth();
  const toast = useToast();
  const group = groups[index];
  const own = group.author._id === user._id;
  const [storyIndex, setStoryIndex] = useState(() => Math.max(0, group.stories.findIndex((story) => !story.seen)));
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState('');
  const progress = useMotionValue(0);
  const pressedAt = useRef(0);
  const story = group.stories[storyIndex];

  const next = useCallback(() => {
    progress.set(0);
    if (storyIndex < group.stories.length - 1) setStoryIndex(storyIndex + 1);
    else onIndex(index < groups.length - 1 ? index + 1 : null);
  }, [progress, storyIndex, group.stories.length, index, groups.length, onIndex]);

  const prev = () => {
    progress.set(0);
    if (storyIndex > 0) setStoryIndex(storyIndex - 1);
    else if (index > 0) onIndex(index - 1);
  };

  useEffect(() => {
    if (paused) return undefined;
    const startedAt = performance.now() - progress.get() * DURATION;
    let frame;
    const tick = (now) => {
      const value = (now - startedAt) / DURATION;
      if (value >= 1) return next();
      progress.set(value);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, next, progress]);

  // Mark each story seen once and preload the next image; runs per story, not per re-render.
  useEffect(() => {
    if (!own && !story.seen) {
      api.post(`/stories/${story._id}/view`).catch(() => {});
      onSeen(story._id);
    }
    const upcoming = group.stories[storyIndex + 1];
    if (upcoming) new Image().src = mediaUrl(upcoming.image, 1080);
  }, [story._id]);

  const release = (event) => {
    setPaused(false);
    if (Date.now() - pressedAt.current > 250) return;
    const { left, width } = event.currentTarget.getBoundingClientRect();
    if (event.clientX - left < width * 0.3) prev();
    else next();
  };

  const sendReply = async (event) => {
    event.preventDefault();
    try {
      await api.post(`/stories/${story._id}/reply`, { text: reply });
      setReply('');
      toast.success(`Reply sent to ${group.author.name.split(' ')[0]}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/stories/${story._id}`);
      toast.success('Story deleted');
      onDeleted();
      onIndex(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="relative flex size-full flex-col overflow-hidden bg-black md:aspect-[9/16] md:h-[92dvh] md:w-auto md:rounded-3xl">
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/60 to-transparent px-3 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex gap-1">
          {group.stories.map((item, i) => (
            <span key={item._id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <motion.span className="block h-full origin-left bg-white" style={{ scaleX: i === storyIndex ? progress : i < storyIndex ? 1 : 0 }} />
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2.5 text-white">
          <Avatar user={group.author} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{group.author.name}</p>
            <p className="text-xs text-white/70">{timeAgo(story.createdAt)}</p>
          </div>
          {own && (
            <button type="button" aria-label="Delete story" onClick={remove} className="grid size-9 place-items-center rounded-full hover:bg-white/10">
              <Trash size={18} />
            </button>
          )}
          <button type="button" aria-label="Close stories" onClick={() => onIndex(null)} className="grid size-9 place-items-center rounded-full hover:bg-white/10">
            <X size={22} />
          </button>
        </div>
      </div>

      <div
        className="relative flex-1 select-none"
        onPointerDown={() => {
          pressedAt.current = Date.now();
          setPaused(true);
        }}
        onPointerUp={release}
        onPointerCancel={() => setPaused(false)}
      >
        <AnimatePresence initial={false}>
          <motion.img key={story._id} src={mediaUrl(story.image, 1080)} alt="" draggable={false} className="absolute inset-0 size-full object-contain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        </AnimatePresence>
        {story.caption && <p className="absolute inset-x-4 bottom-6 rounded-2xl bg-black/50 px-4 py-2.5 text-center text-sm text-white backdrop-blur">{story.caption}</p>}
      </div>

      <div className="z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {own ? (
          <p className="flex items-center justify-center gap-2 py-2.5 text-sm text-white/80">
            <Eye size={16} /> Seen by {story.viewsCount}
          </p>
        ) : (
          <form onSubmit={sendReply} className="flex items-center gap-2">
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              maxLength={1000}
              placeholder={`Reply to ${group.author.name.split(' ')[0]}…`}
              className="h-11 min-w-0 flex-1 rounded-full border border-white/30 bg-transparent px-4 text-base text-white outline-none placeholder:text-white/60 focus:border-white"
            />
            <button type="submit" disabled={!reply.trim()} aria-label="Send reply" className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-black disabled:opacity-40">
              <Send size={17} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Full-screen stories: progress bars, tap left/right to skip, hold to pause, reply by DM. */
export default function StoryViewer({ groups, index, onIndex, onSeen, onDeleted }) {
  const open = index != null && Boolean(groups[index]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => event.key === 'Escape' && onIndex(null);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onIndex]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="stories" className="fixed inset-0 z-[80] grid place-items-center bg-black md:bg-black/90" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.25 }}>
          <Viewer key={index} groups={groups} index={index} onIndex={onIndex} onSeen={onSeen} onDeleted={onDeleted} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
