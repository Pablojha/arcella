import { Bookmark, CalendarDays, FolderOpen, HandHeart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mediaUrl } from '../../lib/format';
import Avatar from '../ui/Avatar';
import VerifiedBadge from '../ui/VerifiedBadge';

const LINKS = [
  { label: 'My portfolio', icon: FolderOpen, to: (user) => `/u/${user.username}?tab=portfolio` },
  { label: 'Saved posts', icon: Bookmark, to: () => '/saved' },
  { label: 'Saved resources', icon: Bookmark, to: () => '/resources?saved=1' },
  { label: 'Mentorship', icon: HandHeart, to: () => '/mentors' },
  { label: 'Events', icon: CalendarDays, to: () => '/events' },
];

export default function ProfileCard() {
  const { user } = useAuth();
  return (
    <div className="card overflow-hidden">
      <div className="grid-paper h-16 bg-brand/15 bg-cover bg-center" style={user.cover ? { backgroundImage: `url(${mediaUrl(user.cover, 600)})` } : undefined} />
      <div className="-mt-8 px-4 pb-4">
        <Link to={`/u/${user.username}`} className="inline-block rounded-full ring-4 ring-card">
          <Avatar user={user} size={64} />
        </Link>
        <Link to={`/u/${user.username}`} className="mt-2 flex items-center gap-1 font-display text-lg font-semibold hover:underline">
          <span className="truncate">{user.name}</span>
          {user.verified && <VerifiedBadge />}
        </Link>
        <p className="line-clamp-2 text-sm text-muted">{user.headline || 'Add a headline so people know what you do'}</p>
        <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          <Link to="/network?tab=connections" className="flex justify-between hover:text-brand">
            <span className="text-muted">Connections</span>
            <span className="font-semibold">{user.connectionsCount}</span>
          </Link>
          <Link to="/college" className="flex justify-between gap-2 hover:text-brand">
            <span className="text-muted">College</span>
            <span className="truncate font-semibold">{user.college?.short ?? user.college?.name ?? 'Verify now'}</span>
          </Link>
        </div>
      </div>
      <nav className="border-t border-line p-2">
        {LINKS.map(({ label, icon: Icon, to }) => (
          <Link key={label} to={to(user)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink/80 transition hover:bg-ink/5 hover:text-ink">
            <Icon size={16} className="text-muted" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
