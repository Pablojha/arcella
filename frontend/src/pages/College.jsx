import { motion } from 'framer-motion';
import { GraduationCap, Lock, MapPin, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import CollegeEvents from '../components/college/CollegeEvents';
import GroupChat from '../components/college/GroupChat';
import GroupDiscussion from '../components/college/GroupDiscussion';
import MembersList from '../components/college/MembersList';
import VerificationQueue from '../components/college/VerificationQueue';
import VerifyStatus from '../components/college/VerifyStatus';
import EmptyState from '../components/ui/EmptyState';
import FirmLogo from '../components/ui/FirmLogo';
import { Skeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import UserChip from '../components/ui/UserChip';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useTitle } from '../hooks/useTitle';
import { COLLEGE_ROLES, GROUP_ROLES } from '../lib/constants';
import { labelOf, plural } from '../lib/format';

function CollegeGroup({ collegeId }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: college, loading, error, setData } = useApi(`/colleges/${collegeId}`);
  useTitle(college?.short ?? college?.name ?? 'College');

  if (!college) return loading ? <Skeleton className="h-48 w-full rounded-3xl" /> : <EmptyState icon={GraduationCap} title="Group not available" text={error?.message} />;

  const tabs = [
    { value: 'chat', label: 'Chat' },
    { value: 'posts', label: 'Posts' },
    { value: 'members', label: 'Members' },
    { value: 'events', label: 'Events' },
    { value: 'about', label: 'About' },
    ...(college.moderator ? [{ value: 'review', label: 'Review' }] : []),
  ];
  const tab = tabs.some((item) => item.value === params.get('tab')) ? params.get('tab') : 'chat';
  const ownCollege = (user.college?._id ?? user.college) === college._id;
  const groupRole = ['admin', 'coAdmin'].find((role) => college[role]?._id === user._id);
  const you = ownCollege ? `${labelOf(COLLEGE_ROLES, user.collegeRole)}${user.batch ? ` · Batch ${user.batch}` : ''}` : 'Arcella admin';

  const switchTab = (value) =>
    setParams(
      (current) => {
        current.set('tab', value);
        return current;
      },
      { replace: true },
    );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-5 md:p-6">
        <div className="grid-paper absolute inset-0 bg-brand/[0.07]" />
        <div className="relative flex items-start gap-4">
          <FirmLogo name={college.short || college.name} size={60} />
          <div className="min-w-0">
            <span className="chip bg-brand/10 text-brand">
              <Lock size={11} /> Private group
            </span>
            <h1 className="mt-1.5 font-display text-xl font-bold leading-tight tracking-tight md:text-2xl">{college.name}</h1>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {college.city}
              </span>
              <span className="flex items-center gap-1">
                <Users size={14} /> {plural(college.membersCount, 'member')}
              </span>
              <span>
                You: {you}
                {groupRole && ` · ${GROUP_ROLES[groupRole]}`}
              </span>
            </p>
          </div>
        </div>
      </motion.section>

      <Tabs tabs={tabs} value={tab} onChange={switchTab} />
      {tab === 'chat' && <GroupChat college={college} />}
      {tab === 'posts' && <GroupDiscussion college={college} />}
      {tab === 'members' && <MembersList college={college} onRolesChange={(roles) => setData((current) => ({ ...current, ...roles }))} />}
      {tab === 'events' && <CollegeEvents collegeId={college._id} />}
      {tab === 'review' && <VerificationQueue />}
      {tab === 'about' && (
        <div className="card space-y-4 p-5">
          <p className="text-sm text-muted">
            Only verified students, alumni and faculty of {college.name} can see this group.
            {college.domains.length > 0 && ` Members can verify instantly with an address ending in ${college.domains.map((domain) => `@${domain}`).join(' or ')}.`}
          </p>
          <h2 className="font-display font-semibold">Group admins</h2>
          {['admin', 'coAdmin'].map((role) => college[role] && <UserChip key={role} user={college[role]} sub={GROUP_ROLES[role]} />)}
          {!college.admin && !college.coAdmin && <p className="text-sm text-muted">No admins yet. Arcella admins look after this group until one is chosen.</p>}
        </div>
      )}
    </div>
  );
}

/** Your own college group; Arcella admins can open any group with `?id=<collegeId>`. */
export default function College() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const collegeId = (user.isAdmin && params.get('id')) || (user.verified && (user.college?._id ?? user.college));
  return collegeId ? <CollegeGroup key={collegeId} collegeId={collegeId} /> : <VerifyStatus />;
}
