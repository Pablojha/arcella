import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Flag, Repeat2, Trash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBlock } from '../../hooks/useBlock';
import api from '../../lib/api';
import { timeAgo } from '../../lib/format';
import ReportSheet from '../ReportSheet';
import FeedVideo from '../ui/FeedVideo';
import ImageGrid from '../ui/ImageGrid';
import MoreMenu from '../ui/MoreMenu';
import UserChip from '../ui/UserChip';
import Comments from './Comments';
import PostActions from './PostActions';
import QuotedPost from './QuotedPost';

const LONG_POST = 320;

/** A plain repost (no words of its own) shows the original under a "reposted" line, and every action acts on the original. */
export default function PostCard({ post, ...props }) {
  if (post.repostOf !== undefined && !post.text) return post.repostOf && <PostBody post={post.repostOf} repost={post} {...props} />;
  return <PostBody post={post} {...props} />;
}

function PostBody({ post, repost, onDeleted, onAuthorBlocked, showComments = false, canModerate = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const toggleBlock = useBlock();
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

  const remove = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${post._id}`);
      toast.success('Post deleted');
      onDeleted?.(post._id);
      if (repost) onDeleted?.(repost._id);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <article className="card space-y-3 p-4">
      {repost && (
        <p className="-mb-1 flex items-center gap-1.5 text-[13px] text-muted">
          <Repeat2 size={15} className="shrink-0" />
          <span className="truncate">
            <Link to={`/u/${repost.author?.username}`} className="font-medium text-ink hover:underline">
              {repost.author?.name}
            </Link>{' '}
            reposted
          </span>
        </p>
      )}
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
      {post.video && <FeedVideo src={post.video} />}
      {post.repostOf !== undefined && <QuotedPost post={post.repostOf} />}

      <PostActions
        post={post}
        commentsCount={commentsCount}
        onComments={() => setCommentsOpen((open) => !open)}
        onUnreposted={() => repost?.author?._id === user._id && onDeleted?.(repost._id)}
      />

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
