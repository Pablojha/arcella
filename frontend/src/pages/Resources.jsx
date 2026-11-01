import { useState } from 'react';
import { BookOpen, Upload } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ResourceCard from '../components/resources/ResourceCard';
import UploadResource from '../components/resources/UploadResource';
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
import { RESOURCE_KINDS, SEMESTERS } from '../lib/constants';

export default function Resources() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ semester: '', kind: '', saved: params.has('saved') });
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const resources = usePaged('/resources', { ...filters, q: useDebounce(query) });
  const set = (key) => (value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Study resources"
        subtitle="Notes, CAD blocks, sheets and templates by semester"
        action={
          <Button icon={Upload} onClick={() => setUploading(true)}>
            Share
          </Button>
        }
      />
      <div className="mb-5 space-y-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
          <SearchInput value={query} onChange={setQuery} placeholder="Search notes, subjects, blocks" />
          <select value={filters.kind} onChange={(event) => set('kind')(event.target.value)} className="input" aria-label="Type">
            <option value="">All types</option>
            {RESOURCE_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </div>
        <Chips options={SEMESTERS} value={filters.semester} onChange={set('semester')} allLabel="All semesters" />
        <div className="w-48">
          <Toggle checked={filters.saved} onChange={set('saved')} label="Saved only" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {resources.items.map((resource, index) => (
          <Reveal key={resource._id} index={index}>
            <ResourceCard resource={resource} onDeleted={(id) => resources.setItems((items) => items.filter((item) => item._id !== id))} />
          </Reveal>
        ))}
      </div>
      {resources.loading && <ListSkeleton count={2} lines={1} />}
      {!resources.loading && !resources.items.length && <EmptyState icon={BookOpen} title={filters.saved ? 'Nothing saved yet' : 'No resources here yet'} text="Share your notes and help the batch below you." />}
      <LoadMore hasMore={resources.hasMore} loading={resources.loading} onLoad={resources.loadMore} />
      <UploadResource open={uploading} onClose={() => setUploading(false)} onUploaded={(resource) => resources.setItems((items) => [resource, ...items])} />
    </div>
  );
}
