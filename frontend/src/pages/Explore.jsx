import { useState } from 'react';
import { Compass, Upload } from 'lucide-react';
import ProjectCard from '../components/portfolio/ProjectCard';
import Button from '../components/ui/Button';
import Chips from '../components/ui/Chips';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import Reveal from '../components/ui/Reveal';
import SearchInput from '../components/ui/SearchInput';
import { GridSkeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { usePageMeta } from '../hooks/usePageMeta';
import { usePaged } from '../hooks/usePaged';
import { PROJECT_CATEGORIES } from '../lib/constants';

const GRID = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

export default function Explore() {
  const { user } = useAuth();
  usePageMeta({ path: '/explore', description: 'Explore architecture projects by students and graduates across India: thesis, studio work, competitions and more.' });
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const projects = usePaged('/projects', { category, q: useDebounce(query), limit: 16 });

  return (
    <div>
      <PageHeader
        title="Explore"
        subtitle="Student and practice work from across India"
        action={
          user && (
            <Button to="/projects/new" icon={Upload}>
              <span className="hidden sm:inline">Upload project</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          )
        }
      />
      <div className="mb-5 space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search projects, tools or places" className="md:max-w-md" />
        <Chips options={PROJECT_CATEGORIES} value={category} onChange={setCategory} />
      </div>
      <div className={`grid gap-3 md:gap-4 ${GRID}`}>
        {projects.items.map((project, index) => (
          <Reveal key={project._id} index={index}>
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </div>
      {projects.loading && <GridSkeleton count={8} className={`mt-4 ${GRID}`} />}
      {!projects.loading && !projects.items.length && <EmptyState icon={Compass} title="Nothing pinned up yet" text="Be the first to share a project in this category." />}
      <LoadMore hasMore={projects.hasMore} loading={projects.loading} onLoad={projects.loadMore} />
    </div>
  );
}
