import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Flag, MessagesSquare, Trash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useMedia } from '../../hooks/useMedia';
import { usePoll } from '../../hooks/usePoll';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { useViewportHeight } from '../../hooks/useViewportHeight';
import api from '../../lib/api';
import { mergeMessages, pendingMessage, sendMessage, settleMessage } from '../../lib/chat';
import { GROUP_ROLES } from '../../lib/constants';
import { plural } from '../../lib/format';
import { socket } from '../../lib/realtime';
import ChatComposer from '../messages/ChatComposer';
import MessageList from '../messages/MessageList';
import ReactionMenu from '../messages/ReactionMenu';
import ReactionsSheet from '../messages/ReactionsSheet';
import ReportSheet from '../ReportSheet';
import EmptyState from '../ui/EmptyState';
import FirmLogo from '../ui/FirmLogo';
import Lightbox from '../ui/Lightbox';
import { Skeleton } from '../ui/Skeleton';

const TYPING_TIMEOUT_MS = 6000;

/** Reactions name who reacted; the shared chat components, like direct messages, work with ids. */
const reactionIds = (reactions = []) => reactions.map(({ user, emoji }) => ({ user: user?._id ?? user, emoji }));

/** A group message in the shape the shared chat components use: `from` is the author's id. */
const normalize = (message) => ({ ...message, from: message.author?._id, reactions: reactionIds(message.reactions) });

/** Everyone named in some messages (authors and people who reacted), by id. */
const peopleIn = (messages) => Object.fromEntries(messages.flatMap((message) => [message.author, ...(message.reactions ?? []).map((reaction) => reaction.user)]).filter((person) => person?._id).map((person) => [person._id, person]));

/** The phone header of a full-screen group chat, like a conversation's. */
function GroupHeader({ college, onClose }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-line px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <button type="button" onClick={onClose} aria-label="Back to the group" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-ink/5">
        <ArrowLeft size={22} />
      </button>
      <FirmLogo name={college.short || college.name} size={38} />
      <span className="min-w-0">
        <span className="block truncate font-semibold leading-tight">{college.short || college.name}</span>
        <span className="block truncate text-xs text-muted">{plural(college.membersCount, 'member')}</span>
      </span>
    </header>
  );
}

/**
 * A college's group chat, built from the same pieces as direct messages: photos, videos, voice notes, GIFs, emoji
 * reactions, typing dots and live updates, plus each sender's name and group role. Members report messages and
 * delete their own; the college admin, co-admin and site admins delete any. On phones it fills the screen above the
 * keyboard, like a conversation, and `onClose` goes back to the group.
 */
