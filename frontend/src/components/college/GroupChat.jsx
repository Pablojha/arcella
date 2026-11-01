import { Fragment, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, MessagesSquare, Send, Trash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usePoll } from '../../hooks/usePoll';
import api from '../../lib/api';
import { GROUP_ROLES } from '../../lib/constants';
import { formatDate, formatTime } from '../../lib/format';
import ReportSheet from '../ReportSheet';
import Avatar from '../ui/Avatar';
import EmptyState from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

const POLL_MS = 3000;
const merge = (current, incoming) => [...current, ...incoming.filter((message) => !current.some((old) => old._id === message._id))];
const dayOf = (date) => new Date(date).toDateString();

/** The college's group chat: every verified member can talk, admins can remove any message, and new messages arrive by polling. */
export default function GroupChat({ college }) {
  const { user } = useAuth();
  const toast = useToast();
  const [chat, setChat] = useState({ items: [], hasMore: false, loading: true });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reporting, setReporting] = useState(null);
  const scroller = useRef(null);
  const url = `/colleges/${college._id}/chat`;
  const lastId = chat.items.at(-1)?._id;

  const badgeOf = (author) => {
    if (author?._id === college.admin?._id) return GROUP_ROLES.admin;
    if (author?._id === college.coAdmin?._id) return GROUP_ROLES.coAdmin;
    return author?.isAdmin ? 'Arcella admin' : null;
  };

  useEffect(() => {
    api
      .get(url)
      .then((data) => setChat({ ...data, loading: false }))
      .catch((error) => {
        toast.error(error.message);
        setChat((current) => ({ ...current, loading: false }));
      });
  }, [url, toast]);

  usePoll(
    async () => {
      const { items } = await api.get(url, { params: lastId ? { after: lastId } : {} });
      if (items.length) setChat((current) => ({ ...current, items: merge(current.items, items) }));
    },
    POLL_MS,
    !chat.loading,
  );

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [lastId]);

  const loadEarlier = async () => {
    try {
      const height = scroller.current.scrollHeight;
      const { items, hasMore } = await api.get(url, { params: { before: chat.items[0]._id } });
      setChat((current) => ({ ...current, hasMore, items: [...items, ...current.items] }));
      requestAnimationFrame(() => {
        scroller.current.scrollTop += scroller.current.scrollHeight - height;
      });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const send = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const message = await api.post(url, { text: text.trim() });
      setChat((current) => ({ ...current, items: merge(current.items, [message]) }));
      setText('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (message) => {
    try {
      await api.delete(`${url}/${message._id}`);
      setChat((current) => ({ ...current, items: current.items.filter((item) => item._id !== message._id) }));
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="card flex h-[min(68dvh,640px)] flex-col overflow-hidden">
      <div ref={scroller} className="flex-1 overflow-y-auto px-3 py-4 md:px-5">
        {chat.hasMore && (
          <button type="button" onClick={loadEarlier} className="mx-auto mb-3 block rounded-full px-3 py-1 text-xs font-medium text-muted transition hover:bg-ink/5 hover:text-ink">
            Load earlier messages
          </button>
        )}
        {chat.loading && <Skeleton className="h-12 w-2/3" />}
        {!chat.loading && !chat.items.length && <EmptyState icon={MessagesSquare} title="Say hello" text={`Start the conversation with everyone at ${college.short || college.name}.`} />}
        {chat.items.map((message, index) => {
          const previous = chat.items[index - 1];
          const mine = message.author?._id === user._id;
          const newDay = !previous || dayOf(previous.createdAt) !== dayOf(message.createdAt);
          const sameAuthor = !newDay && previous.author?._id === message.author?._id;
          const badge = badgeOf(message.author);
          return (
            <Fragment key={message._id}>
              {newDay && <p className="py-3 text-center text-[11px] font-medium text-muted">{formatDate(message.createdAt, { weekday: 'short', day: 'numeric', month: 'short' })}</p>}
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 ${mine ? 'justify-end' : ''} ${sameAuthor ? 'mt-1' : 'mt-3'}`}>
                {!mine &&
                  (sameAuthor ? (
                    <span className="w-8 shrink-0" />
                  ) : (
                    <Link to={`/u/${message.author?.username}`} className="shrink-0">
                      <Avatar user={message.author} size={32} />
                    </Link>
                  ))}
                <div className={`flex max-w-[78%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && !sameAuthor && (
                    <p className="mb-0.5 flex items-center gap-1.5 px-1 text-xs font-semibold">
                      {message.author?.name ?? 'Former member'}
                      {badge && <span className="rounded-full bg-brand/10 px-1.5 py-px text-[10px] text-brand">{badge}</span>}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelected(selected === message._id ? null : message._id)}
                    className={`rounded-2xl px-3.5 py-2 text-left text-[15px] ${mine ? 'rounded-br-md bg-brand text-on-brand' : 'rounded-bl-md bg-ink/[0.06]'}`}
                  >
                    <span className="block whitespace-pre-line break-words">{message.text}</span>
                    <span className="mt-0.5 block text-right text-[10px] opacity-60">{formatTime(message.createdAt)}</span>
                  </button>
                  {selected === message._id && (
                    <span className="mt-1 flex gap-1 text-xs">
                      {(mine || college.moderator) && (
                        <button type="button" onClick={() => remove(message)} className="flex items-center gap-1 rounded-full px-2 py-1 text-accent transition hover:bg-accent/10">
                          <Trash size={13} /> Delete
                        </button>
                      )}
                      {!mine && (
                        <button type="button" onClick={() => setReporting({ type: 'chat', id: message._id, label: 'message' })} className="flex items-center gap-1 rounded-full px-2 py-1 text-muted transition hover:bg-ink/5 hover:text-ink">
                          <Flag size={13} /> Report
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </motion.div>
            </Fragment>
          );
        })}
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && send(event)}
          rows={1}
          maxLength={2000}
          placeholder={`Message ${college.short || 'your college'}…`}
          className="input max-h-32 min-h-11 resize-none rounded-3xl py-2.5"
        />
        <button type="submit" aria-label="Send" disabled={!text.trim() || sending} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand transition disabled:opacity-40">
          <Send size={18} />
        </button>
      </form>
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}
