import { USER_TYPES } from '../../lib/constants';
import { labelOf } from '../../lib/format';
import UserChip from '../ui/UserChip';
import ConnectButton from './ConnectButton';

export default function PersonCard({ person, compact = false }) {
  const sub = person.headline || [labelOf(USER_TYPES, person.type), person.college?.short].filter(Boolean).join(' · ');
  return (
    <div className={`flex items-center gap-3 ${compact ? 'py-2' : 'card p-3.5'}`}>
      <div className="min-w-0 flex-1">
        <UserChip user={person} sub={sub} size={compact ? 40 : 48} />
      </div>
      <ConnectButton person={person} status={person.status} />
    </div>
  );
}
