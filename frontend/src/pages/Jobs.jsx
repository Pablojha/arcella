import { useState } from 'react';
import { Briefcase, Building, MapPin, Plus } from 'lucide-react';
import JobCard from '../components/jobs/JobCard';
import Button from '../components/ui/Button';
import Chips from '../components/ui/Chips';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import Reveal from '../components/ui/Reveal';
import SearchInput from '../components/ui/SearchInput';
import { ListSkeleton } from '../components/ui/Skeleton';
import Toggle from '../components/ui/Toggle';
import { useDebounce } from '../hooks/useDebounce';
import { usePaged } from '../hooks/usePaged';
import { JOB_TYPES } from '../lib/constants';

export default function Jobs() {
  const [type, setType] = useState('');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);
  const jobs = usePaged('/jobs', { type, q: useDebounce(query), location: useDebounce(location), remote });

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
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_200px]">
        <SearchInput value={query} onChange={setQuery} placeholder="Role, firm or skill" />
        <SearchInput icon={MapPin} value={location} onChange={setLocation} placeholder="City" />
      </div>
      <div className="mb-5 space-y-3">
        <Chips options={JOB_TYPES} value={type} onChange={setType} />
        <div className="flex items-center justify-between gap-3">
          <div className="w-44">
            <Toggle checked={remote} onChange={setRemote} label="Remote only" />
          </div>
          <Button to="/firms" variant="ghost" size="sm" icon={Building}>
            Browse firms
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        {jobs.items.map((job, index) => (
          <Reveal key={job._id} index={index}>
            <JobCard job={job} />
          </Reveal>
        ))}
        {jobs.loading && <ListSkeleton count={3} lines={1} />}
        {!jobs.loading && !jobs.items.length && <EmptyState icon={Briefcase} title="No open roles match" text="Try another filter, or post an opening from your firm." />}
        <LoadMore hasMore={jobs.hasMore} loading={jobs.loading} onLoad={jobs.loadMore} />
      </div>
    </div>
  );
}
