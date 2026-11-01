import { MessageCircle, Shield, ShieldCheck, ShieldMinus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import api from '../../lib/api';
import { GROUP_ROLES } from '../../lib/constants';
import MoreMenu from '../ui/MoreMenu';
import Reveal from '../ui/Reveal';
import { ListSkeleton } from '../ui/Skeleton';
import UserChip from '../ui/UserChip';

/** Verified members by batch. Arcella admins choose the group's admin and co-admin here; the college admin chooses the co-admin. */
export default function MembersList({ college, onRolesChange }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading } = useApi(`/colleges/${college._id}/members`);
  const collegeAdmin = college.admin?._id === user._id;
  const roleOf = (member) => ['admin', 'coAdmin'].find((role) => college[role]?._id === member._id);

  const assign = async (role, member) => {
    try {
      onRolesChange(await api.patch(`/colleges/${college._id}/roles`, { role, user: member?._id ?? null }));
      toast.success(member ? `${member.name} is now the ${GROUP_ROLES[role].toLowerCase()}` : `${GROUP_ROLES[role]} removed`);
    } catch (error) {
      toast.error(error.message);
    }
  };

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
                const role = roleOf(member);
                return (
                  <div key={member._id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <UserChip user={member} />
                    </div>
                    {role && <span className="chip bg-brand/10 text-brand">{GROUP_ROLES[role]}</span>}
                    {me && <span className="chip">You</span>}
                    {batchmate && (
                      <Link to={`/messages/${member._id}`} aria-label={`Message ${member.name}`} className="grid size-9 shrink-0 place-items-center rounded-full text-brand transition hover:bg-brand/10">
                        <MessageCircle size={18} />
                      </Link>
                    )}
                    <MoreMenu
                      label={`Manage ${member.name}`}
                      items={[
                        user.isAdmin && role !== 'admin' && { label: 'Make admin', icon: ShieldCheck, onClick: () => assign('admin', member) },
                        (user.isAdmin || collegeAdmin) && !role && { label: 'Make co-admin', icon: Shield, onClick: () => assign('coAdmin', member) },
                        role && (user.isAdmin || (collegeAdmin && role === 'coAdmin')) && { label: `Remove as ${GROUP_ROLES[role].toLowerCase()}`, icon: ShieldMinus, onClick: () => assign(role, null), danger: true },
                      ]}
                    />
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
