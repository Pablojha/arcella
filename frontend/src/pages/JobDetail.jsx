import { BriefcaseBusiness, CalendarClock, ExternalLink, IndianRupee, MapPin, Trash, Wifi } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import FirmLogo from '../components/ui/FirmLogo';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import UserChip from '../components/ui/UserChip';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import api from '../lib/api';
import { JOB_TYPES } from '../lib/constants';
import { formatDate, labelOf, timeAgo } from '../lib/format';

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: job, loading, error } = useApi(`/jobs/${id}`);

  if (loading) return <Skeleton className="mx-auto h-80 max-w-3xl rounded-3xl" />;
  if (error) return <EmptyState icon={BriefcaseBusiness} title="This role is no longer available" text={error.message} />;

  const remove = async () => {
    if (!window.confirm('Remove this job post?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      toast.success('Job removed');
      navigate('/jobs', { replace: true });
    } catch (removeError) {
      toast.error(removeError.message);
    }
  };

  const facts = [
    job.location && { icon: MapPin, text: job.location },
    job.remote && { icon: Wifi, text: 'Remote friendly' },
    job.compensation && { icon: IndianRupee, text: job.compensation },
    job.deadline && { icon: CalendarClock, text: `Apply by ${formatDate(job.deadline)}` },
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={labelOf(JOB_TYPES, job.type)} subtitle={`Posted ${timeAgo(job.createdAt)}`} back="/jobs" />
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
          </div>
        </div>
        {facts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {facts.map(({ icon: Icon, text }) => (
              <span key={text} className="chip py-1.5">
                <Icon size={13} /> {text}
              </span>
            ))}
          </div>
        )}
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
            {(job.postedBy?._id === user._id || user.isAdmin) && (
              <Button variant="danger" icon={Trash} onClick={remove}>
                Remove
              </Button>
            )}
            <Button href={job.applyLink} icon={ExternalLink} size="lg">
              Apply
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}
