import { useState } from 'react';
import { Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { usePaged } from '../../hooks/usePaged';
import { SOFTWARE, USER_TYPES } from '../../lib/constants';
import CollegeSelect from '../ui/CollegeSelect';
import EmptyState from '../ui/EmptyState';
import LoadMore from '../ui/LoadMore';
import Reveal from '../ui/Reveal';
import SearchInput from '../ui/SearchInput';
import { ListSkeleton } from '../ui/Skeleton';
import PersonCard from './PersonCard';

function PeopleList({ paged, empty }) {
  const { items, loading, hasMore, loadMore } = paged;
  return (
    <div className="space-y-3">
      {items.map((person, index) => (
        <Reveal key={person._id} index={index}>
          <PersonCard person={person} />
        </Reveal>
      ))}
      {loading && <ListSkeleton count={3} lines={0} />}
      {!loading && !items.length && empty}
      <LoadMore hasMore={hasMore} loading={loading} onLoad={loadMore} />
    </div>
  );
}

/** Search by name, skill, software or college; shows suggestions until a filter is set. */
export default function FindPeople({ initialQuery = '', autoFocus = false }) {
  const [filters, setFilters] = useState({ q: initialQuery, software: '', college: '', type: '' });
  const query = useDebounce(filters.q);
  const searching = Boolean(query || filters.software || filters.college || filters.type);
  const results = usePaged(searching ? '/users' : null, { ...filters, q: query });
  const suggestions = useApi(searching ? null : '/users/suggestions');
  const set = (key) => (value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-4">
      <SearchInput value={filters.q} onChange={set('q')} placeholder="Search by name, skill or software" autoFocus={autoFocus} />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <select value={filters.software} onChange={(event) => set('software')(event.target.value)} className="input" aria-label="Software">
          <option value="">Any software</option>
          {SOFTWARE.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <select value={filters.type} onChange={(event) => set('type')(event.target.value)} className="input" aria-label="Member type">
          <option value="">Everyone</option>
          {USER_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <CollegeSelect value={filters.college} onChange={set('college')} className="col-span-2 md:col-span-1" />
      </div>

      {searching ? (
        <PeopleList paged={results} empty={<EmptyState icon={Users} title="No one matches yet" text="Try a different name, skill or college." />} />
      ) : (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">People you may know</h2>
          {suggestions.loading ? (
            <ListSkeleton count={4} lines={0} />
          ) : (
            <div className="space-y-3">
              {suggestions.data?.items.map((person, index) => (
                <Reveal key={person._id} index={index}>
                  <PersonCard person={person} />
                </Reveal>
              ))}
              {!suggestions.data?.items.length && <EmptyState icon={Users} title="You're early!" text="Invite your batchmates to Arcella and they'll show up here." />}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
