import { useState } from 'react';
import { CalendarCheck, HandHeart } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import MentorCard from '../components/mentors/MentorCard';
import MentorSettings from '../components/mentors/MentorSettings';
import RequestSession from '../components/mentors/RequestSession';
import SessionCard from '../components/mentors/SessionCard';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import Reveal from '../components/ui/Reveal';
import SearchInput from '../components/ui/SearchInput';
import { ListSkeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { usePaged } from '../hooks/usePaged';

function FindMentors() {
  const [query, setQuery] = useState('');
  const [requesting, setRequesting] = useState(null);
  const mentors = usePaged('/mentorship/mentors', { q: useDebounce(query) });
  return (
    <div className="space-y-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name or topic: thesis, portfolio, abroad…" />
      <div className="grid gap-3 sm:grid-cols-2">
        {mentors.items.map((mentor, index) => (
          <Reveal key={mentor._id} index={index}>
            <MentorCard mentor={mentor} onRequest={setRequesting} />
          </Reveal>
        ))}
      </div>
      {mentors.loading && <ListSkeleton count={2} />}
      {!mentors.loading && !mentors.items.length && <EmptyState icon={HandHeart} title="No mentors found" text="Alumni and faculty can switch on mentoring from this page." />}
      <LoadMore hasMore={mentors.hasMore} loading={mentors.loading} onLoad={mentors.loadMore} />
      <RequestSession mentor={requesting} onClose={() => setRequesting(null)} />
    </div>
  );
}

function Sessions() {
  const { data, loading } = useApi('/mentorship/sessions');
  if (loading) return <ListSkeleton count={2} />;
  if (!data?.items.length) return <EmptyState icon={CalendarCheck} title="No sessions yet" text="Requests you send or receive will show up here." />;
  return (
    <div className="space-y-3">
      {data.items.map((session, index) => (
        <Reveal key={session._id} index={index}>
          <SessionCard session={session} />
        </Reveal>
      ))}
    </div>
  );
}

export default function Mentors() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'find';
  const canMentor = user.type !== 'student';
  const tabs = [
    { value: 'find', label: 'Find a mentor' },
    { value: 'sessions', label: 'My sessions' },
    ...(canMentor ? [{ value: 'settings', label: 'Mentor settings' }] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Mentorship" subtitle="Learn from alumni and faculty who have been there" />
      <Tabs tabs={tabs} value={tab} onChange={(value) => setParams({ tab: value }, { replace: true })} className="mb-5" />
      {tab === 'find' && <FindMentors />}
      {tab === 'sessions' && <Sessions />}
      {tab === 'settings' && canMentor && <MentorSettings />}
    </div>
  );
}
