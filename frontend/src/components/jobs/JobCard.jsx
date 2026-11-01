import { Clock, IndianRupee, MapPin, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { JOB_TYPES } from '../../lib/constants';
import { formatDate, labelOf, timeAgo } from '../../lib/format';
import FirmLogo from '../ui/FirmLogo';

export default function JobCard({ job }) {
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
          {job.remote && (
            <span className="flex items-center gap-1">
              <Wifi size={12} /> Remote
            </span>
          )}
          {job.compensation && (
            <span className="flex items-center gap-1">
              <IndianRupee size={12} /> {job.compensation}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={12} /> {job.deadline ? `Apply by ${formatDate(job.deadline, { day: 'numeric', month: 'short' })}` : timeAgo(job.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
