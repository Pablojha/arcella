import { Lock, MapPin, Users, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EVENT_TYPES } from '../../lib/constants';
import { formatTime, labelOf } from '../../lib/format';
import DateTile from './DateTile';

export default function EventCard({ event }) {
  return (
    <Link to={`/events/${event._id}`} className="card flex gap-4 p-4 transition hover:border-ink/25">
      <DateTile date={event.start} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-brand">{labelOf(EVENT_TYPES, event.type)}</span>
          {event.college && (
            <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-accent">
              <Lock size={10} /> {event.college.short ?? 'College only'}
            </span>
          )}
        </div>
        <h3 className="mt-1 font-semibold leading-snug">{event.title}</h3>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>{formatTime(event.start)}</span>
          <span className="flex min-w-0 items-center gap-1">
            {event.online ? <Video size={12} /> : <MapPin size={12} />}
            <span className="truncate">{event.online ? 'Online' : event.venue}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} /> {event.attendeesCount} going
          </span>
        </div>
      </div>
    </Link>
  );
}
