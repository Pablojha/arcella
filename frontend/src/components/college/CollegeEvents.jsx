import { CalendarDays, Plus } from 'lucide-react';
import { usePaged } from '../../hooks/usePaged';
import EventCard from '../events/EventCard';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Reveal from '../ui/Reveal';
import { ListSkeleton } from '../ui/Skeleton';

export default function CollegeEvents({ collegeId }) {
  const { items, loading } = usePaged('/events', { college: collegeId });
  const create = (
    <Button to="/events/new?college=1" icon={Plus} size="sm">
      College-only event
    </Button>
  );

  if (loading) return <ListSkeleton count={2} lines={1} />;
  if (!items.length) return <EmptyState icon={CalendarDays} title="No college events yet" text="Juries, site visits and workshops just for your college show up here." action={create} />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">{create}</div>
      {items.map((event, index) => (
        <Reveal key={event._id} index={index}>
          <EventCard event={event} />
        </Reveal>
      ))}
    </div>
  );
}
