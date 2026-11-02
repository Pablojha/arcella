import { useState } from 'react';
import { Bookmark, Heart, MessageCircle, Play, Send, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePostActions } from '../../hooks/usePostActions';
import { useReelSound } from '../../hooks/useReelSound';
import ReportSheet from '../ReportSheet';
import Avatar from '../ui/Avatar';
import Sheet from '../ui/Sheet';
import BigHeart from './BigHeart';
import Comments from './Comments';
import ReelPlayer from './ReelPlayer';

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
 * One full-screen reel. It starts over each time it comes on screen, muted until sound is turned on; a tap pauses
 * or resumes, a double tap likes, and the actions run down the right side.
 */
export default function Reel({ post, onActive }) {
  const { like, toggleLike, saved, toggleSave, share } = usePostActions(post);
  const [soundOn, setSoundOn] = useReelSound();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [reporting, setReporting] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [pausedByTap, setPausedByTap] = useState(false);
  const [heart, setHeart] = useState(0);

  const togglePlay = (video) => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
    setPausedByTap(video.paused);
  };

  const likeByDoubleTap = () => {
    setHeart((count) => count + 1);
    if (!like.active) toggleLike();
  };

  return (
    <section className="flex h-dvh snap-start snap-always items-center justify-center">
      <div className="relative aspect-[9/16] h-full max-w-full overflow-hidden bg-black">
        <ReelPlayer
          src={post.video}
          muted={!soundOn}
          threshold={0.7}
          restart
          onActive={() => {
            setPausedByTap(false);
            onActive();
          }}
          onSoundBlocked={() => setSoundOn(false)}
          onTap={togglePlay}
          onDoubleTap={likeByDoubleTap}
        />
        {pausedByTap && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm">
              <Play size={30} className="ml-1 fill-current" />
            </span>
          </span>
        )}
        <BigHeart burst={heart} onDone={() => setHeart(0)} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-16 space-y-2 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Link to={`/u/${post.author?.username}`} className="flex w-fit max-w-full items-center gap-2.5 font-semibold">
            <Avatar user={post.author} size={36} />
            <span className="truncate">{post.author?.name}</span>
          </Link>
          {post.text && (
            <button type="button" onClick={() => setExpanded((value) => !value)} className={`whitespace-pre-line break-words text-left text-sm text-white/90 ${expanded ? 'block max-h-40 overflow-y-auto' : 'line-clamp-2'}`}>
              {post.text}
            </button>
          )}
        </div>
        <div className="absolute bottom-0 right-0 flex flex-col items-center gap-4 p-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
          <ReelButton icon={Heart} label="Like" active={like.active} count={like.count} onClick={toggleLike} />
          <ReelButton icon={MessageCircle} label="Comments" count={commentsCount} onClick={() => setCommentsOpen(true)} />
          <ReelButton icon={Send} label="Share" onClick={share} />
          <ReelButton icon={Bookmark} label="Save" active={saved} onClick={toggleSave} />
          <ReelButton icon={soundOn ? Volume2 : VolumeX} label={soundOn ? 'Mute' : 'Unmute'} onClick={() => setSoundOn(!soundOn)} />
        </div>
      </div>
      <Sheet open={commentsOpen} onClose={() => setCommentsOpen(false)} title="Comments">
        <Comments post={post} onCount={(change) => setCommentsCount((count) => count + change)} onReport={setReporting} />
      </Sheet>
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </section>
  );
}
