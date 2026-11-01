import { useState } from 'react';
import { ExternalLink, Flag, Trash, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePaged } from '../../hooks/usePaged';
import api from '../../lib/api';
import { REPORT_REASONS } from '../../lib/constants';
import { labelOf, mediaUrl, timeAgo } from '../../lib/format';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import LoadMore from '../ui/LoadMore';
import Reveal from '../ui/Reveal';
import { ListSkeleton } from '../ui/Skeleton';
import UserChip from '../ui/UserChip';

/** Where moderators can see reported content in context. */
const LINKS = {
  post: (content) => `/posts/${content._id}`,
  comment: (content) => `/posts/${content.post}`,
  project: (content) => `/projects/${content._id}`,
  question: (content) => `/qa/${content._id}`,
  answer: (content) => `/qa/${content.question}`,
  job: (content) => `/jobs/${content._id}`,
  event: (content) => `/events/${content._id}`,
  firm: (content) => `/firms/${content.slug}`,
  user: (content) => `/u/${content.username}`,
};

const summary = (content) => content.text ?? content.title ?? content.body ?? content.caption ?? content.name ?? '';
const authorOf = (content) => content.author ?? content.owner ?? content.uploader ?? content.postedBy ?? content.host ?? content.from;
const thumbnailOf = (content) => content.images?.[0] ?? content.image ?? content.logo;

export default function ReportsAdmin() {
  const toast = useToast();
  const reports = usePaged('/admin/reports', { limit: 20 });
  const [busy, setBusy] = useState('');

  const resolve = async (report, action) => {
    if (action === 'remove' && !window.confirm(report.type === 'user' ? 'Delete this account and everything it created?' : 'Remove this content for everyone?')) return;
    setBusy(report._id + action);
    try {
      await api.post(`/admin/reports/${report._id}/resolve`, { action });
      reports.setItems((items) => items.filter((item) => item.target !== report.target));
      toast.success(action === 'remove' ? 'Removed' : 'Report dismissed');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  if (!reports.loading && !reports.items.length) return <EmptyState icon={Flag} title="No open reports" text="Reports from members about posts, profiles and messages appear here." />;

  return (
    <div className="space-y-3">
      {reports.items.map((report, index) => {
        const { content } = report;
        const thumbnail = content && thumbnailOf(content);
        return (
          <Reveal key={report._id} index={index}>
            <article className="card space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="chip capitalize">{report.type}</span>
                <span className="chip bg-accent/10 text-accent">{labelOf(REPORT_REASONS, report.reason)}</span>
                <span className="ml-auto text-muted">{timeAgo(report.createdAt)}</span>
              </div>
              {content ? (
                <div className="flex gap-3 rounded-xl bg-ink/[0.04] p-3">
                  {thumbnail && <img src={mediaUrl(thumbnail, 160)} alt="" className="size-14 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0 text-sm">
                    {report.type === 'user' ? <UserChip user={content} link={false} /> : <p className="line-clamp-3 break-words">{summary(content) || (content.video ? 'Video' : 'No text')}</p>}
                    {authorOf(content)?.name && <p className="mt-1 text-xs text-muted">by {authorOf(content).name}</p>}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl bg-ink/[0.04] p-3 text-sm text-muted">This content was already removed.</p>
              )}
              {report.note && <p className="text-sm italic text-ink/80">“{report.note}”</p>}
              <p className="text-xs text-muted">Reported by {report.reporter?.name ?? 'a deleted account'}</p>
              <div className="flex flex-wrap gap-2">
                {content && LINKS[report.type] && (
                  <Button size="sm" variant="secondary" icon={ExternalLink} to={LINKS[report.type](content)}>
                    View
                  </Button>
                )}
                {content && (
                  <Button size="sm" variant="danger" icon={Trash} loading={busy === `${report._id}remove`} disabled={Boolean(busy)} onClick={() => resolve(report, 'remove')}>
                    {report.type === 'user' ? 'Delete account' : 'Remove'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" icon={X} loading={busy === `${report._id}dismiss`} disabled={Boolean(busy)} onClick={() => resolve(report, 'dismiss')}>
                  Dismiss
                </Button>
              </div>
            </article>
          </Reveal>
        );
      })}
      {reports.loading && <ListSkeleton count={2} />}
      <LoadMore hasMore={reports.hasMore} loading={reports.loading} onLoad={reports.loadMore} />
    </div>
  );
}
