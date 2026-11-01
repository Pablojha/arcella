import { BadgeCheck, BookOpen, Briefcase, CalendarDays, Flag, FolderOpen, GraduationCap, Hourglass, MessageCircleQuestionMark, Newspaper, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import CollegesAdmin from '../components/admin/CollegesAdmin';
import ReportsAdmin from '../components/admin/ReportsAdmin';
import UsersAdmin from '../components/admin/UsersAdmin';
import VerificationQueue from '../components/college/VerificationQueue';
import PageHeader from '../components/ui/PageHeader';
import Reveal from '../components/ui/Reveal';
import { Skeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import NotFound from './NotFound';

const STATS = [
  { key: 'pending', label: 'Pending reviews', icon: Hourglass, urgent: true },
  { key: 'reports', label: 'Open reports', icon: Flag, urgent: true },
  { key: 'users', label: 'Members', icon: Users },
  { key: 'verified', label: 'Verified', icon: BadgeCheck },
  { key: 'colleges', label: 'Colleges', icon: GraduationCap },
  { key: 'posts', label: 'Posts', icon: Newspaper },
  { key: 'projects', label: 'Projects', icon: FolderOpen },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'events', label: 'Events', icon: CalendarDays },
  { key: 'questions', label: 'Questions', icon: MessageCircleQuestionMark },
  { key: 'resources', label: 'Resources', icon: BookOpen },
];

function Overview() {
  const { data } = useApi('/admin/stats');
  return (
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
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  if (!user.isAdmin) return <NotFound />;
  const tab = params.get('tab') || 'overview';
  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'verifications', label: 'Verifications' },
    { value: 'reports', label: 'Reports' },
    { value: 'colleges', label: 'Colleges' },
    { value: 'users', label: 'Users' },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Admin" subtitle="Keep Arcella trustworthy" />
      <Tabs tabs={tabs} value={tab} onChange={(value) => setParams({ tab: value }, { replace: true })} className="mb-5" />
      {tab === 'overview' && <Overview />}
      {tab === 'verifications' && <VerificationQueue />}
      {tab === 'reports' && <ReportsAdmin />}
      {tab === 'colleges' && <CollegesAdmin />}
      {tab === 'users' && <UsersAdmin />}
    </div>
  );
}
