import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import PersonCard from '../network/PersonCard';
import { Skeleton } from '../ui/Skeleton';

export default function Suggestions() {
  const { data, loading } = useApi('/users/suggestions');
  const people = data?.items.slice(0, 4) ?? [];
  if (!loading && !people.length) return null;
  return (
    <section className="card p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display font-semibold">People you may know</h2>
        <Link to="/network" className="text-xs font-medium text-brand hover:underline">
          See all
        </Link>
      </div>
      {loading ? <Skeleton className="mt-3 h-40 w-full" /> : people.map((person) => <PersonCard key={person._id} person={person} compact />)}
    </section>
  );
}
