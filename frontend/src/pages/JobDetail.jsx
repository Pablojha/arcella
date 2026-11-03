import { useState } from 'react';
import { Bookmark, BriefcaseBusiness, Building2, CalendarClock, Download, ExternalLink, GraduationCap, IndianRupee, Lock, LockOpen, MapPin, Pencil, Send, Trash, Users } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ApplySheet from '../components/jobs/ApplySheet';
import StatusChip, { downloadResume } from '../components/jobs/StatusChip';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import FirmLogo from '../components/ui/FirmLogo';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import UserChip from '../components/ui/UserChip';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import api from '../lib/api';
import { EXPERIENCE, JOB_TYPES, WORKPLACES } from '../lib/constants';
import { formatDate, labelOf, safeHref, timeAgo } from '../lib/format';

const WHEN = { dateStyle: 'medium', timeStyle: 'short' };

export default function JobDetail() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: job, setData, loading, error } = useApi(`/jobs/${id}`);
  const [applying, setApplying] = useState(false);

  if (loading) return <Skeleton className="mx-auto h-80 max-w-3xl rounded-3xl" />;
  if (error) return <EmptyState icon={BriefcaseBusiness} title="This role is no longer available" text={error.message} />;

  const update = (changes) => setData((current) => ({ ...current, ...changes }));
  const run = async (action, success) => {
    try {
      await action();
      if (success) toast.success(success);
    } catch (actionError) {
      toast.error(actionError.message);
    }
  };

  const remove = () =>
    window.confirm('Remove this job post? Its applications are deleted too.') &&
    run(async () => {
      await api.delete(`/jobs/${id}`);
      navigate('/jobs?tab=hiring', { replace: true });
    }, 'Job removed');
  const toggleClosed = () => run(async () => update({ closed: (await api.patch(`/jobs/${id}`, { closed: !job.closed })).closed }), job.closed ? 'Reopened for applications' : 'Closed to new applications');
  const toggleSaved = () => run(async () => update(await api.post(`/jobs/${id}/save`)));
  const withdraw = () => window.confirm('Withdraw your application?') && run(async () => update({ application: await api.post(`/jobs/applications/${job.application._id}/withdraw`) }), 'Application withdrawn');

  const facts = [
    job.location && { icon: MapPin, text: job.location },
    { icon: Building2, text: labelOf(WORKPLACES, job.workplace) },
    job.experience && { icon: GraduationCap, text: labelOf(EXPERIENCE, job.experience) },
    job.compensation && { icon: IndianRupee, text: job.compensation },
    job.deadline && { icon: CalendarClock, text: `Apply by ${formatDate(job.deadline)}` },
  ].filter(Boolean);
  const { application } = job;
  const active = application && application.status !== 'withdrawn';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader as="p" title={labelOf(JOB_TYPES, job.type)} subtitle={`Posted ${timeAgo(job.createdAt)}`} back="/jobs" />
      {job.canManage && (
        <div className="card flex flex-wrap items-center gap-2 p-3">
          {!job.applyLink && (
            <Button to={`/jobs/${id}/applicants`} icon={Users} size="sm">
              Applicants ({job.applicationsCount})
            </Button>
          )}
          <Button to={`/jobs/${id}/edit`} variant="secondary" icon={Pencil} size="sm">
            Edit
          </Button>
          <Button variant="secondary" icon={job.closed ? LockOpen : Lock} size="sm" onClick={toggleClosed}>
            {job.closed ? 'Reopen' : 'Close'}
          </Button>
          <Button variant="danger" icon={Trash} size="sm" onClick={remove}>
            Remove
          </Button>
        </div>
      )}
      {active && (
        <div className="card space-y-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Your application</p>
            <StatusChip status={application.status} />
          </div>
          {application.status === 'interview' && application.interview?.at && (
            <p className="text-sm">
              Interview on <b>{new Date(application.interview.at).toLocaleString(undefined, WHEN)}</b>
              {application.interview.note && <span className="block text-muted">{application.interview.note}</span>}
            </p>
          )}
          <p className="text-xs text-muted">Sent {timeAgo(application.createdAt)}. You'll get a notification when it moves on.</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={Download} onClick={() => run(() => downloadResume(application))}>
              Your resume
            </Button>
            <Button variant="ghost" size="sm" onClick={withdraw}>
              Withdraw
            </Button>
          </div>
        </div>
      )}
      <article className="card space-y-5 p-5 md:p-7">
        <div className="flex items-start gap-4">
          <FirmLogo logo={job.firm?.logo} name={job.company} size={60} />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight">{job.title}</h1>
            {job.firm ? (
              <Link to={`/firms/${job.firm.slug}`} className="font-medium text-brand hover:underline">
                {job.company}
              </Link>
            ) : (
              <p className="font-medium text-muted">{job.company}</p>
            )}
            {job.closed && <p className="mt-1 text-sm font-semibold text-accent">No longer taking applications</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {facts.map(({ icon: Icon, text }) => (
            <span key={text} className="chip py-1.5">
              <Icon size={13} /> {text}
            </span>
          ))}
        </div>
        {job.description && <p className="whitespace-pre-line break-words leading-relaxed">{job.description}</p>}
        {job.skills?.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-muted">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <span key={skill} className="chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <UserChip user={job.postedBy} sub="Posted this role" size={36} />
          <div className="flex gap-2">
            <Button variant="secondary" icon={Bookmark} onClick={toggleSaved} aria-pressed={job.saved}>
              {job.saved ? 'Saved' : 'Save'}
            </Button>
            {!job.closed && !job.canManage && safeHref(job.applyLink) && (
              <Button href={safeHref(job.applyLink)} icon={ExternalLink} size="lg">
                Apply
              </Button>
            )}
            {!job.closed && !job.canManage && !job.applyLink && !active && (
              <Button icon={Send} size="lg" onClick={() => setApplying(true)}>
                Apply
              </Button>
            )}
          </div>
        </div>
      </article>
      <ApplySheet job={job} open={applying} onClose={() => setApplying(false)} onApplied={(sent) => update({ application: sent, applicationsCount: job.applicationsCount + 1 })} />
    </div>
  );
}
