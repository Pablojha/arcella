import { useState } from 'react';
import { Bookmark, MessageSquare, Repeat2, Share2 } from 'lucide-react';
import { usePostActions } from '../../hooks/usePostActions';
import LikeButton from '../ui/LikeButton';
import RepostSheet from './RepostSheet';

const ACTION = 'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition';
const IDLE = 'text-muted hover:bg-ink/5 hover:text-ink';

/** Like, comment, repost, share and save. Only original public posts can be reposted: group posts stay in their group. */
export default function PostActions({ post, commentsCount, onComments, onUnreposted }) {
  const { like, toggleLike, saved, toggleSave, share } = usePostActions(post);
  const [repost, setRepost] = useState({ active: post.reposted, count: post.repostsCount });
  const [reposting, setReposting] = useState(false);
  const canRepost = !post.college && post.repostOf === undefined;

  const reposted = (next) => {
    setRepost(next);
    if (!next.active) onUnreposted?.();
  };

  return (
    <footer className="-mx-2 flex items-center gap-1">
      <LikeButton active={like.active} count={like.count} onToggle={toggleLike} />
      <button type="button" onClick={onComments} aria-label="Comments" className={`${ACTION} ${IDLE}`}>
        <MessageSquare size={18} />
        {commentsCount > 0 && <span className="tabular-nums">{commentsCount}</span>}
      </button>
      {canRepost && (
        <button type="button" onClick={() => setReposting(true)} aria-label="Repost" aria-pressed={repost.active} className={`${ACTION} ${repost.active ? 'text-brand' : IDLE}`}>
          <Repeat2 size={19} />
          {repost.count > 0 && <span className="tabular-nums">{repost.count}</span>}
        </button>
      )}
      <button type="button" onClick={share} aria-label="Share" className={`ml-auto ${ACTION} ${IDLE}`}>
        <Share2 size={17} />
      </button>
      <LikeButton active={saved} onToggle={toggleSave} icon={Bookmark} label="Save" />
      {canRepost && <RepostSheet post={post} reposted={repost.active} open={reposting} onClose={() => setReposting(false)} onChange={reposted} />}
    </footer>
  );
}
