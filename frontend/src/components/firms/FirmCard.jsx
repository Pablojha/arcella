import { Link } from 'react-router-dom';
import { plural } from '../../lib/format';
import VerifiedBadge from '../ui/VerifiedBadge';
import FirmLogo from '../ui/FirmLogo';

export default function FirmCard({ firm }) {
  return (
    <Link to={`/firms/${firm.slug}`} className="card flex items-center gap-3.5 p-4 transition hover:border-ink/25">
      <FirmLogo logo={firm.logo} name={firm.name} size={52} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 font-semibold">
          <span className="truncate">{firm.name}</span>
          {firm.verified && <VerifiedBadge title="Verified by Arcella" />}
        </p>
        <p className="truncate text-sm text-muted">{[firm.city, firm.size && `${firm.size} people`].filter(Boolean).join(' · ') || 'Architecture practice'}</p>
        <p className="text-xs text-muted">{plural(firm.followersCount, 'follower')}</p>
      </div>
    </Link>
  );
}
