import { useState } from 'react';
import { Building, Plus } from 'lucide-react';
import FirmCard from '../components/firms/FirmCard';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import Reveal from '../components/ui/Reveal';
import SearchInput from '../components/ui/SearchInput';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useDebounce } from '../hooks/useDebounce';
import { usePaged } from '../hooks/usePaged';

export default function Firms() {
  const [query, setQuery] = useState('');
  const firms = usePaged('/firms', { q: useDebounce(query) });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Firms"
        subtitle="Practices, studios and the people who work there"
        action={
          <Button to="/firms/new" icon={Plus}>
            Create
          </Button>
        }
      />
      <SearchInput value={query} onChange={setQuery} placeholder="Search firms" className="mb-5 md:max-w-md" />
      <div className="grid gap-3 sm:grid-cols-2">
        {firms.items.map((firm, index) => (
          <Reveal key={firm._id} index={index}>
            <FirmCard firm={firm} />
          </Reveal>
        ))}
      </div>
      {firms.loading && <ListSkeleton count={2} lines={0} />}
      {!firms.loading && !firms.items.length && <EmptyState icon={Building} title="No firms yet" text="Create a page for your practice to list roles and grow a following." />}
      <LoadMore hasMore={firms.hasMore} loading={firms.loading} onLoad={firms.loadMore} />
    </div>
  );
}
