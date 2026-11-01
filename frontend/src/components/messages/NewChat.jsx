import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import SearchInput from '../ui/SearchInput';
import Sheet from '../ui/Sheet';
import { Skeleton } from '../ui/Skeleton';
import UserChip from '../ui/UserChip';

export default function NewChat({ open, onClose }) {
  const navigate = useNavigate();
  const { data, loading } = useApi(open ? '/connections' : null);
  const [filter, setFilter] = useState('');
  const people = (data?.items ?? []).filter((person) => person.name.toLowerCase().includes(filter.toLowerCase()));

  const start = (id) => {
    onClose();
    navigate(`/messages/${id}`);
  };

  return (
    <Sheet open={open} onClose={onClose} title="New message">
      <SearchInput value={filter} onChange={setFilter} placeholder="Search your connections" />
      <div className="mt-3 min-h-40">
        {loading && <Skeleton className="h-14 w-full" />}
        {people.map((person) => (
          <button key={person._id} type="button" onClick={() => start(person._id)} className="flex w-full rounded-xl px-2 py-2.5 text-left transition hover:bg-ink/5">
            <UserChip user={person} link={false} />
          </button>
        ))}
        {data && !people.length && <p className="py-8 text-center text-sm text-muted">No connections found. Verified batchmates can also message you from your college group.</p>}
      </div>
    </Sheet>
  );
}
