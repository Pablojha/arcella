import { useState } from 'react';
import { Bookmark, MessageCircle, Repeat2, Send } from 'lucide-react';
import LikeButton from '../ui/LikeButton';
import RepostSheet from './RepostSheet';

const ICON = 'inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full transition hover:text-muted active:scale-90';

function Dots({ count, index }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 gap-1">
      {Array.from({ length: count }, (_, dot) => (
        <span key={dot} className={`size-1.5 rounded-full transition-colors ${dot === index ? 'bg-brand' : 'bg-ink/20'}`} />
      ))}
    </span>
  );
}

/**
 * The row under a post: like, comment, repost and share on the left, save on the right, and a carousel's dots
 * (`slides`) in the middle. Only original public posts can be reposted: group posts stay in their group.
 */
export default function PostActions({ post, actions, slides, onComments, onUnreposted }) {
  const { like, toggleLike, saved, toggleSave, share } = actions;
  const [repost, setRepost] = useState({ active: post.reposted, count: post.repostsCount });
  const [reposting, setReposting] = useState(false);
  const canRepost = !post.college && post.repostOf === undefined;

  const reposted = (next) => {
    setRepost(next);
    if (!next.active) onUnreposted?.();
  };

  return (
    <footer className="relative flex items-center px-1.5">
      <LikeButton variant="icon" active={like.active} onToggle={toggleLike} />
      <button type="button" onClick={onComments} aria-label="Comments" className={ICON}>
        <MessageCircle size={24} />
      </button>
      {canRepost && (
        <button type="button" onClick={() => setReposting(true)} aria-label="Repost" aria-pressed={repost.active} className={`${ICON} px-2 ${repost.active ? 'text-brand' : ''}`}>
          <Repeat2 size={24} />
          {repost.count > 0 && <span className="text-sm font-semibold tabular-nums">{repost.count}</span>}
        </button>
      )}
      <button type="button" onClick={share} aria-label="Share" className={ICON}>
        <Send size={22} />
      </button>
      {slides && <Dots {...slides} />}
      <span className="ml-auto">
        <LikeButton variant="icon" active={saved} onToggle={toggleSave} icon={Bookmark} label="Save" activeClass="text-ink" />
      </span>
      {canRepost && <RepostSheet post={post} reposted={repost.active} open={reposting} onClose={() => setReposting(false)} onChange={reposted} />}
    </footer>
  );
}
