import { useApi } from '../../hooks/useApi';
import { useBlock } from '../../hooks/useBlock';
import Button from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import UserChip from '../ui/UserChip';

export default function BlockedMembers() {
  const { data, setData, loading } = useApi('/users/me/blocked');
  const toggleBlock = useBlock();

  const unblock = async (person) => {
    if ((await toggleBlock(person, true)) === false) setData((current) => ({ items: current.items.filter((item) => item._id !== person._id) }));
  };

  if (loading) return <Skeleton className="h-14 w-full" />;
  if (!data?.items.length) return <p className="text-sm text-muted">You haven't blocked anyone.</p>;
  return (
    <div className="divide-y divide-line">
      {data.items.map((person) => (
        <div key={person._id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <UserChip user={person} link={false} />
          </div>
          <Button size="sm" variant="secondary" onClick={() => unblock(person)}>
            Unblock
          </Button>
        </div>
      ))}
    </div>
  );
}
