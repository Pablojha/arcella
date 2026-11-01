import { useState } from 'react';
import { MessageCircle, SquarePen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { usePoll } from '../../hooks/usePoll';
import { timeAgo } from '../../lib/format';
import Avatar from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { ListSkeleton } from '../ui/Skeleton';
import NewChat from './NewChat';

export default function ConversationList({ activeId }) {
  const { user } = useAuth();
  const { data, reload } = useApi('/messages');
  const [composing, setComposing] = useState(false);
  usePoll(reload, 8000);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between pb-3 md:px-4 md:pt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Messages</h1>
        <IconButton icon={SquarePen} label="New message" onClick={() => setComposing(true)} />
      </div>
      <div className="-mx-2 flex-1 overflow-y-auto md:mx-0 md:px-2">
        {!data && <ListSkeleton count={4} lines={0} />}
        {data?.items.map(({ user: other, last, unread }) => (
          <Link key={other._id} to={`/messages/${other._id}`} className={`flex items-center gap-3 rounded-2xl px-2 py-3 transition ${other._id === activeId ? 'bg-brand/10' : 'hover:bg-ink/5'}`}>
            <Avatar user={other} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium">{other.name}</span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(last.createdAt)}</span>
              </div>
              <p className={`truncate text-sm ${unread ? 'font-semibold text-ink' : 'text-muted'}`}>
                {last.from === user._id && 'You: '}
                {last.storyImage && 'Story reply: '}
                {last.text}
              </p>
            </div>
            {unread > 0 && <span className="min-w-5 shrink-0 rounded-full bg-accent px-1.5 text-center text-[11px] font-semibold leading-5 text-on-accent">{unread}</span>}
          </Link>
        ))}
        {data && !data.items.length && (
          <div className="flex flex-col items-center px-6 py-14 text-center text-muted">
            <MessageCircle size={28} className="mb-3" />
            <p className="font-medium text-ink">No conversations yet</p>
            <p className="mt-1 text-sm">Message a connection or a verified batchmate.</p>
          </div>
        )}
      </div>
      <NewChat open={composing} onClose={() => setComposing(false)} />
    </div>
  );
}
