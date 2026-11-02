import { useEffect, useState } from 'react';
import { ArrowLeft, EyeOff, MessageCircle, Pin, SquarePen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { useChatSettings } from '../../hooks/useChatSettings';
import { usePoll } from '../../hooks/usePoll';
import { usePressGestures } from '../../hooks/usePressGestures';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { timeAgo } from '../../lib/format';
import Avatar from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import MoreMenu from '../ui/MoreMenu';
import { ListSkeleton } from '../ui/Skeleton';
import ChatActions from './ChatActions';
import NewChat from './NewChat';

/** What a message was: its text, or the kind of thing sent. */
function describe(message) {
  if (message.text) return message.storyImage ? `Story reply: ${message.text}` : message.text;
  if (message.media) return message.media.kind === 'video' ? '🎥 Video' : '📷 Photo';
  if (message.gif) return 'GIF';
  return message.voice ? '🎤 Voice message' : '';
}

/** The chat-list line: the newest reaction ("You reacted ❤️ to a message") or the last message. */
function preview({ last, reaction, user: other }, me) {
  if (reaction) {
    if (reaction.by === me) return `You reacted ${reaction.emoji} to a message`;
    return `${other.name.split(' ')[0]} reacted ${reaction.emoji} to ${reaction.author === me ? 'your message' : 'a message'}`;
  }
  return `${last.from === me ? 'You: ' : ''}${describe(last)}`;
}

function ChatRow({ item, me, active, hidden, onActions, onUnhide }) {
  const gestures = usePressGestures({ onLongPress: () => onActions(item) });
  return (
    <div className={`flex items-center rounded-2xl transition ${active ? 'bg-brand/10' : 'hover:bg-ink/5'}`}>
      <Link {...gestures} to={`/messages/${item.user._id}`} className="flex min-w-0 flex-1 select-none items-center gap-3 px-2 py-3 [-webkit-touch-callout:none]">
        <Avatar user={item.user} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 font-medium">
              <span className="truncate">{item.user.name}</span>
              {item.pinned && <Pin size={13} aria-label="Pinned" className="shrink-0 rotate-45 fill-current text-muted" />}
            </span>
            <span className="shrink-0 text-xs text-muted">{timeAgo(item.activity ?? item.last.createdAt)}</span>
          </div>
          <p className={`truncate text-sm ${item.unread ? 'font-semibold text-ink' : 'text-muted'}`}>{preview(item, me)}</p>
        </div>
        {item.unread > 0 && <span className="min-w-5 shrink-0 rounded-full bg-accent px-1.5 text-center text-[11px] font-semibold leading-5 text-on-accent">{item.unread}</span>}
      </Link>
      {hidden && (
        <button type="button" onClick={() => onUnhide(item)} className="mr-2 shrink-0 rounded-full border border-line px-3 py-1.5 text-sm font-medium transition hover:bg-ink/5">
          Unhide
        </button>
      )}
    </div>
  );
}

/** Your chats: pinned ones on top; long-press one to pin, unpin or hide it. Hidden chats live in their own list. */
export default function ConversationList({ activeId }) {
  const { user } = useAuth();
  const [showHidden, setShowHidden] = useState(false);
  const { data, reload } = useApi('/messages', { hidden: showHidden });
  const [composing, setComposing] = useState(false);
  const [actionsFor, setActionsFor] = useState(null);
  const settings = useChatSettings();
  usePoll(reload, 30_000);
  useSocketEvent('message:new', reload);
  useSocketEvent('message:update', reload);

  useEffect(() => {
    window.addEventListener('chats:changed', reload);
    return () => window.removeEventListener('chats:changed', reload);
  }, [reload]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 pb-3 md:px-4 md:pt-4">
        {showHidden ? (
          <button type="button" onClick={() => setShowHidden(false)} className="-ml-2 flex items-center gap-2 rounded-full py-1 pl-1 pr-3 font-display text-xl font-bold tracking-tight hover:bg-ink/5">
            <ArrowLeft size={22} /> Hidden chats
          </button>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold tracking-tight">Messages</h1>
            <div className="flex items-center">
              <IconButton icon={SquarePen} label="New message" onClick={() => setComposing(true)} />
              <MoreMenu label="Chat list options" items={[{ label: 'Hidden chats', icon: EyeOff, onClick: () => setShowHidden(true) }]} />
            </div>
          </>
        )}
      </div>
      <div className="-mx-2 flex-1 overflow-y-auto md:mx-0 md:px-2">
        {!data && <ListSkeleton count={4} lines={0} />}
        {data?.items.map((item) => (
          <ChatRow key={item.user._id} item={item} me={user._id} active={item.user._id === activeId} hidden={showHidden} onActions={(chat) => setActionsFor({ ...chat, hidden: showHidden })} onUnhide={(chat) => settings.unhide(chat.user._id)} />
        ))}
        {data && !data.items.length && (
          <div className="flex flex-col items-center px-6 py-14 text-center text-muted">
            {showHidden ? <EyeOff size={28} className="mb-3" /> : <MessageCircle size={28} className="mb-3" />}
            <p className="font-medium text-ink">{showHidden ? 'No hidden chats' : 'No conversations yet'}</p>
            <p className="mt-1 text-sm">{showHidden ? 'Long-press a chat and choose Hide chat to move it here.' : 'Message a connection or a verified batchmate.'}</p>
          </div>
        )}
      </div>
      <ChatActions
        chat={actionsFor}
        onPin={(chat) => settings.pin(chat.user._id, !chat.pinned)}
        onHide={(chat) => settings.hide(chat.user._id, chat.pinned)}
        onUnhide={(chat) => settings.unhide(chat.user._id)}
        onClose={() => setActionsFor(null)}
      />
      <NewChat open={composing} onClose={() => setComposing(false)} />
    </div>
  );
}
