import { Activity, BadgeCheck, BookOpen, Briefcase, Building, CalendarDays, FileText, Flag, FolderOpen, GraduationCap, Hourglass, Link2, MessageCircleQuestionMark, Newspaper, UserMinus, UserPlus, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import CollegesAdmin from '../components/admin/CollegesAdmin';
import { AuditAdmin, FirmsAdmin, JobsAdmin } from '../components/admin/ListingsAdmin';
import ReportsAdmin from '../components/admin/ReportsAdmin';
import SignupChart from '../components/admin/SignupChart';
import UsersAdmin from '../components/admin/UsersAdmin';
import VerificationQueue from '../components/college/VerificationQueue';
import PageHeader from '../components/ui/PageHeader';
import Reveal from '../components/ui/Reveal';
import { Skeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { can } from '../lib/permissions';
import NotFound from './NotFound';

const STATS = [
  { key: 'pending', label: 'Pending reviews', icon: Hourglass, urgent: true },
  { key: 'reports', label: 'Open reports', icon: Flag, urgent: true },
  { key: 'users', label: 'Members', icon: Users },
  { key: 'active7', label: 'Active this week', icon: Activity },
  { key: 'joined7', label: 'Joined this week', icon: UserPlus },
  { key: 'joined30', label: 'Joined in 30 days', icon: UserPlus },
  { key: 'verified', label: 'Verified', icon: BadgeCheck },
  { key: 'suspended', label: 'Suspended or banned', icon: UserMinus },
  { key: 'connections', label: 'Connections', icon: Link2 },
  { key: 'posts', label: 'Posts', icon: Newspaper },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'applications', label: 'Applications', icon: FileText },
  { key: 'firms', label: 'Firms', icon: Building },
  { key: 'colleges', label: 'Colleges', icon: GraduationCap },
  { key: 'projects', label: 'Projects', icon: FolderOpen },
  { key: 'events', label: 'Events', icon: CalendarDays },
  { key: 'questions', label: 'Questions', icon: MessageCircleQuestionMark },
  { key: 'resources', label: 'Resources', icon: BookOpen },
];

function Overview() {
  const { data, error } = useApi('/admin/stats');
  if (error) return <p className="text-sm text-accent">{error.message}</p>;
  return (
    <div className="space-y-4">
      {data ? <SignupChart weeks={data.growth} /> : <Skeleton className="h-48 rounded-3xl" />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS.map(({ key, label, icon: Icon, urgent }, index) => (
          <Reveal key={key} index={index}>
            <div className={`card p-4 ${urgent && data?.[key] ? 'border-accent/40' : ''}`}>
              <Icon size={18} className={urgent && data?.[key] ? 'text-accent' : 'text-brand'} />
              {data ? <p className="mt-3 font-display text-3xl font-bold tabular-nums">{data[key]}</p> : <Skeleton className="mt-3 h-9 w-16" />}
              <p className="text-sm text-muted">{label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/** Each tab with the permission it needs; the API checks the same permission on every request behind it. */
const TABS = [
  { value: 'overview', label: 'Overview', permission: 'stats:read', Panel: Overview },
  { value: 'verifications', label: 'Verifications', permission: 'users:verify', Panel: VerificationQueue },
  { value: 'reports', label: 'Reports', permission: 'reports:read', Panel: ReportsAdmin },
  { value: 'users', label: 'Users', permission: 'users:read', Panel: UsersAdmin },
  { value: 'jobs', label: 'Jobs', permission: 'jobs:moderate', Panel: JobsAdmin },
  { value: 'firms', label: 'Firms', permission: 'firms:moderate', Panel: FirmsAdmin },
  { value: 'colleges', label: 'Colleges', permission: 'colleges:manage', Panel: CollegesAdmin },
  { value: 'audit', label: 'Audit log', permission: 'audit:read', Panel: AuditAdmin },
];

export default function Admin() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  if (!can(user, 'admin:access')) return <NotFound />;
  const tabs = TABS.filter(({ permission }) => can(user, permission));
  const { Panel, value: tab } = tabs.find(({ value }) => value === params.get('tab')) ?? tabs[0];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Admin" subtitle="Keep Arcella trustworthy" />
      <Tabs tabs={tabs} value={tab} onChange={(value) => setParams({ tab: value }, { replace: true })} className="mb-5" />
      <Panel />
    </div>
  );
}
