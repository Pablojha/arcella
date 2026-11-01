import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { usePaged } from '../../hooks/usePaged';
import FirmLogo from '../ui/FirmLogo';
import LoadMore from '../ui/LoadMore';
import SearchInput from '../ui/SearchInput';
import { ListSkeleton } from '../ui/Skeleton';
import EditCollege from './EditCollege';

export default function CollegesAdmin() {
  const [query, setQuery] = useState('');
  const colleges = usePaged('/admin/colleges', { q: useDebounce(query), limit: 20 });
  const [editing, setEditing] = useState(null);

  const saved = (college) => {
    colleges.setItems((items) => items.map((item) => (item._id === college._id ? college : item)));
    setEditing(college);
  };

  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Search colleges" />
      {colleges.items.map((college) => (
        <button key={college._id} type="button" onClick={() => setEditing(college)} className="card flex w-full items-center gap-3 p-3.5 text-left transition hover:border-ink/25">
          <FirmLogo name={college.short || college.name} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{college.name}</span>
            <span className="block truncate text-xs text-muted">
              {college.domains.length ? college.domains.map((domain) => `@${domain}`).join(', ') : 'No email domain'} · {college.moderators.length} moderators
              {college.userAdded && ' · added by a member'}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted" />
        </button>
      ))}
      {colleges.loading && <ListSkeleton count={3} lines={0} />}
      <LoadMore hasMore={colleges.hasMore} loading={colleges.loading} onLoad={colleges.loadMore} />
      {editing && <EditCollege key={editing._id} college={editing} onClose={() => setEditing(null)} onSaved={saved} />}
    </div>
  );
}
