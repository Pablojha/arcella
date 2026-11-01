import { useState } from 'react';
import { Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import EmptyState from '../ui/EmptyState';
import Reveal from '../ui/Reveal';
import SearchInput from '../ui/SearchInput';
import { ListSkeleton } from '../ui/Skeleton';
import PersonCard from './PersonCard';

export default function ConnectionsList() {
  const { data, loading } = useApi('/connections');
  const [filter, setFilter] = useState('');
  if (loading) return <ListSkeleton count={4} lines={0} />;
  if (!data?.items.length) return <EmptyState icon={Users} title="No connections yet" text="Connect with batchmates, seniors and people whose work you admire." />;
  const people = data.items.filter((person) => person.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="space-y-3">
      <SearchInput value={filter} onChange={setFilter} placeholder={`Search ${data.items.length} connections`} />
      {people.map((person, index) => (
        <Reveal key={person._id} index={index}>
          <PersonCard person={person} />
        </Reveal>
      ))}
    </div>
  );
}
