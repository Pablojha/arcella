import { useState } from 'react';
import { Bookmark, Briefcase, Building, MapPin, Plus, Send, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import JobCard from '../components/jobs/JobCard';
import StatusChip from '../components/jobs/StatusChip';
import Button from '../components/ui/Button';
import Chips from '../components/ui/Chips';
import EmptyState from '../components/ui/EmptyState';
import FirmLogo from '../components/ui/FirmLogo';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import Reveal from '../components/ui/Reveal';
import SearchInput from '../components/ui/SearchInput';
import { ListSkeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import { useDebounce } from '../hooks/useDebounce';
import { usePaged } from '../hooks/usePaged';
import { EXPERIENCE, JOB_TYPES, WORKPLACES } from '../lib/constants';
import { timeAgo } from '../lib/format';

const TABS = [
  { value: 'find', label: 'Find jobs', icon: Briefcase },
  { value: 'saved', label: 'Saved', icon: Bookmark },
  { value: 'applied', label: 'Applied', icon: Send },
  { value: 'hiring', label: 'Hiring', icon: Users },
];

const EMPTY = {
  find: ['No open roles match', 'Try another filter, or post an opening from your firm.'],
  saved: ['No saved jobs', 'Tap Save on a role to come back to it later.'],
  applied: ['No applications yet', 'Roles you apply to in Arcella, and where each one stands, show up here.'],
  hiring: ["You aren't hiring yet", "Roles you post, and your firms' roles, show up here with their applicants."],
};

function ApplicationCard({ application: { job, status, updatedAt } }) {
  if (!job) return null;
  return (
    <Link to={`/jobs/${job._id}`} className="card flex items-center gap-3.5 p-4 transition hover:border-ink/25">
      <FirmLogo logo={job.firm?.logo} name={job.company} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{job.title}</h3>
        <p className="truncate text-sm text-muted">
          {job.company} · updated {timeAgo(updatedAt)}
        </p>
      </div>
      <StatusChip status={status} />
    </Link>
  );
}

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(({ value }) => value === params.get('tab')) ? params.get('tab') : 'find';
  const [filters, setFilters] = useState({ type: '', workplace: '', experience: '' });
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const q = useDebounce(query);
  const city = useDebounce(location);
  const set = (key) => (value) => setFilters((current) => ({ ...current, [key]: value }));
  const find = tab === 'find';
  const jobs = usePaged(tab === 'applied' ? null : '/jobs', find ? { ...filters, q, location: city } : { [tab]: true });
  const applications = usePaged(tab === 'applied' ? '/jobs/applications' : null);
  const list = tab === 'applied' ? applications : jobs;
  const [title, text] = EMPTY[tab];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Jobs"
        subtitle="Internships, roles, freelance work and competitions"
        action={
          <Button to="/jobs/new" icon={Plus}>
            Post
          </Button>
        }
      />
      <Tabs tabs={TABS} value={tab} onChange={(value) => setParams(value === 'find' ? {} : { tab: value }, { replace: true })} className="mb-4" />
      {find && (
        <>
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_200px]">
            <SearchInput value={query} onChange={setQuery} placeholder="Role, firm or skill" />
            <SearchInput icon={MapPin} value={location} onChange={setLocation} placeholder="City" />
          </div>
          <div className="mb-5 space-y-3">
            <Chips options={JOB_TYPES} value={filters.type} onChange={set('type')} />
            <div className="flex flex-wrap items-center gap-2">
              <Chips options={WORKPLACES} value={filters.workplace} onChange={set('workplace')} allLabel="Any workplace" bleed={false} />
              <select value={filters.experience} onChange={(event) => set('experience')(event.target.value)} aria-label="Experience" className="input h-8 w-auto rounded-full py-0 text-[13px]">
                <option value="">Any experience</option>
                {EXPERIENCE.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Button to="/firms" variant="ghost" size="sm" icon={Building} className="ml-auto">
                Browse firms
              </Button>
            </div>
          </div>
        </>
      )}
      <div className="space-y-3">
        {list.items.map((item, index) => (
          <Reveal key={item._id} index={index}>
            {tab === 'applied' ? <ApplicationCard application={item} /> : <JobCard job={item} showStatus={tab === 'hiring'} />}
          </Reveal>
        ))}
        {list.loading && <ListSkeleton count={3} lines={1} />}
        {!list.loading && !list.items.length && <EmptyState icon={Briefcase} title={title} text={text} />}
        <LoadMore hasMore={list.hasMore} loading={list.loading} onLoad={list.loadMore} />
      </div>
    </div>
  );
}
