import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Flag, MessageSquare, Share2, Trash } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBlock } from '../../hooks/useBlock';
import api from '../../lib/api';
import { timeAgo } from '../../lib/format';
import ReportSheet from '../ReportSheet';
import ImageGrid from '../ui/ImageGrid';
import LikeButton from '../ui/LikeButton';
import MoreMenu from '../ui/MoreMenu';
import UserChip from '../ui/UserChip';
import Comments from './Comments';

const LONG_POST = 320;

export default function PostCard({ post, onDeleted, onAuthorBlocked, showComments = false, canModerate = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const toggleBlock = useBlock();
  const [like, setLike] = useState({ active: post.liked, count: post.likesCount });
  const [commentsOpen, setCommentsOpen] = useState(showComments);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [expanded, setExpanded] = useState(false);
  const [reporting, setReporting] = useState(null);
  const own = post.author?._id === user._id;
  const canDelete = own || user.isAdmin || canModerate;
  const long = post.text?.length > LONG_POST;

  const blockAuthor = async () => {
    if (await toggleBlock(post.author)) onAuthorBlocked?.(post.author._id);
  };

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

  const remove = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${post._id}`);
      toast.success('Post deleted');
      onDeleted?.(post._id);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <article className="card space-y-3 p-4">
      <header className="flex items-start justify-between gap-3">
        <UserChip user={post.author} sub={`${post.author?.headline ? `${post.author.headline} · ` : ''}${timeAgo(post.createdAt)}`} size={44} />
        <MoreMenu
          label="Post options"
          items={[
            canDelete && { label: 'Delete post', icon: Trash, onClick: remove, danger: true },
            !own && { label: 'Report post', icon: Flag, onClick: () => setReporting({ type: 'post', id: post._id, label: 'post' }) },
            !own && post.author && { label: `Block ${post.author.name.split(' ')[0]}`, icon: Ban, onClick: blockAuthor },
          ]}
        />
      </header>

      {post.text && (
        <p className={`whitespace-pre-line break-words text-[15px] leading-relaxed ${long && !expanded ? 'line-clamp-5' : ''}`}>
          {post.text}
        </p>
      )}
      {long && !expanded && (
        <button type="button" onClick={() => setExpanded(true)} className="-mt-2 text-sm font-medium text-muted hover:text-ink">
          …see more
        </button>
      )}

      <ImageGrid images={post.images} />

      <footer className="-mx-2 flex items-center gap-1">
        <LikeButton active={like.active} count={like.count} onToggle={toggleLike} />
        <button type="button" onClick={() => setCommentsOpen((open) => !open)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition hover:bg-ink/5 hover:text-ink">
          <MessageSquare size={18} />
          {commentsCount > 0 && <span className="tabular-nums">{commentsCount}</span>}
        </button>
        <button type="button" onClick={share} aria-label="Share" className="ml-auto inline-flex h-9 items-center rounded-full px-3 text-muted transition hover:bg-ink/5 hover:text-ink">
          <Share2 size={17} />
        </button>
      </footer>

      <AnimatePresence initial={false}>
        {commentsOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Comments post={post} onCount={(change) => setCommentsCount((count) => count + change)} onReport={setReporting} />
          </motion.div>
        )}
      </AnimatePresence>
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </article>
  );
}
