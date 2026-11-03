import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePaged } from '../../hooks/usePaged';
import api from '../../lib/api';
import { SUPPORT_TOPICS } from '../../lib/constants';
import { ago, deviceName, labelOf } from '../../lib/format';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import LoadMore from '../ui/LoadMore';
import { ListSkeleton } from '../ui/Skeleton';
import Tabs from '../ui/Tabs';
import UserChip from '../ui/UserChip';

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'answered', label: 'Answered' },
  { value: 'closed', label: 'Closed' },
];

/** Members' questions and problem reports; staff reply (the member is notified) and close them. */
export default function SupportAdmin() {
  const toast = useToast();
  const [status, setStatus] = useState('open');
  const list = usePaged('/support/queue', { status });
  const [drafts, setDrafts] = useState({});

  const answer = async (ticket, close) => {
    try {
      await api.post(`/support/${ticket._id}/answer`, { text: drafts[ticket._id]?.trim() || undefined, close });
      list.setItems((items) => items.filter((item) => item._id !== ticket._id));
      setDrafts((current) => ({ ...current, [ticket._id]: '' }));
      toast.success(close ? 'Request closed' : 'Reply sent');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-3">
      <Tabs tabs={STATUSES} value={status} onChange={setStatus} variant="pill" className="max-w-sm" />
      {list.items.map((ticket) => (
        <article key={ticket._id} className="card space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <UserChip user={ticket.user} sub={`${ticket.user?.email ?? ''} · ${ago(ticket.createdAt)}`} />
            <span className="chip">{labelOf(SUPPORT_TOPICS, ticket.topic)}</span>
          </div>
          <div>
            <h3 className="font-semibold">{ticket.subject}</h3>
            <p className="whitespace-pre-line break-words text-sm">{ticket.message}</p>
            {ticket.page && (
              <p className="mt-1 text-xs text-muted">
                On {ticket.page} · {deviceName(ticket.agent)}
              </p>
            )}
          </div>
          {ticket.replies.map((reply, index) => (
            <div key={index} className={`rounded-2xl p-3 text-sm ${reply.staff ? 'bg-brand/10' : 'bg-ink/5'}`}>
              <p className="mb-1 text-xs font-semibold">
                {reply.staff ? reply.author?.name ?? 'Staff' : 'Member'} · {ago(reply.at)}
              </p>
              <p className="whitespace-pre-line break-words">{reply.text}</p>
            </div>
          ))}
          {status !== 'closed' && (
            <>
              <textarea value={drafts[ticket._id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [ticket._id]: event.target.value }))} rows={3} maxLength={4000} aria-label={`Reply to ${ticket.subject}`} className="input resize-none" placeholder="Reply to the member" />
              <div className="flex gap-2">
                <Button size="sm" disabled={!drafts[ticket._id]?.trim()} onClick={() => answer(ticket, false)}>
                  Send reply
                </Button>
                <Button size="sm" variant="secondary" onClick={() => answer(ticket, true)}>
                  {drafts[ticket._id]?.trim() ? 'Reply and close' : 'Close'}
                </Button>
              </div>
            </>
          )}
        </article>
      ))}
      {list.loading && <ListSkeleton count={2} lines={2} />}
      {!list.loading && !list.items.length && <EmptyState icon={LifeBuoy} title={`No ${status} requests`} text="Questions and problem reports from members appear here." />}
      <LoadMore hasMore={list.hasMore} loading={list.loading} onLoad={list.loadMore} />
    </div>
  );
}
