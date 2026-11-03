import { useState } from 'react';
import { Download, MessageSquare, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';
import StatusChip, { downloadResume } from '../components/jobs/StatusChip';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Field from '../components/ui/Field';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import Sheet from '../components/ui/Sheet';
import { ListSkeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import UserChip from '../components/ui/UserChip';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { usePaged } from '../hooks/usePaged';
import api from '../lib/api';
import { APPLICATION_STATUSES } from '../lib/constants';
import { timeAgo } from '../lib/format';

const STAGES = APPLICATION_STATUSES.filter(({ value }) => value !== 'withdrawn');

/** The value a datetime-local input needs, in the viewer's time zone. */
const localInput = (date) => (date ? new Date(new Date(date).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '');

/** The people hiring for a role move each applicant through the stages; applicants are notified of every move. */
export default function Applicants() {
  const { id } = useParams();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [scheduling, setScheduling] = useState(null);
  const { data: summary, reload: reloadCounts } = useApi(`/jobs/${id}/applications`, { limit: 1 });
  const list = usePaged(`/jobs/${id}/applications`, { status });

  const move = async (application, next, interview = {}) => {
    try {
      const saved = await api.patch(`/jobs/applications/${application._id}`, { status: next, ...interview });
      list.setItems((items) => (status && status !== next ? items.filter((item) => item._id !== saved._id) : items.map((item) => (item._id === saved._id ? { ...item, ...saved, applicant: item.applicant } : item))));
      reloadCounts();
      toast.success(`Moved to ${STAGES.find((stage) => stage.value === next).label}`);
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const pick = (application) => (event) => {
    const next = event.target.value;
    if (next === 'interview') setScheduling({ application, at: localInput(application.interview?.at), note: application.interview?.note ?? '' });
    else move(application, next);
  };

  const schedule = async (event) => {
    event.preventDefault();
    const { application, at, note } = scheduling;
    if (await move(application, 'interview', { interviewAt: new Date(at).toISOString(), interviewNote: note })) setScheduling(null);
  };

  const counts = summary?.counts ?? {};
  const tabs = [{ value: '', label: 'All', count: STAGES.reduce((sum, stage) => sum + (counts[stage.value] ?? 0), 0) }, ...STAGES.map((stage) => ({ ...stage, count: counts[stage.value] ?? 0 }))];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Applicants" subtitle={summary ? `${summary.job.title} · ${summary.job.company}` : ' '} back={`/jobs/${id}`} />
      <Tabs tabs={tabs} value={status} onChange={setStatus} className="mb-4" />
      <div className="space-y-3">
        {list.items.map((application) => (
          <article key={application._id} className="card space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <UserChip user={application.applicant} sub={`Applied ${timeAgo(application.createdAt)}`} size={44} />
              <StatusChip status={application.status} />
            </div>
            {application.note && <p className="whitespace-pre-line break-words rounded-2xl bg-ink/5 p-3 text-sm">{application.note}</p>}
            {application.status === 'interview' && application.interview?.at && (
              <p className="text-sm">
                Interview on <b>{new Date(application.interview.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</b>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" icon={Download} onClick={() => downloadResume(application).catch((error) => toast.error(error.message))}>
                Resume
              </Button>
              <Button to={`/messages/${application.applicant._id}`} variant="ghost" size="sm" icon={MessageSquare}>
                Message
              </Button>
              {application.status !== 'withdrawn' && (
                <label className="ml-auto flex items-center gap-2 text-sm text-muted">
                  Stage
                  <select value={application.status} onChange={pick(application)} className="input h-9 w-auto py-0">
                    {STAGES.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </article>
        ))}
        {list.loading && <ListSkeleton count={2} lines={2} />}
        {list.error && <EmptyState icon={Users} title="Can't show applicants" text={list.error.message} />}
        {!list.loading && !list.error && !list.items.length && <EmptyState icon={Users} title={status ? 'Nobody at this stage' : 'No applications yet'} text="New applications appear here, and you get a notification for each one." />}
        <LoadMore hasMore={list.hasMore} loading={list.loading} onLoad={list.loadMore} />
      </div>
      <Sheet open={Boolean(scheduling)} onClose={() => setScheduling(null)} title="Schedule an interview">
        {scheduling && (
          <form onSubmit={schedule} className="space-y-4">
            <Field label="Date and time">
              <input type="datetime-local" required value={scheduling.at} onChange={(event) => setScheduling((current) => ({ ...current, at: event.target.value }))} className="input" />
            </Field>
            <Field label="Details for the applicant" hint="Optional: where, or a meeting link">
              <input value={scheduling.note} maxLength={300} onChange={(event) => setScheduling((current) => ({ ...current, note: event.target.value }))} className="input" placeholder="Studio, 2nd floor, or a video call link" />
            </Field>
            <Button type="submit" size="lg" className="w-full">
              Schedule and notify
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
