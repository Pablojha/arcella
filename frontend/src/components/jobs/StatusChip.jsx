import { APPLICATION_STATUSES } from '../../lib/constants';
import { saveBlob } from '../../lib/files';
import api from '../../lib/api';

/** An application's stage as a coloured chip. */
export default function StatusChip({ status }) {
  const { label, tone } = APPLICATION_STATUSES.find((item) => item.value === status) ?? APPLICATION_STATUSES[0];
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}

/** Resumes are private, so they are fetched with the session and handed to the browser as a file. */
export async function downloadResume(application) {
  saveBlob(await api.get(`/jobs/applications/${application._id}/resume`, { responseType: 'blob' }), application.resume?.name || 'resume.pdf');
}
