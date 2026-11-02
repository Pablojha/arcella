import { ArrowLeft, Ban, Eye, EyeOff, Flag, Pin, PinOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ago } from '../../lib/format';
import Avatar from '../ui/Avatar';
import MoreMenu from '../ui/MoreMenu';
import { Skeleton } from '../ui/Skeleton';
import VerifiedBadge from '../ui/VerifiedBadge';

const RECENT_MS = 3 * 24 * 60 * 60 * 1000;

/** "Active now" while they have Arcella open, "Active 5m ago" for the last three days, otherwise nothing. */
function activity(presence) {
  if (presence?.online) return 'Active now';
  if (presence?.activeAt && Date.now() - new Date(presence.activeAt) < RECENT_MS) return `Active ${ago(presence.activeAt)}`;
  return '';
}

export default function ChatHeader({ user, presence, chat, blockedByMe, onPin, onHide, onUnhide, onReport, onBlock }) {
  const status = activity(presence);
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-4 md:py-3">
      <Link to="/messages" aria-label="Back to chats" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-ink/5 md:hidden">
        <ArrowLeft size={22} />
      </Link>
      {user ? (
        <Link to={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
          <Avatar user={user} size={38} />
          <span className="min-w-0">
            <span className="flex items-center gap-1 font-semibold leading-tight">
              <span className="truncate">{user.name}</span>
              {user.verified && <VerifiedBadge />}
            </span>
            {status && <span className="block truncate text-xs text-muted">{status}</span>}
          </span>
        </Link>
      ) : (
        <Skeleton className="h-10 flex-1" />
      )}
      {user && (
        <MoreMenu
          label="Chat options"
          items={[
            !chat?.hidden && { label: chat?.pinned ? 'Unpin' : 'Pin', icon: chat?.pinned ? PinOff : Pin, onClick: onPin },
            chat?.hidden ? { label: 'Unhide chat', icon: Eye, onClick: onUnhide } : { label: 'Hide chat', icon: EyeOff, onClick: onHide },
            { label: `Report ${user.name.split(' ')[0]}`, icon: Flag, onClick: onReport },
            { label: blockedByMe ? 'Unblock' : `Block ${user.name.split(' ')[0]}`, icon: Ban, onClick: onBlock, danger: !blockedByMe },
          ]}
        />
      )}
    </header>
  );
}
