import { CalendarClock } from 'lucide-react';
import Button from '../ui/Button';
import UserChip from '../ui/UserChip';

export default function MentorCard({ mentor, onRequest }) {
  return (
    <div className="card flex h-full flex-col gap-3 p-4">
      <UserChip user={mentor} sub={mentor.headline || mentor.college?.short} size={48} />
      {mentor.mentor.about && <p className="line-clamp-2 text-sm text-ink/80">{mentor.mentor.about}</p>}
      <div className="flex flex-wrap gap-1.5">
        {mentor.mentor.topics.map((topic) => (
          <span key={topic} className="chip">
            {topic}
          </span>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <CalendarClock size={13} className="shrink-0" />
        <span className="truncate">{mentor.mentor.slots.join(' · ')}</span>
      </p>
      <Button size="sm" className="mt-auto self-start" onClick={() => onRequest(mentor)}>
        Request a session
      </Button>
    </div>
  );
}
