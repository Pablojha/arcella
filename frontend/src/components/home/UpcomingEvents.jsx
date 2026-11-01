import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import DateTile from '../events/DateTile';

export default function UpcomingEvents() {
  const { data } = useApi('/events', { limit: 3 });
  if (!data?.items.length) return null;
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display font-semibold">Upcoming events</h2>
        <Link to="/events" className="text-xs font-medium text-brand hover:underline">
          See all
        </Link>
      </div>
      <div className="space-y-3">
        {data.items.map((event) => (
          <Link key={event._id} to={`/events/${event._id}`} className="flex items-center gap-3 rounded-xl transition hover:opacity-80">
            <DateTile date={event.start} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{event.title}</span>
              <span className="block text-xs text-muted">{event.attendeesCount} going</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