export default function GroupChat({ college, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const desktop = useMedia('(min-width: 768px)');
  const [chat, setChat] = useState({ items: [], hasMore: false, loading: true, error: '' });
  const [people, setPeople] = useState({});
  const [typing, setTyping] = useState(null);
  const [live, setLive] = useState(socket.connected);
  const [viewer, setViewer] = useState(null);
  const [menu, setMenu] = useState(null);
  const [reactionsOf, setReactionsOf] = useState(null);
  const [reporting, setReporting] = useState(null);
  const latestSaved = useRef(null);
  const typingTimer = useRef(null);
  const url = `/colleges/${college._id}/chat`;
  useViewportHeight(!desktop);
  const firstSaved = chat.items.find((message) => !message.status)?._id;

  useEffect(() => {
    latestSaved.current = chat.items.findLast((message) => !message.status)?._id;
  });

  const remember = useCallback((messages) => setPeople((current) => ({ ...current, ...peopleIn(messages) })), []);

  useEffect(() => {
    api
      .get(url)
      .then(({ items, hasMore }) => {
        remember(items);
        setChat({ items: items.map(normalize), hasMore, loading: false, error: '' });
      })
      .catch((error) => setChat((current) => ({ ...current, loading: false, error: error.message })));
  }, [url, remember]);

  const fetchNew = useCallback(async () => {
    const after = latestSaved.current;
    const { items } = await api.get(url, { params: after ? { after } : {} });
    if (!items.length) return;
    remember(items);
    setChat((current) => ({ ...current, items: mergeMessages(current.items, items.map(normalize)) }));
  }, [url, remember]);

  usePoll(() => fetchNew().catch(() => {}), live ? 30_000 : 4000, !chat.loading && !chat.error);

  const loadOlder = useCallback(async () => {
    const { items, hasMore } = await api.get(url, { params: { before: firstSaved } });
    remember(items);
    setChat((current) => ({ ...current, hasMore, items: [...items.map(normalize), ...current.items] }));
  }, [url, firstSaved, remember]);

  // Live updates come through the college's room, joined again after every reconnect.
  useEffect(() => {
    const join = () => socket.emit('group:join', { college: college._id });
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('group:leave', { college: college._id });
      clearTimeout(typingTimer.current);
    };
  }, [college._id]);

  const ours = (payload) => payload.college === college._id;
  const setReactions = (id, reactions) => setChat((current) => ({ ...current, items: current.items.map((item) => (item._id === id ? { ...item, reactions } : item)) }));

  useSocketEvent('connect', () => setLive(true));
  useSocketEvent('disconnect', () => setLive(false));
  useSocketEvent('group:new', (payload) => {
    if (!ours(payload)) return;
    setTyping(null);
    fetchNew().catch(() => {});
  });
  useSocketEvent('group:update', (payload) => {
    if (!ours(payload)) return;
    remember([{ reactions: payload.reactions }]);
    setReactions(payload._id, reactionIds(payload.reactions));
  });
  useSocketEvent('group:remove', (payload) => ours(payload) && setChat((current) => ({ ...current, items: current.items.filter((item) => item._id !== payload._id) })));
  useSocketEvent('group:typing', (payload) => {
    if (!ours(payload) || payload.user._id === user._id) return;
    clearTimeout(typingTimer.current);
    setTyping(payload.typing ? payload.user : null);
    if (payload.typing) typingTimer.current = setTimeout(() => setTyping(null), TYPING_TIMEOUT_MS);
  });

  const transmit = useCallback(
    async (message) => {
      const update = (changes) => setChat((current) => ({ ...current, items: current.items.map((item) => (item._id === message._id ? { ...item, ...changes } : item)) }));
      update({ status: 'sending', progress: 0 });
      try {
        const saved = normalize(await sendMessage(url, message, (progress) => update({ progress })));
        setChat((current) => ({ ...current, items: settleMessage(current.items, message._id, saved) }));
        const local = message.media?.url ?? message.voice?.url;
        if (local?.startsWith('blob:')) URL.revokeObjectURL(local);
      } catch (error) {
        update({ status: 'failed' });
        toast.error(error.message);
      }
    },
    [url, toast],
  );

  const send = (item) => {
    const message = pendingMessage(item, { from: user._id, author: user });
    setChat((current) => ({ ...current, items: [...current.items, message] }));
    transmit(message);
  };

  /** One reaction per member: the same emoji again removes it. Shown at once, undone if the server refuses. */
  const react = async (message, emoji) => {
    const previous = message.reactions ?? [];
    const removing = previous.some((reaction) => reaction.user === user._id && reaction.emoji === emoji);
    setReactions(message._id, [...previous.filter((reaction) => reaction.user !== user._id), ...(removing ? [] : [{ user: user._id, emoji }])]);
    try {
      const { reactions } = await api.put(`${url}/${message._id}/reaction`, { emoji });
      remember([{ reactions }]);
      setReactions(message._id, reactionIds(reactions));
    } catch (error) {
      setReactions(message._id, previous);
      toast.error(error.message);
    }
  };

  const remove = async (message) => {
    if (!window.confirm('Delete this message for everyone in the group?')) return;
    try {
      await api.delete(`${url}/${message._id}`);
      setChat((current) => ({ ...current, items: current.items.filter((item) => item._id !== message._id) }));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const copy = (text) =>
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied'),
      () => toast.error('Copying is blocked in this browser'),
    );

  const badgeOf = (author) => {
    if (author?._id === college.admin?._id) return GROUP_ROLES.admin;
    if (author?._id === college.coAdmin?._id) return GROUP_ROLES.coAdmin;
    return author?.isAdmin ? 'Arcella admin' : null;
  };

  const nameOf = (message) => {
    const badge = badgeOf(message.author);
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        {message.author ? (
          <Link to={`/u/${message.author.username}`} className="truncate font-semibold hover:underline">
            {message.author.name}
          </Link>
        ) : (
          <span className="font-semibold">Former member</span>
        )}
        {badge && <span className="shrink-0 rounded-full bg-brand/10 px-1.5 py-px text-[10px] font-medium text-brand">{badge}</span>}
      </span>
    );
  };

  const actionsFor = (message, mine) => [
    !mine && { label: 'Report', icon: Flag, onClick: () => setReporting({ type: 'chat', id: message._id, label: 'message' }) },
    (mine || college.moderator) && { label: 'Delete', icon: Trash, onClick: () => remove(message), danger: true },
  ];

  const gallery = chat.items.filter((message) => message.media);

  const content = (
    <>
      {chat.loading && <Skeleton className="m-4 h-12 w-2/3" />}
      {chat.error && <p className="m-auto px-6 text-center text-sm text-muted">{chat.error}</p>}
      {!chat.loading && !chat.error && !chat.items.length && (
        <div className="grid flex-1 place-items-center">
          <EmptyState icon={MessagesSquare} title="Say hello" text={`Start the conversation with everyone at ${college.short || college.name}.`} />
        </div>
      )}
      {chat.items.length > 0 && (
        <MessageList
          items={chat.items}
          me={user._id}
          typing={typing}
          hasMore={chat.hasMore}
          onLoadOlder={loadOlder}
          senderOf={(message) => message.author}
          nameOf={nameOf}
          onOpenMedia={(message) => setViewer(gallery.indexOf(message))}
          onRetry={transmit}
          onReact={react}
          onMenu={setMenu}
          onShowReactions={(message) => setReactionsOf(message)}
        />
      )}
      {!chat.loading && !chat.error && <ChatComposer onSend={send} onTyping={(active) => socket.volatile.emit('group:typing', { college: college._id, typing: active })} />}
      <Lightbox items={gallery.map(({ media }) => ({ url: media.url, kind: media.kind }))} index={viewer} onChange={setViewer} />
      <ReactionMenu target={menu} me={user._id} onReact={react} onCopy={copy} actionsFor={actionsFor} onClose={() => setMenu(null)} />
      <ReactionsSheet message={chat.items.find((item) => item._id === reactionsOf?._id)} me={user} people={{ ...people, [user._id]: user }} onRemove={react} onClose={() => setReactionsOf(null)} />
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </>
  );

  if (desktop) return <div className="card flex h-[min(70dvh,680px)] flex-col overflow-hidden">{content}</div>;
  return createPortal(
    <div className="fixed inset-x-0 top-[var(--app-top,0px)] z-40 flex h-[var(--app-height,100dvh)] flex-col bg-card">
      <GroupHeader college={college} onClose={onClose} />
      {content}
    </div>,
    document.body,
  );
}
