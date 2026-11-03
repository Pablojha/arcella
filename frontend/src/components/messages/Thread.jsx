import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBadges } from '../../context/BadgeContext';
import { useToast } from '../../context/ToastContext';
import { useBlock } from '../../hooks/useBlock';
import { useChatSettings } from '../../hooks/useChatSettings';
import { useMedia } from '../../hooks/useMedia';
import { usePoll } from '../../hooks/usePoll';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { useViewportHeight } from '../../hooks/useViewportHeight';
import api from '../../lib/api';
import { mergeMessages as merge, pendingMessage, sendMessage, settleMessage as settle } from '../../lib/chat';
import { socket } from '../../lib/realtime';
import ReportSheet from '../ReportSheet';
import Lightbox from '../ui/Lightbox';
import ChatComposer from './ChatComposer';
import ChatHeader from './ChatHeader';
import ChatSearch from './ChatSearch';
import MessageList from './MessageList';
import ReactionMenu from './ReactionMenu';
import ReactionsSheet from './ReactionsSheet';

const TYPING_TIMEOUT_MS = 6000;

/**
 * One conversation. On phones it fills the screen above the keyboard (no bottom tabs); on desktop it sits beside the
 * chat list. Messages, read receipts and typing arrive over the socket, with polling as a fallback when it is down.
 */
