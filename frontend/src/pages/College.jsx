import { motion } from 'framer-motion';
import { GraduationCap, Lock, MapPin, Plus, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import CollegeEvents from '../components/college/CollegeEvents';
import GroupChat from '../components/college/GroupChat';
import GroupDiscussion from '../components/college/GroupDiscussion';
import MembersList from '../components/college/MembersList';
import VerificationQueue from '../components/college/VerificationQueue';
import VerifyStatus from '../components/college/VerifyStatus';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import FirmLogo from '../components/ui/FirmLogo';
import { Skeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import UserChip from '../components/ui/UserChip';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useMedia } from '../hooks/useMedia';
import { useTitle } from '../hooks/useTitle';
import { GROUP_ROLES } from '../lib/constants';
import { plural } from '../lib/format';
import { entriesAt, entryTitle, entryYears, idOf, memberColleges } from '../lib/memberships';

/** Chips to move between the groups of a member's colleges. */
function CollegeSwitcher({ colleges, current }) {
  return (
    <nav aria-label="Your colleges" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {colleges.map((college) => (
        <Link
          key={college._id}
          to={`/college?id=${college._id}`}
          aria-current={college._id === current ? 'page' : undefined}
          className={`chip h-9 shrink-0 px-3.5 text-sm ${college._id === current ? 'bg-brand text-on-brand' : 'hover:bg-ink/10'}`}
        >
          {college.short ?? college.name}
        </Link>
      ))}
      <Link to="/college/verify" className="chip h-9 shrink-0 gap-1 px-3.5 text-sm hover:bg-ink/10">
        <Plus size={14} /> Add college
      </Link>
    </nav>
  );
}

function CollegeGroup({ collegeId, colleges }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: college, loading, error, setData } = useApi(`/colleges/${collegeId}`);
  const desktop = useMedia('(min-width: 768px)');
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
  // On phones the chat opens full screen, so the group's page starts on its posts.
  const tab = tabs.some((item) => item.value === params.get('tab')) ? params.get('tab') : desktop ? 'chat' : 'posts';
  const groupRole = ['admin', 'coAdmin'].find((role) => college[role]?._id === user._id);
  const entries = entriesAt(user, college._id);
  const you = entries.length ? entries.map((entry) => [entryTitle(entry), entryYears(entry)].filter(Boolean).join(' · ')).join('; ') : 'Arcella admin';

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
      {colleges.length > 1 && <CollegeSwitcher colleges={colleges} current={college._id} />}
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
      {tab === 'chat' && <GroupChat college={college} onClose={() => switchTab('posts')} />}
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
          <div className="border-t border-line pt-4">
            <p className="text-sm text-muted">Studied or teach somewhere else too? Each college you verify adds its group here.</p>
            <Button to="/college/verify" variant="secondary" size="sm" icon={Plus} className="mt-3">
              Verify another college
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The groups of your verified colleges (`?id=<collegeId>` picks one, the main college by default); Arcella admins can open any group. */
export default function College() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const colleges = memberColleges(user);
  const requested = params.get('id');
  const collegeId = (requested && (user.isAdmin || colleges.some((college) => college._id === requested)) ? requested : idOf(colleges[0])) ?? null;
  return collegeId ? <CollegeGroup key={collegeId} collegeId={collegeId} colleges={colleges} /> : <VerifyStatus />;
}
