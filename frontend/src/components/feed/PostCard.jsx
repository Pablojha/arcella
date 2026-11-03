import { useState } from 'react';
import { Ban, Flag, Repeat2, Trash, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBlock } from '../../hooks/useBlock';
import { usePostActions } from '../../hooks/usePostActions';
import api from '../../lib/api';
import { formatDate, longAgo, plural } from '../../lib/format';
import ReportSheet from '../ReportSheet';
import MoreMenu from '../ui/MoreMenu';
import UserChip from '../ui/UserChip';
import CommentsSheet from './CommentsSheet';
import MediaCarousel from './MediaCarousel';
import PostActions from './PostActions';
import QuotedPost from './QuotedPost';
import ReelVideo from './ReelVideo';

// A caption under photos shows two lines before "… more"; a post that is only text shows more of itself.
const CAPTION = { lines: 2, chars: 125 };
const BODY = { lines: 6, chars: 320 };

/** The start of a long text (its first lines, up to a length), or null when it is short enough to show whole. */
function shorten(text, { lines, chars }) {
  const start = text.split('\n').slice(0, lines).join('\n').slice(0, chars);
  return start.length < text.length ? start.trimEnd() : null;
}

/** Text cut short with "… more", which reveals the rest. `children` lead the text (the author's name on captions). */
function MoreText({ text, limit, className, children }) {
  const [expanded, setExpanded] = useState(false);
  const short = expanded ? null : shorten(text, limit);
  return (
    <p className={`whitespace-pre-line break-words ${className}`}>
      {children}
      {short ?? text}
      {short && (
        <button type="button" onClick={() => setExpanded(true)} className="text-muted hover:text-ink">
          … more
        </button>
      )}
    </p>
  );
}

/** "Liked by Asha and 12 others": the person named is a connection when one liked it, else "you" or just a count. */
function LikedBy({ likedBy, like }) {
  if (!like.count) return null;
  const lead = likedBy ? (
    <Link to={`/u/${likedBy.username}`} className="font-semibold hover:underline">
      {likedBy.name}
    </Link>
  ) : (
    like.active && <span className="font-semibold">you</span>
  );
  if (!lead) return <p className="px-3 text-sm font-semibold">{plural(like.count, 'like')}</p>;
  return (
    <p className="px-3 text-sm">
      Liked by {lead}
      {like.count > 1 && (
        <>
          {' '}
          and <span className="font-semibold">{plural(like.count - 1, 'other')}</span>
        </>
      )}
    </p>
  );
}

/** A plain repost (no words of its own) shows the original under a "reposted" line, and every action acts on the original. */
export default function PostCard({ post, ...props }) {
  if (post.repostOf !== undefined && !post.text) return post.repostOf && <PostBody post={post.repostOf} repost={post} {...props} />;
  return <PostBody post={post} {...props} />;
}

/**
 * A post laid out like Instagram, with no card: author, full-width photos or reel, the action row, who liked it,
 * the caption, a link to the comments and the time. Text-only posts show their words where the photo would be.
 */
function PostBody({ post, repost, onDeleted, onAuthorBlocked, showComments = false, canModerate = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const toggleBlock = useBlock();
  const actions = usePostActions(post);
  const [commentsOpen, setCommentsOpen] = useState(showComments);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [slide, setSlide] = useState(0);
  const [reporting, setReporting] = useState(null);
  const { author } = post;
  const own = author?._id === user._id;
  const canDelete = own || user.isAdmin || canModerate;
  const hasMedia = post.images.length > 0 || Boolean(post.video);

  const likeByDoubleTap = () => {
    if (!actions.like.active) actions.toggleLike();
  };

  const blockAuthor = async () => {
    if (await toggleBlock(author)) onAuthorBlocked?.(author._id);
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
    <article className={`post-column pb-2 ${post.important ? 'bg-alert/[0.06] sm:overflow-hidden sm:rounded-2xl' : ''}`}>
      {post.important && (
        <p className="flex items-center gap-1.5 bg-alert px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-on-alert">
          <TriangleAlert size={14} /> Important
        </p>
      )}
      {repost && (
        <p className="flex items-center gap-1.5 px-3 pt-2 text-[13px] text-muted">
          <Repeat2 size={15} className="shrink-0" />
          <span className="truncate">
            <Link to={`/u/${repost.author?.username}`} className="font-medium text-ink hover:underline">
              {repost.author?.name}
            </Link>{' '}
            reposted
          </span>
        </p>
      )}
      <header className="flex items-center justify-between gap-3 px-3 py-2.5">
        <UserChip user={author} size={36} />
        <MoreMenu
          label="Post options"
          items={[
            canDelete && { label: 'Delete post', icon: Trash, onClick: remove, danger: true },
            !own && { label: 'Report post', icon: Flag, onClick: () => setReporting({ type: 'post', id: post._id, label: 'post' }) },
            !own && author && { label: `Block ${author.name.split(' ')[0]}`, icon: Ban, onClick: blockAuthor },
          ]}
        />
      </header>

      {post.images.length > 0 && <MediaCarousel images={post.images} aspect={post.aspect} onDoubleTap={likeByDoubleTap} onSlide={setSlide} />}
      {post.video && <ReelVideo post={post} onDoubleTap={likeByDoubleTap} />}
      {!hasMedia && post.text && <MoreText text={post.text} limit={BODY} className="px-3 pb-1 text-[15px] leading-relaxed" />}
      {post.repostOf !== undefined && (
        <div className="px-3 pt-1">
          <QuotedPost post={post.repostOf} />
        </div>
      )}

      <PostActions
        post={post}
        actions={actions}
        slides={post.images.length > 1 ? { count: post.images.length, index: slide } : null}
        onComments={() => setCommentsOpen(true)}
        onUnreposted={() => repost?.author?._id === user._id && onDeleted?.(repost._id)}
      />
      <div className="space-y-1">
        <LikedBy likedBy={post.likedBy} like={actions.like} />
        {hasMedia && post.text && (
          <MoreText text={post.text} limit={CAPTION} className="px-3 text-sm">
            <Link to={`/u/${author?.username}`} className="font-semibold hover:underline">
              {author?.name}
            </Link>{' '}
          </MoreText>
        )}
        {commentsCount > 0 && (
          <button type="button" onClick={() => setCommentsOpen(true)} className="block px-3 py-0.5 text-sm text-muted hover:text-ink">
            {commentsCount === 1 ? 'View 1 comment' : `View all ${commentsCount} comments`}
          </button>
        )}
        <time dateTime={post.createdAt} title={formatDate(post.createdAt)} className="block px-3 text-xs text-muted">
          {longAgo(post.createdAt)}
        </time>
      </div>

      <CommentsSheet
        post={post}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        canModerate={canModerate}
        onCount={(change) => setCommentsCount((count) => count + change)}
        onReport={setReporting}
      />
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </article>
  );
}
