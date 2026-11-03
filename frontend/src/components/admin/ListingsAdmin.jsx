import { useState } from 'react';
import { BadgeCheck, Briefcase, Building, Trash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePaged } from '../../hooks/usePaged';
import api from '../../lib/api';
import { timeAgo } from '../../lib/format';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import LoadMore from '../ui/LoadMore';
import SearchInput from '../ui/SearchInput';
import { ListSkeleton } from '../ui/Skeleton';

/** Asks why, then removes; the owner is told the reason. */
async function removeWithReason(url, name, toast, onDone) {
  const reason = window.prompt(`Why is "${name}" being removed? The owner will see this.`);
  if (!reason?.trim()) return;
  try {
    await api.delete(url, { data: { reason: reason.trim() } });
    toast.success('Removed');
    onDone();
  } catch (error) {
    toast.error(error.message);
  }
}

function Listing({ path, placeholder, icon, empty, children }) {
  const [query, setQuery] = useState('');
  const list = usePaged(path, { q: useDebounce(query), limit: 20 });
  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={setQuery} placeholder={placeholder} />
      {list.items.map((item) => children(item, list))}
      {list.loading && <ListSkeleton count={3} lines={0} />}
      {list.error && <EmptyState icon={icon} title="Couldn't load this list" text={list.error.message} />}
      {!list.loading && !list.error && !list.items.length && <EmptyState icon={icon} title={empty} />}
      <LoadMore hasMore={list.hasMore} loading={list.loading} onLoad={list.loadMore} />
    </div>
  );
}

export function JobsAdmin() {
  const toast = useToast();
  return (
    <Listing path="/admin/jobs" placeholder="Search by title or company" icon={Briefcase} empty="No jobs match">
      {(job, list) => (
        <div key={job._id} className="card flex flex-wrap items-center gap-3 p-3.5">
          <div className="min-w-0 flex-1">
            <Link to={`/jobs/${job._id}`} className="font-semibold hover:underline">
              {job.title}
            </Link>
            <p className="truncate text-sm text-muted">
              {job.company} · by {job.postedBy?.name ?? 'a deleted account'} · {timeAgo(job.createdAt)} · {job.applicationsCount} applicants{job.closed ? ' · closed' : ''}
            </p>
          </div>
          <Button size="sm" variant="danger" icon={Trash} onClick={() => removeWithReason(`/admin/jobs/${job._id}`, job.title, toast, () => list.setItems((items) => items.filter((item) => item._id !== job._id)))}>
            Remove
          </Button>
        </div>
      )}
    </Listing>
  );
}

export function FirmsAdmin() {
  const toast = useToast();
  const toggleBadge = async (firm, list) => {
    try {
      const { verified } = await api.patch(`/admin/firms/${firm._id}`, { verified: !firm.verified });
      list.setItems((items) => items.map((item) => (item._id === firm._id ? { ...item, verified } : item)));
      toast.success(verified ? `${firm.name} is verified` : 'Badge removed');
    } catch (error) {
      toast.error(error.message);
    }
  };
  return (
    <Listing path="/admin/firms" placeholder="Search firms" icon={Building} empty="No firms match">
      {(firm, list) => (
        <div key={firm._id} className="card flex flex-wrap items-center gap-3 p-3.5">
          <div className="min-w-0 flex-1">
            <Link to={`/firms/${firm.slug}`} className="font-semibold hover:underline">
              {firm.name}
            </Link>
            {firm.verified && <BadgeCheck size={15} className="ml-1 inline text-brand" aria-label="Verified" />}
            <p className="truncate text-sm text-muted">
              {firm.city ? `${firm.city} · ` : ''}owner {firm.owner?.name ?? 'deleted'} · {timeAgo(firm.createdAt)}
            </p>
          </div>
          <Button size="sm" variant="secondary" icon={BadgeCheck} onClick={() => toggleBadge(firm, list)}>
            {firm.verified ? 'Remove badge' : 'Verify'}
          </Button>
          <Button size="sm" variant="danger" icon={Trash} onClick={() => removeWithReason(`/admin/firms/${firm._id}`, firm.name, toast, () => list.setItems((items) => items.filter((item) => item._id !== firm._id)))}>
            Remove
          </Button>
        </div>
      )}
    </Listing>
  );
}

const ACTIONS = {
  'user.role': 'changed the role of',
  'user.suspend': 'suspended',
  'user.ban': 'banned',
  'user.restore': 'restored',
  'user.verify': 'verified',
  'user.unverify': 'removed the verification of',
  'college.update': 'edited a college',
  'report.remove': 'removed reported content',
  'report.dismiss': 'dismissed a report',
  'job.remove': 'removed a job',
  'firm.verify': 'verified a firm',
  'firm.unverify': 'removed a firm badge',
  'firm.remove': 'removed a firm',
  'support.reply': 'answered a support request',
  'support.close': 'closed a support request',
};

/** Who did what, newest first. */
export function AuditAdmin() {
  const list = usePaged('/admin/audit', { limit: 30 });
  const detail = (entry) => {
    const { details = {} } = entry;
    return [details.from && `${details.from} → ${details.to}`, details.name, details.title, details.reason && `“${details.reason}”`, details.until && `until ${new Date(details.until).toLocaleDateString()}`].filter(Boolean).join(' · ');
  };
  return (
    <div className="space-y-2">
      <ul className={list.items.length ? 'card divide-y divide-line' : ''}>
        {list.items.map((entry) => (
          <li key={entry._id} className="flex flex-wrap items-baseline gap-x-2 px-4 py-3 text-sm">
            <b>{entry.actor?.name ?? 'Deleted account'}</b>
            <span>{ACTIONS[entry.action] ?? entry.action}</span>
            {entry.targetType === 'user' && entry.target && (
              <span className="text-muted">
                (account <code className="text-xs">{entry.target.slice(-6)}</code>)
              </span>
            )}
            {detail(entry) && <span className="min-w-0 break-words text-muted">{detail(entry)}</span>}
            <span className="ml-auto text-xs text-muted">{timeAgo(entry.createdAt)}</span>
          </li>
        ))}
      </ul>
      {list.loading && <ListSkeleton count={3} lines={0} />}
      {!list.loading && !list.items.length && <EmptyState icon={BadgeCheck} title="No staff actions yet" text="Role changes, suspensions, removals and verifications are recorded here." />}
      <LoadMore hasMore={list.hasMore} loading={list.loading} onLoad={list.loadMore} />
    </div>
  );
}
