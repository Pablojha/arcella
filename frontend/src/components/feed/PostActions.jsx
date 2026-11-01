import { useState } from 'react';
import { Bookmark, MessageSquare, Repeat2, Share2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import LikeButton from '../ui/LikeButton';
import RepostSheet from './RepostSheet';

const ACTION = 'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition';
const IDLE = 'text-muted hover:bg-ink/5 hover:text-ink';

/**
 * Like, comment, repost, share and save. Likes and saves change at once and roll back if the server refuses.
 * Only original public posts can be reposted: group posts stay in their group.
 */
export default function PostActions({ post, commentsCount, onComments, onUnreposted }) {
  const toast = useToast();
  const [like, setLike] = useState({ active: post.liked, count: post.likesCount });
  const [saved, setSaved] = useState(post.saved);
  const [repost, setRepost] = useState({ active: post.reposted, count: post.repostsCount });
  const [reposting, setReposting] = useState(false);
  const canRepost = !post.college && post.repostOf === undefined;

  const toggleLike = async () => {
    const previous = like;
    setLike({ active: !like.active, count: like.count + (like.active ? -1 : 1) });
    try {
      const result = await api.post(`/posts/${post._id}/like`);
      setLike({ active: result.liked, count: result.likesCount });
    } catch (error) {
      setLike(previous);
      toast.error(error.message);
    }
  };

  const toggleSave = async () => {
    setSaved(!saved);
    try {
      const result = await api.post(`/posts/${post._id}/save`);
      setSaved(result.saved);
      if (result.saved) toast.success('Saved. Find it under More → Saved');
    } catch (error) {
      setSaved(saved);
      toast.error(error.message);
    }
  };

  const reposted = (next) => {
    setRepost(next);
    if (!next.active) onUnreposted?.();
  };

  const share = async () => {
    const url = `${window.location.origin}/posts/${post._id}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Arcella', text: post.text?.slice(0, 80), url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      // Share sheet dismissed.
    }
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
