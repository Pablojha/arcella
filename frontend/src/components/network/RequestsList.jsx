import { Inbox } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import EmptyState from '../ui/EmptyState';
import Reveal from '../ui/Reveal';
import { ListSkeleton } from '../ui/Skeleton';
import PersonCard from './PersonCard';

function Group({ title, people }) {
  if (!people.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold">
        {title} <span className="text-muted">· {people.length}</span>
      </h2>
      {people.map((person, index) => (
        <Reveal key={person._id} index={index}>
          <PersonCard person={person} />
        </Reveal>
      ))}
    </section>
  );
}

export default function RequestsList() {
  const { data, loading } = useApi('/connections/requests');
  if (loading) return <ListSkeleton count={3} lines={0} />;
  if (!data?.incoming.length && !data?.outgoing.length) return <EmptyState icon={Inbox} title="No pending requests" text="Invitations you send or receive will appear here." />;
  return (
    <div className="space-y-6">
      <Group title="Received" people={data.incoming} />
      <Group title="Sent" people={data.outgoing} />
    </div>
  );
}
