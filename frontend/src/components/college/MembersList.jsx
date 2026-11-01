import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import Reveal from '../ui/Reveal';
import { ListSkeleton } from '../ui/Skeleton';
import UserChip from '../ui/UserChip';

export default function MembersList({ collegeId }) {
  const { user } = useAuth();
  const { data, loading } = useApi(`/colleges/${collegeId}/members`);
  if (loading) return <ListSkeleton count={3} lines={0} />;

  return (
    <div className="space-y-6">
      {data?.groups.map((group, groupIndex) => (
        <Reveal key={group.title} index={groupIndex}>
          <section>
            <h3 className="mb-2 flex items-center gap-2 font-display font-semibold">
              {group.title}
              <span className="rounded-full bg-ink/5 px-2 text-xs font-medium text-muted">{group.members.length}</span>
            </h3>
            <div className="card divide-y divide-line">
              {group.members.map((member) => {
                const me = member._id === user._id;
                const batchmate = !me && member.batch === user.batch;
                return (
                  <div key={member._id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <UserChip user={member} />
                    </div>
                    {me && <span className="chip">You</span>}
                    {batchmate && (
                      <Link to={`/messages/${member._id}`} aria-label={`Message ${member.name}`} className="grid size-9 shrink-0 place-items-center rounded-full text-brand transition hover:bg-brand/10">
                        <MessageCircle size={18} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </Reveal>
      ))}
    </div>
  );
}
