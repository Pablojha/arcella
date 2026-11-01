import { useEffect, useState } from 'react';
import { Search as SearchIcon, SearchX } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import FirmCard from '../components/firms/FirmCard';
import JobCard from '../components/jobs/JobCard';
import PersonCard from '../components/network/PersonCard';
import ProjectCard from '../components/portfolio/ProjectCard';
import QuestionCard from '../components/qa/QuestionCard';
import EmptyState from '../components/ui/EmptyState';
import Reveal from '../components/ui/Reveal';
import SearchInput from '../components/ui/SearchInput';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { useTitle } from '../hooks/useTitle';

function Group({ title, items, more, grid = false, render }) {
  if (!items?.length) return null;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {more && (
          <Link to={more} className="text-sm font-medium text-brand hover:underline">
            See all
          </Link>
        )}
      </div>
      <div className={grid ? 'grid grid-cols-2 gap-3 md:grid-cols-3' : 'space-y-3'}>
        {items.map((item, index) => (
          <Reveal key={item._id} index={index}>
            {render(item)}
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const term = useDebounce(query.trim());
  const { data, loading } = useApi(term ? '/search' : null, { q: term });
  const results = term ? data : null;
  const empty = results && Object.values(results).every((list) => !list.length);
  useTitle(term ? `“${term}”` : 'Search');

  useEffect(() => {
    if ((params.get('q') ?? '') !== term) setParams(term ? { q: term } : {}, { replace: true });
  }, [term, params, setParams]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SearchInput value={query} onChange={setQuery} placeholder="People, projects, jobs, firms, questions" autoFocus />
      {!term && <EmptyState icon={SearchIcon} title="Search Arcella" text="Find people by name, skill or software, plus projects, open jobs, firms and questions." />}
      {term && loading && !results && <ListSkeleton count={3} lines={0} />}
      {empty && <EmptyState icon={SearchX} title={`Nothing found for “${term}”`} text="Try another word, a college or a software name like Revit." />}
      {results && (
        <>
          <Group title="People" items={results.people} more={`/network?q=${encodeURIComponent(term)}`} render={(person) => <PersonCard person={person} />} />
          <Group title="Projects" items={results.projects} grid render={(project) => <ProjectCard project={project} />} />
          <Group title="Open jobs" items={results.jobs} render={(job) => <JobCard job={job} />} />
          <Group title="Firms" items={results.firms} render={(firm) => <FirmCard firm={firm} />} />
          <Group title="Questions" items={results.questions} render={(question) => <QuestionCard question={question} />} />
        </>
      )}
    </div>
  );
}
