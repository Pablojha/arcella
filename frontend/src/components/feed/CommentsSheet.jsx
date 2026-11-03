import { useEffect, useRef, useState } from 'react';
import { Copy, Flag, Heart, MoreHorizontal, Trash, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import { usePressGestures } from '../../hooks/usePressGestures';
import api from '../../lib/api';
import { plural, timeAgo } from '../../lib/format';
import RichText from '../ui/RichText';
import Avatar from '../ui/Avatar';
import Sheet from '../ui/Sheet';
import { Skeleton } from '../ui/Skeleton';

const EMOJI = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];
const MAX_INPUT_HEIGHT = 112;
let localId = 0;

const byTime = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);

function CommentRow({ comment, thread, onLike, onReply, onActions }) {
  const reply = Boolean(comment.parent);
  const gestures = usePressGestures({
    onDoubleTap: () => !comment.liked && !comment.pending && onLike(comment),
    onLongPress: () => !comment.pending && onActions(comment),
  });
  // Replies show whom they answer when it isn't the person who started the thread.
  const mention = reply && comment.replyTo && comment.replyTo._id !== thread.author?._id ? comment.replyTo : null;

  return (
    <div data-comment={comment._id} {...gestures} className={`group flex select-none gap-3 py-2 [-webkit-touch-callout:none] ${comment.pending ? 'opacity-60' : ''}`}>
      <Avatar user={comment.author} size={reply ? 28 : 36} />
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-line break-words text-sm">
          <Link to={`/u/${comment.author?.username}`} className="font-semibold hover:underline">
            {comment.author?.name}
          </Link>{' '}
          {mention && (
            <>
              <Link to={`/u/${mention.username}`} className="font-medium text-brand hover:underline">
                @{mention.name}
              </Link>{' '}
            </>
          )}
          <RichText text={comment.text} mentions={comment.mentions} />
        </p>
        <p className="mt-1 flex items-center gap-3 text-xs font-medium text-muted">
          <span>{comment.pending ? 'Posting…' : timeAgo(comment.createdAt)}</span>
          {comment.likesCount > 0 && <span>{plural(comment.likesCount, 'like')}</span>}
          {!comment.pending && (
            <>
              <button type="button" onClick={() => onReply(comment)} className="hover:text-ink">
                Reply
              </button>
              <button type="button" aria-label="Comment options" onClick={() => onActions(comment)} className="opacity-0 transition hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:hidden">
                <MoreHorizontal size={16} />
              </button>
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        aria-label="Like comment"
        aria-pressed={Boolean(comment.liked)}
        disabled={comment.pending}
        onClick={() => onLike(comment)}
        className={`-mr-2 grid size-8 shrink-0 place-items-center self-start rounded-full transition active:scale-90 ${comment.liked ? 'text-alert' : 'text-muted hover:text-ink'}`}
      >
        <Heart size={14} className={comment.liked ? 'fill-current' : ''} />
      </button>
    </div>
  );
}

function Thread({ comment, replies, open, onToggle, ...actions }) {
  return (
    <li>
      <CommentRow comment={comment} thread={comment} {...actions} />
      {replies.length > 0 && (
        <div className="pl-12">
          {open && replies.map((reply) => <CommentRow key={reply._id} comment={reply} thread={comment} {...actions} />)}
          <button type="button" onClick={onToggle} className="flex items-center gap-3 py-1.5 text-xs font-semibold text-muted hover:text-ink">
            <span className="h-px w-6 bg-current opacity-50" />
            {open ? 'Hide replies' : `View ${replies.length} more ${replies.length === 1 ? 'reply' : 'replies'}`}
          </button>
        </div>
      )}
    </li>
  );
}

function CommentSkeleton() {
  return (
    <div className="space-y-4 py-2">
      {['w-3/4', 'w-1/2', 'w-2/3'].map((width) => (
        <div key={width} className="flex gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className={`h-3 ${width}`} />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A post's comments in a bottom sheet (full screen when dragged up): the caption first, then threads one reply deep
 * with their replies folded away. Like with the heart or a double-tap, Reply, or long-press to copy, delete or
 * report. New comments, likes and deletions show at once and are undone, with a message, if the server refuses.
 */
export default function CommentsSheet({ post, open, onClose, canModerate = false, onCount, onReport }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, setData, loading, error, reload } = useApi(open && `/posts/${post._id}/comments`);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [actionsFor, setActionsFor] = useState(null);
  const input = useRef(null);
  const list = useRef(null);
  const items = data?.items ?? [];
  const replies = new Map();
  for (const comment of items) if (comment.parent) replies.set(comment.parent, [...(replies.get(comment.parent) ?? []), comment]);

  useEffect(() => {
    const box = input.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [text, open]);

  const update = (change) => setData((current) => ({ ...current, items: change(current?.items ?? []) }));
  const patch = (id, fields) => update((comments) => comments.map((comment) => (comment._id === id ? { ...comment, ...fields } : comment)));
  const reveal = (id) => requestAnimationFrame(() => list.current?.querySelector(`[data-comment="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));

  const submit = async (event) => {
    event?.preventDefault();
    const body = text.trim();
    if (!body || !data) return;
    const target = replyingTo;
    const pending = {
      _id: `local-${++localId}`,
      author: user,
      text: body,
      parent: target ? (target.parent ?? target._id) : null,
      replyTo: target?.author,
      likesCount: 0,
      liked: false,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    update((comments) => [...comments, pending]);
    if (pending.parent) setExpanded((current) => new Set(current).add(pending.parent));
    setText('');
    setReplyingTo(null);
    onCount(1);
    reveal(pending._id);
    try {
      const saved = await api.post(`/posts/${post._id}/comments`, { text: body, parent: target?._id });
      update((comments) => comments.map((comment) => (comment._id === pending._id ? saved : comment)));
    } catch (failure) {
      update((comments) => comments.filter((comment) => comment._id !== pending._id));
      onCount(-1);
      // Give their words back so nothing is lost.
      setText((current) => current || body);
      setReplyingTo((current) => current ?? target);
      toast.error(failure.message);
    }
  };

  const like = async (comment) => {
    patch(comment._id, { liked: !comment.liked, likesCount: comment.likesCount + (comment.liked ? -1 : 1) });
    try {
      patch(comment._id, await api.post(`/posts/${post._id}/comments/${comment._id}/like`));
    } catch (failure) {
      patch(comment._id, { liked: comment.liked, likesCount: comment.likesCount });
      toast.error(failure.message);
    }
  };

  /** Deleting a comment takes its replies with it. */
  const remove = async (comment) => {
    const gone = items.filter((item) => item._id === comment._id || item.parent === comment._id);
    const ids = new Set(gone.map((item) => item._id));
    update((comments) => comments.filter((item) => !ids.has(item._id)));
    onCount(-gone.length);
    try {
      const { removed } = await api.delete(`/posts/${post._id}/comments/${comment._id}`);
      if (removed !== gone.length) onCount(gone.length - removed);
    } catch (failure) {
      update((comments) => [...comments, ...gone].sort(byTime));
      onCount(gone.length);
      toast.error(failure.message);
    }
  };

  const reply = (comment) => {
    setReplyingTo(comment);
    input.current?.focus();
  };

  /** Puts an emoji where the cursor is (or at the end), keeping the keyboard open. */
  const insert = (emoji) => {
    const box = input.current;
    const focused = document.activeElement === box;
    const start = focused ? box.selectionStart : text.length;
    const end = focused ? box.selectionEnd : text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    if (focused) requestAnimationFrame(() => box.setSelectionRange(start + emoji.length, start + emoji.length));
  };

  const copy = (comment) =>
    navigator.clipboard.writeText(comment.text).then(
      () => toast.success('Copied'),
      () => toast.error('Copying is blocked in this browser'),
    );

  const own = actionsFor?.author?._id === user._id;
  const options = actionsFor
    ? [
        { label: 'Copy text', icon: Copy, run: copy },
        (own || post.author?._id === user._id || user.isAdmin || canModerate) && { label: 'Delete', icon: Trash, danger: true, run: remove },
        !own && { label: 'Report', icon: Flag, run: (comment) => onReport({ type: 'comment', id: comment._id, label: 'comment' }) },
      ].filter(Boolean)
    : [];

  const footer = (
    <div className="shrink-0 border-t border-line pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 bg-ink/[0.04] px-5 py-2 text-sm text-muted">
          <span className="truncate">
            Replying to <span className="font-medium text-ink">@{replyingTo.author?.name}</span>
          </span>
          <button type="button" aria-label="Cancel reply" onClick={() => setReplyingTo(null)} className="-mr-1.5 grid size-7 shrink-0 place-items-center rounded-full hover:bg-ink/5 hover:text-ink">
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex justify-between px-3 pt-1.5">
        {EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`Add ${emoji}`}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => insert(emoji)}
            className="grid size-10 place-items-center rounded-full text-2xl transition hover:bg-ink/5 active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-end gap-3 px-4 pt-1.5">
        <Avatar user={user} size={36} />
        <div className="flex min-w-0 flex-1 items-end rounded-3xl border border-line pl-4 pr-1.5 transition focus-within:border-ink/30">
          <textarea
            ref={input}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // A keyboard with a mouse posts on Enter; on phones Enter starts a new line.
              if (event.key === 'Enter' && !event.shiftKey && window.matchMedia('(pointer: fine)').matches) submit(event);
            }}
            rows={1}
            maxLength={1000}
            aria-label="Add a comment"
            placeholder="Add a comment…"
            className="min-w-0 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-muted md:text-[15px]"
          />
          <button type="submit" disabled={!text.trim() || !data} className="h-10 shrink-0 px-2.5 text-sm font-semibold text-brand transition disabled:opacity-40">
            Post
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Comments" expandable footer={footer}>
        {post.text && (
          <div className="flex gap-3 border-b border-line pb-3">
            <Avatar user={post.author} size={36} />
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-line break-words text-sm">
                <Link to={`/u/${post.author?.username}`} className="font-semibold hover:underline">
                  {post.author?.name}
                </Link>{' '}
                <RichText text={post.text} mentions={post.mentions} />
              </p>
              <p className="mt-1 text-xs font-medium text-muted">{timeAgo(post.createdAt)}</p>
            </div>
          </div>
        )}
        {loading && !data && <CommentSkeleton />}
        {error && !data && (
          <div className="py-10 text-center text-sm text-muted">
            <p>{error.message}</p>
            <button type="button" onClick={reload} className="mt-3 rounded-full border border-line px-4 py-2 font-medium text-ink transition hover:bg-ink/5">
              Try again
            </button>
          </div>
        )}
        {data && !items.length && (
          <div className="py-14 text-center">
            <p className="font-display text-lg font-semibold">No comments yet.</p>
            <p className="mt-1 text-sm text-muted">Start the conversation.</p>
          </div>
        )}
        <ul ref={list} className="pt-1">
          {items
            .filter((comment) => !comment.parent)
            .map((comment) => (
              <Thread
                key={comment._id}
                comment={comment}
                replies={replies.get(comment._id) ?? []}
                open={expanded.has(comment._id)}
                onToggle={() =>
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (!next.delete(comment._id)) next.add(comment._id);
                    return next;
                  })
                }
                onLike={like}
                onReply={reply}
                onActions={setActionsFor}
              />
            ))}
        </ul>
      </Sheet>
      <Sheet open={Boolean(actionsFor)} onClose={() => setActionsFor(null)} title="Comment">
        <div className="space-y-1 pb-2">
          {options.map(({ label, icon: Icon, danger, run }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                run(actionsFor);
                setActionsFor(null);
              }}
              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left font-medium transition hover:bg-ink/5 ${danger ? 'text-alert' : ''}`}
            >
              <Icon size={20} className={danger ? '' : 'text-muted'} />
              {label}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
