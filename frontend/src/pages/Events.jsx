import { useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import EventCard from '../components/events/EventCard';
import Button from '../components/ui/Button';
import Chips from '../components/ui/Chips';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import Reveal from '../components/ui/Reveal';
import { ListSkeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import { usePaged } from '../hooks/usePaged';
import { EVENT_TYPES } from '../lib/constants';

const WHEN = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

export default function Events() {
  const [when, setWhen] = useState('upcoming');
  const [type, setType] = useState('');
  const events = usePaged('/events', { when, type });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Events"
        subtitle="Site visits, webinars, workshops, juries and competitions"
        action={
          <Button to="/events/new" icon={Plus}>
            Host
          </Button>
        }
      />
      <div className="mb-5 space-y-3">
        <Tabs tabs={WHEN} value={when} onChange={setWhen} />
        <Chips options={EVENT_TYPES} value={type} onChange={setType} />
      </div>
      <div className="space-y-3">
        {events.items.map((event, index) => (
          <Reveal key={event._id} index={index}>
            <EventCard event={event} />
          </Reveal>
        ))}
        {events.loading && <ListSkeleton count={3} lines={1} />}
        {!events.loading && !events.items.length && <EmptyState icon={CalendarDays} title={when === 'past' ? 'No past events' : 'Nothing scheduled yet'} text="Host a site visit or workshop for the community." />}
        <LoadMore hasMore={events.hasMore} loading={events.loading} onLoad={events.loadMore} />
      </div>
    </div>
  );
}
