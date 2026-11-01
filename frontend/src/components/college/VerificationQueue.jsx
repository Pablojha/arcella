import { useState } from 'react';
import { Check, ExternalLink, FileSearch, ShieldCheck, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import api from '../../lib/api';
import { COLLEGE_ROLES, DOC_TYPES } from '../../lib/constants';
import { labelOf, timeAgo } from '../../lib/format';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Reveal from '../ui/Reveal';
import Sheet from '../ui/Sheet';
import { ListSkeleton } from '../ui/Skeleton';
import UserChip from '../ui/UserChip';

/** Pending document verifications for the reviewer's colleges; documents are fetched privately as blobs. */
export default function VerificationQueue() {
  const toast = useToast();
  const { data, setData, loading } = useApi('/verification/queue');
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState('');

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const view = async (request) => {
    setBusy(`${request._id}view`);
    try {
      const blob = await api.get(`/verification/${request._id}/document`, { responseType: 'blob' });
      setPreview({ request, url: URL.createObjectURL(blob), pdf: blob.type === 'application/pdf' });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  const review = async (request, decision) => {
    setBusy(`${request._id}${decision}`);
    try {
      await api.post(`/verification/${request._id}/review`, { decision, note: notes[request._id] });
      setData((current) => ({ items: current.items.filter((item) => item._id !== request._id) }));
      toast.success(decision === 'approve' ? `${request.user?.name} is now verified` : 'Request rejected');
      closePreview();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  if (loading) return <ListSkeleton count={2} />;
  if (!data?.items.length) return <EmptyState icon={ShieldCheck} title="All caught up" text="New document verification requests will appear here." />;

  return (
    <div className="space-y-3">
      {data.items.map((request, index) => (
        <Reveal key={request._id} index={index}>
          <div className="card space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <UserChip user={request.user} sub={`${labelOf(COLLEGE_ROLES, request.role)}${request.batch ? ` · Batch ${request.batch}` : ''} · ${request.college?.short ?? request.college?.name}`} />
              <span className="shrink-0 text-xs text-muted">{timeAgo(request.createdAt)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{labelOf(DOC_TYPES, request.docType)}</span>
              <Button size="sm" variant="secondary" icon={FileSearch} loading={busy === `${request._id}view`} onClick={() => view(request)}>
                View document
              </Button>
            </div>
            <input value={notes[request._id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [request._id]: event.target.value }))} maxLength={300} placeholder="Note to the member (optional)" className="input" />
            <div className="flex gap-2">
              <Button size="sm" icon={Check} loading={busy === `${request._id}approve`} disabled={Boolean(busy)} onClick={() => review(request, 'approve')}>
                Approve
              </Button>
              <Button size="sm" variant="danger" icon={X} loading={busy === `${request._id}reject`} disabled={Boolean(busy)} onClick={() => review(request, 'reject')}>
                Reject
              </Button>
            </div>
          </div>
        </Reveal>
      ))}

      <Sheet open={Boolean(preview)} onClose={closePreview} title="Verification document" size="lg">
        {preview && (
          <div className="space-y-3">
            {preview.pdf ? <iframe src={preview.url} title="Document" className="h-[60dvh] w-full rounded-xl border border-line" /> : <img src={preview.url} alt="Verification document" className="max-h-[60dvh] w-full rounded-xl object-contain" />}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a href={preview.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-brand">
                <ExternalLink size={15} /> Open in new tab
              </a>
              <div className="flex gap-2">
                <Button size="sm" variant="danger" onClick={() => review(preview.request, 'reject')}>
                  Reject
                </Button>
                <Button size="sm" onClick={() => review(preview.request, 'approve')}>
                  Approve
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted">The document is deleted from Arcella as soon as you approve or reject it.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
