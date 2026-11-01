import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';

/** Avatar, name (with verified badge) and a secondary line; links to the profile. */
export default function UserChip({ user, sub, size = 40, link = true }) {
  const secondary = sub ?? user?.headline;
  const body = (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar user={user} size={size} />
      <span className="min-w-0">
        <span className="flex items-center gap-1 font-medium leading-tight">
          <span className="truncate">{user?.name ?? 'Arcella member'}</span>
          {user?.verified && <VerifiedBadge />}
        </span>
        {secondary && <span className="mt-0.5 block truncate text-[13px] text-muted">{secondary}</span>}
      </span>
    </span>
  );
  return link && user?.username ? (
    <Link to={`/u/${user.username}`} className="min-w-0 transition hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}