export default function Thread({ userId }) {
  const { user: me } = useAuth();
  const { refresh: refreshBadges } = useBadges();
  const toast = useToast();
  const toggleBlock = useBlock();
  const navigate = useNavigate();
  const desktop = useMedia('(min-width: 768px)');
  const settings = useChatSettings((id, chat) => setThread((current) => ({ ...current, chat })));
  const [thread, setThread] = useState({ user: null, items: [], hasMore: false, canMessage: false, blockedByMe: false, seenUntil: null, presence: null, error: '' });
  const [typing, setTyping] = useState(false);
  const [live, setLive] = useState(socket.connected);
  const [viewer, setViewer] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [searching, setSearching] = useState(false);
  const [menu, setMenu] = useState(null);
  const [reactionsOf, setReactionsOf] = useState(null);
  const latestSaved = useRef(null);
  const typingTimer = useRef(null);
  useViewportHeight();

  const firstSaved = thread.items.find((message) => !message.status)?._id;
  useEffect(() => {
    latestSaved.current = thread.items.findLast((message) => !message.status)?._id;
  });

  const load = useCallback(
    () =>
      api
        .get(`/messages/${userId}`)
        .then((data) => {
          setThread({ ...data, error: '' });
          refreshBadges();
        })
        .catch((error) => setThread((current) => ({ ...current, error: error.message }))),
    [userId, refreshBadges],
  );

  useEffect(() => {
    load();
  }, [load]);

  const fetchNew = useCallback(async () => {
    const after = latestSaved.current;
    const data = await api.get(`/messages/${userId}`, { params: after ? { after } : {} });
    setThread((current) => ({ ...current, seenUntil: data.seenUntil, presence: data.presence, items: merge(current.items, data.items) }));
    if (data.items.length) refreshBadges();
  }, [userId, refreshBadges]);

  usePoll(() => fetchNew().catch(() => {}), live ? 15_000 : 4000, Boolean(thread.user));

  const loadOlder = useCallback(async () => {
    const data = await api.get(`/messages/${userId}`, { params: { before: firstSaved } });
    setThread((current) => ({ ...current, hasMore: data.hasMore, items: [...data.items, ...current.items] }));
  }, [userId, firstSaved]);

  const transmit = useCallback(
    async (message) => {
      const update = (changes) => setThread((current) => ({ ...current, items: current.items.map((item) => (item._id === message._id ? { ...item, ...changes } : item)) }));
      update({ status: 'sending', progress: 0 });
      try {
        const saved = await sendMessage(`/messages/${userId}`, message, (progress) => update({ progress }));
        setThread((current) => ({ ...current, items: settle(current.items, message._id, saved) }));
        const local = message.media?.url ?? message.voice?.url;
        if (local?.startsWith('blob:')) URL.revokeObjectURL(local);
      } catch (error) {
        update({ status: 'failed' });
        toast.error(error.message);
      }
    },
    [userId, toast],
  );

  const send = (item) => {
    const message = pendingMessage(item, { from: me._id, to: userId });
    // A message request is one message: the chat waits for a reply after it.
    setThread((current) => ({ ...current, items: [...current.items, message], canMessage: current.canMessage === 'request' ? 'pending' : current.canMessage }));
    transmit(message);
  };

  const setReactions = (id, reactions) => setThread((current) => ({ ...current, items: current.items.map((item) => (item._id === id ? { ...item, reactions } : item)) }));

  /** One reaction per person: the same emoji again removes it. Shown at once, undone if the server refuses. */
  const react = async (message, emoji) => {
    const previous = message.reactions ?? [];
    const removing = previous.some((reaction) => reaction.user === me._id && reaction.emoji === emoji);
    setReactions(message._id, [...previous.filter((reaction) => reaction.user !== me._id), ...(removing ? [] : [{ user: me._id, emoji }])]);
    try {
      setReactions(message._id, (await api.put(`/messages/reactions/${message._id}`, { emoji })).reactions);
    } catch (error) {
      setReactions(message._id, previous);
      toast.error(error.message);
    }
  };

  const copy = (text) =>
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied'),
      () => toast.error('Copying is blocked in this browser'),
    );

  useSocketEvent('connect', () => setLive(true));
  useSocketEvent('disconnect', () => setLive(false));
  useSocketEvent('message:new', (message) => {
    const fromThem = message.from === userId;
    if (!fromThem && message.to !== userId) return;
    if (fromThem) {
      setTyping(false);
      fetchNew().catch(() => {});
    }
    // My own messages normally arrive through the upload's response; this catches ones sent from another device.
    setThread((current) => (!fromThem && current.items.some((item) => item.status === 'sending') ? current : { ...current, items: merge(current.items, [message]) }));
  });
  useSocketEvent('message:seen', ({ by, until }) => by === userId && setThread((current) => ({ ...current, seenUntil: until })));
  useSocketEvent('message:update', ({ _id, reactions }) => setReactions(_id, reactions));
  useSocketEvent('message:deleted', ({ _id }) => setThread((current) => ({ ...current, items: current.items.filter((item) => item._id !== _id) })));
  useSocketEvent('typing', ({ from, typing: active }) => {
    if (from !== userId) return;
    clearTimeout(typingTimer.current);
    setTyping(active);
    if (active) typingTimer.current = setTimeout(() => setTyping(false), TYPING_TIMEOUT_MS);
  });
  useEffect(() => () => clearTimeout(typingTimer.current), []);

  /** Unsends one of your messages for both people (it is removed live on their screen too). */
  const unsend = async (message) => {
    if (!window.confirm('Unsend this message for everyone?')) return;
    try {
      await api.delete(`/messages/item/${message._id}`);
      setThread((current) => ({ ...current, items: current.items.filter((item) => item._id !== message._id) }));
    } catch (error) {
      toast.error(error.message);
    }
  };
  const actionsFor = (message, mine) => [mine && !message.status && { label: 'Unsend', icon: Trash, onClick: () => unsend(message), danger: true }];

  const block = async () => {
    if ((await toggleBlock(thread.user, thread.blockedByMe)) !== null) load();
  };

  const gallery = thread.items.filter((message) => message.media);
  const other = thread.user;
  const firstName = other?.name.split(' ')[0];

  const screen = (
    <div className="fixed inset-x-0 top-[var(--app-top,0px)] z-40 flex h-[var(--app-height,100dvh)] flex-col bg-card md:static md:z-auto md:h-full">
      <ChatHeader
        user={other}
        presence={thread.presence}
        chat={thread.chat}
        blockedByMe={thread.blockedByMe}
        onPin={() => settings.pin(userId, !thread.chat?.pinned)}
        onHide={async () => {
          if (await settings.hide(userId, thread.chat?.pinned)) navigate('/messages');
        }}
        onUnhide={() => settings.unhide(userId)}
        onReport={() => setReporting({ type: 'user', id: other._id, label: other.name })}
        onSearch={() => setSearching(true)}
        onBlock={block}
      />
      {thread.error ? (
        <p className="m-auto px-6 text-center text-sm text-muted">{thread.error}</p>
      ) : (
        <MessageList
          items={thread.items}
          me={me._id}
          other={other}
          seenUntil={thread.seenUntil}
          typing={typing}
          hasMore={thread.hasMore}
          onLoadOlder={loadOlder}
          onOpenMedia={(message) => setViewer(gallery.indexOf(message))}
          onRetry={transmit}
          onReact={react}
          onMenu={setMenu}
          onShowReactions={(message) => setReactionsOf(message)}
        />
      )}
      {other && thread.canMessage === 'request' && (
        <p className="shrink-0 border-t border-line px-4 pt-2 text-center text-xs text-muted">You aren't connected, so your first message goes to {firstName}'s message requests.</p>
      )}
      {other &&
        (thread.canMessage === 'pending' ? (
          <p className="shrink-0 border-t border-line px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted">Your message request is waiting for {firstName} to reply.</p>
        ) : thread.canMessage ? (
          <ChatComposer onSend={send} onTyping={(active) => socket.volatile.emit('typing', { to: userId, typing: active })} />
        ) : (
          <p className="flex shrink-0 items-center justify-center gap-2 border-t border-line px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted">
            <Lock size={15} className="shrink-0" />
            {thread.blockedByMe ? `You blocked ${firstName}. Unblock them to send messages.` : `Connect with ${firstName} to start a conversation.`}
          </p>
        ))}
      <Lightbox items={gallery.map(({ media }) => ({ url: media.url, kind: media.kind }))} index={viewer} onChange={setViewer} />
      <ReactionMenu target={menu} me={me._id} onReact={react} onCopy={copy} actionsFor={actionsFor} onClose={() => setMenu(null)} />
      <ChatSearch userId={userId} open={searching} onClose={() => setSearching(false)} me={me._id} other={other} />
      <ReactionsSheet message={thread.items.find((item) => item._id === reactionsOf?._id)} me={me} people={{ [me._id]: me, ...(other && { [other._id]: other }) }} onRemove={react} onClose={() => setReactionsOf(null)} />
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </div>
  );

  return desktop ? screen : createPortal(screen, document.body);
}
