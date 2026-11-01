import { motion } from 'framer-motion';
import { Lock, MapPin, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import CollegeEvents from '../components/college/CollegeEvents';
import GroupDiscussion from '../components/college/GroupDiscussion';
import MembersList from '../components/college/MembersList';
import VerificationQueue from '../components/college/VerificationQueue';
import VerifyStatus from '../components/college/VerifyStatus';
import FirmLogo from '../components/ui/FirmLogo';
import { Skeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import UserChip from '../components/ui/UserChip';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useTitle } from '../hooks/useTitle';
import { COLLEGE_ROLES } from '../lib/constants';
import { labelOf, plural } from '../lib/format';

function CollegeGroup({ collegeId }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: college, loading } = useApi(`/colleges/${collegeId}`);
  const tab = params.get('tab') || 'discussion';
  useTitle(college?.short ?? college?.name ?? 'College');

  if (loading) return <Skeleton className="h-48 w-full rounded-3xl" />;

  const tabs = [
    { value: 'discussion', label: 'Discussion' },
    { value: 'members', label: 'Members' },
    { value: 'events', label: 'Events' },
    { value: 'about', label: 'About' },
    ...(college.moderator ? [{ value: 'review', label: 'Review' }] : []),
  ];

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
                You: {labelOf(COLLEGE_ROLES, user.collegeRole)}
                {user.batch && ` · Batch ${user.batch}`}
              </span>
            </p>
          </div>
        </div>
      </motion.section>

      <Tabs tabs={tabs} value={tab} onChange={(value) => setParams({ tab: value }, { replace: true })} />
      {tab === 'discussion' && <GroupDiscussion college={college} />}
      {tab === 'members' && <MembersList collegeId={college._id} />}
      {tab === 'events' && <CollegeEvents collegeId={college._id} />}
      {tab === 'review' && <VerificationQueue />}
      {tab === 'about' && (
        <div className="card space-y-4 p-5">
          <p className="text-sm text-muted">
            Only verified students, alumni and faculty of {college.name} can see this group.
            {college.domains.length > 0 && ` Members can verify instantly with an address ending in ${college.domains.map((domain) => `@${domain}`).join(' or ')}.`}
          </p>
          <h2 className="font-display font-semibold">Moderators</h2>
          {college.moderators.length ? college.moderators.map((moderator) => <UserChip key={moderator._id} user={moderator} />) : <p className="text-sm text-muted">No moderators yet. Site admins review verification requests.</p>}
        </div>
      )}
    </div>
  );
}

export default function College() {
  const { user } = useAuth();
  return user.verified && user.college ? <CollegeGroup collegeId={user.college._id ?? user.college} /> : <VerifyStatus />;
}
