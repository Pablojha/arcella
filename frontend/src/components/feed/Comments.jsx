import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag, Send, Trash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import api from '../../lib/api';
import { timeAgo } from '../../lib/format';
import Avatar from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';

export default function Comments({ post, onCount, onReport }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, setData, loading } = useApi(`/posts/${post._id}/comments`);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const comment = await api.post(`/posts/${post._id}/comments`, { text });
      setData((current) => ({ items: [...(current?.items ?? []), comment] }));
      setText('');
      onCount(1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/posts/${post._id}/comments/${id}`);
      setData((current) => ({ items: current.items.filter((comment) => comment._id !== id) }));
      onCount(-1);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-3 border-t border-line pt-3">
      {loading && <Skeleton className="h-10 w-full" />}
      <AnimatePresence initial={false}>
        {data?.items.map((comment) => (
          <motion.div key={comment._id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="group flex gap-2.5">
            <Avatar user={comment.author} size={32} />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-ink/[0.04] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <Link to={`/u/${comment.author?.username}`} className="truncate text-[13px] font-semibold hover:underline">
                  {comment.author?.name}
                </Link>
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
                  {timeAgo(comment.createdAt)}
                  {(comment.author?._id === user._id || post.author._id === user._id || user.isAdmin) && (
                    <button type="button" aria-label="Delete comment" onClick={() => remove(comment._id)} className="p-0.5 opacity-60 hover:text-accent hover:opacity-100">
                      <Trash size={12} />
                    </button>
                  )}
                  {comment.author?._id !== user._id && (
                    <button type="button" aria-label="Report comment" onClick={() => onReport({ type: 'comment', id: comment._id, label: 'comment' })} className="p-0.5 opacity-60 hover:text-accent hover:opacity-100">
                      <Flag size={12} />
                    </button>
                  )}
                </span>
              </div>
              <p className="whitespace-pre-line break-words text-sm">{comment.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <form onSubmit={submit} className="flex items-center gap-2">
        <Avatar user={user} size={32} />
        <input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} placeholder="Add a comment…" className="input h-10 rounded-full py-0" />
        <button type="submit" disabled={!text.trim() || sending} aria-label="Send comment" className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-on-brand transition disabled:opacity-40">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
