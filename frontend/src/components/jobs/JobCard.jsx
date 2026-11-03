import { Building2, Clock, IndianRupee, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { JOB_TYPES, WORKPLACES } from '../../lib/constants';
import { formatDate, labelOf, timeAgo } from '../../lib/format';
import FirmLogo from '../ui/FirmLogo';

/** A role in a list; `showStatus` adds what the people hiring need: applicants and whether it is closed. */
export default function JobCard({ job, showStatus = false }) {
  return (
    <Link to={`/jobs/${job._id}`} className="card flex gap-3.5 p-4 transition hover:border-ink/25">
      <FirmLogo logo={job.firm?.logo} name={job.company} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{job.title}</h3>
          <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">{labelOf(JOB_TYPES, job.type)}</span>
        </div>
        <p className="truncate text-sm text-muted">{job.company}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {job.location}
            </span>
          )}
          {job.workplace && job.workplace !== 'onsite' && (
            <span className="flex items-center gap-1">
              <Building2 size={12} /> {labelOf(WORKPLACES, job.workplace)}
            </span>
          )}
          {job.compensation && (
            <span className="flex items-center gap-1">
              <IndianRupee size={12} /> {job.compensation}
            </span>
          )}
          {showStatus && !job.applyLink && (
            <span className="flex items-center gap-1 font-medium text-ink">
              <Users size={12} /> {job.applicationsCount} applicant{job.applicationsCount === 1 ? '' : 's'}
            </span>
          )}
          {showStatus && job.closed && <span className="font-semibold text-accent">Closed</span>}
          <span className="flex items-center gap-1">
            <Clock size={12} /> {job.deadline ? `Apply by ${formatDate(job.deadline, { day: 'numeric', month: 'short' })}` : timeAgo(job.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
