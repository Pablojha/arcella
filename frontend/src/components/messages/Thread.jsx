import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Ban, CheckCheck, Flag, Lock, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBadges } from '../../context/BadgeContext';
import { useToast } from '../../context/ToastContext';
import { useBlock } from '../../hooks/useBlock';
import { usePoll } from '../../hooks/usePoll';
import api from '../../lib/api';
import { formatDate, formatTime, mediaUrl } from '../../lib/format';
import ReportSheet from '../ReportSheet';
import Avatar from '../ui/Avatar';
import MoreMenu from '../ui/MoreMenu';
import { Skeleton } from '../ui/Skeleton';
import VerifiedBadge from '../ui/VerifiedBadge';

const POLL_MS = 4000;
const merge = (current, incoming) => [...current, ...incoming.filter((message) => !current.some((old) => old._id === message._id))];
const dayOf = (date) => new Date(date).toDateString();

export default function Thread({ userId }) {
  const { user: me } = useAuth();
  const { refresh } = useBadges();
  const toast = useToast();
  const toggleBlock = useBlock();
  const [thread, setThread] = useState({ user: null, items: [], canMessage: false, blockedByMe: false, seenUntil: null, error: '' });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(null);
  const scroller = useRef(null);

  const load = useCallback(
    () =>
      api
        .get(`/messages/${userId}`)
        .then((data) => {
          setThread({ ...data, error: '' });
          refresh();
        })
        .catch((error) => setThread((current) => ({ ...current, error: error.message }))),
    [userId, refresh],
  );

  useEffect(() => {
    load();
  }, [load]);

  usePoll(
    async () => {
      const after = thread.items.at(-1)?._id;
      const { items, seenUntil } = await api.get(`/messages/${userId}`, { params: after ? { after } : {} });
      setThread((current) => ({ ...current, seenUntil, items: merge(current.items, items) }));
      if (items.length) refresh();
    },
    POLL_MS,
    Boolean(thread.user),
  );

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [thread.items.length]);

  const send = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const message = await api.post(`/messages/${userId}`, { text: text.trim() });
      setThread((current) => ({ ...current, items: merge(current.items, [message]) }));
      setText('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const block = async () => {
    if ((await toggleBlock(thread.user, thread.blockedByMe)) !== null) load();
  };

  const other = thread.user;
  const lastMine = thread.items.findLast((message) => message.from === me._id);
  const seen = lastMine && thread.seenUntil && lastMine._id <= thread.seenUntil;

  return (
    <div className="-mx-4 flex h-dvh min-h-0 flex-1 flex-col bg-card md:mx-0 md:h-full">
      <header className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-5">
        <Link to="/messages" aria-label="Back to conversations" className="grid size-9 place-items-center rounded-full hover:bg-ink/5 md:hidden">
          <ArrowLeft size={20} />
        </Link>
        {other ? (
          <Link to={`/u/${other.username}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
            <Avatar user={other} size={40} />
            <span className="min-w-0">
              <span className="flex items-center gap-1 font-semibold">
                <span className="truncate">{other.name}</span>
                {other.verified && <VerifiedBadge />}
              </span>
              <span className="block truncate text-xs text-muted">{other.headline}</span>
            </span>
          </Link>
        ) : (
          <Skeleton className="h-10 w-48" />
        )}
        {other && (
          <MoreMenu
            label="Conversation options"
            items={[
              { label: `Report ${other.name.split(' ')[0]}`, icon: Flag, onClick: () => setReporting({ type: 'user', id: other._id, label: other.name }) },
              { label: thread.blockedByMe ? 'Unblock' : `Block ${other.name.split(' ')[0]}`, icon: Ban, onClick: block, danger: !thread.blockedByMe },
            ]}
          />
        )}
      </header>

      <div ref={scroller} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4 md:px-5">
        {thread.error && <p className="py-10 text-center text-sm text-muted">{thread.error}</p>}
        {thread.items.map((message, index) => {
          const mine = message.from === me._id;
          const newDay = index === 0 || dayOf(message.createdAt) !== dayOf(thread.items[index - 1].createdAt);
          return (
            <Fragment key={message._id}>
              {newDay && <p className="py-3 text-center text-[11px] font-medium text-muted">{formatDate(message.createdAt, { weekday: 'short', day: 'numeric', month: 'short' })}</p>}
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] ${mine ? 'rounded-br-md bg-brand text-on-brand' : 'rounded-bl-md bg-ink/[0.06]'}`}>
                  {message.storyImage && (
                    <span className="mb-1.5 block">
                      <span className="mb-1 block text-[11px] opacity-75">{mine ? 'You replied to their story' : 'Replied to your story'}</span>
                      <img src={mediaUrl(message.storyImage, 300)} alt="" className="h-28 rounded-xl object-cover" />
                    </span>
                  )}
                  <p className="whitespace-pre-line break-words">{message.text}</p>
                  <span className="mt-0.5 block text-right text-[10px] opacity-60">{formatTime(message.createdAt)}</span>
                </div>
              </motion.div>
              {message === lastMine && seen && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-end gap-1 pr-1 text-[11px] text-muted">
                  <CheckCheck size={13} className="text-brand" /> Seen
                </motion.p>
              )}
            </Fragment>
          );
        })}
      </div>

      {other && !thread.canMessage ? (
        <p className="flex items-center justify-center gap-2 border-t border-line px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted">
          <Lock size={15} className="shrink-0" />
          {thread.blockedByMe ? `You blocked ${other.name.split(' ')[0]}. Unblock them to send messages.` : `Connect with ${other.name.split(' ')[0]} to start a conversation.`}
        </p>
      ) : (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-line px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-5">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && send(event)}
            rows={1}
            maxLength={2000}
            placeholder="Write a message…"
            className="input max-h-32 min-h-11 resize-none rounded-3xl py-2.5"
          />
          <button type="submit" aria-label="Send" disabled={!text.trim() || sending} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand transition disabled:opacity-40">
            <Send size={18} />
          </button>
        </form>
      )}
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}
