import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import api, { toFormData } from '../../lib/api';
import { fileSize } from '../../lib/format';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Sheet from '../ui/Sheet';

const MAX_MB = 3;

/** Applies to a role in Arcella with a resume and an optional note to the people hiring. */
export default function ApplySheet({ job, open, onClose, onApplied }) {
  const toast = useToast();
  const [resume, setResume] = useState(null);
  const { data: savedResume } = useApi(open ? '/users/me/resume' : null);
  const saved = savedResume?.resume;
  const [useSaved, setUseSaved] = useState(true);
  const sending = useSaved && saved && !resume;
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = (event) => {
    const [picked] = event.target.files;
    if (picked && picked.size > MAX_MB * 1024 * 1024) return toast.error(`Resumes can be up to ${MAX_MB} MB`);
    setResume(picked ?? null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!resume && !sending) return toast.error('Attach your resume first');
    setBusy(true);
    try {
      onApplied(await api.post(`/jobs/${job._id}/applications`, toFormData(sending ? { savedResume: true, note } : { resume, note })));
      toast.success('Application sent');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Apply to ${job.company}`}>
      <form onSubmit={submit} className="space-y-4">
        {saved && !resume && (
          <label className="flex items-center gap-3 rounded-2xl border border-line p-3 text-sm">
            <input type="checkbox" checked={useSaved} onChange={(event) => setUseSaved(event.target.checked)} className="size-4 accent-[var(--brand)]" />
            <span className="min-w-0 flex-1">
              Use my saved resume <b className="break-all">{saved.name}</b>
            </span>
          </label>
        )}
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-6 text-center text-sm text-muted transition hover:border-brand hover:text-brand">
          <FileText size={24} />
          {resume ? (
            <span className="break-all font-medium text-ink">
              {resume.name} · {fileSize(resume.size)}
            </span>
          ) : (
            <span>{saved && useSaved ? 'Or attach a different resume' : 'Resume'}: PDF or Word, up to {MAX_MB} MB</span>
          )}
          <input type="file" accept=".pdf,.doc,.docx" hidden onChange={pick} aria-label="Resume" />
        </label>
        <Field label="Note to the hiring team" hint="Optional">
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={1500} className="input resize-none" placeholder="Why this role, and what you'd bring" />
        </Field>
        <p className="text-xs text-muted">Only the people hiring for this role can see your resume. You can withdraw at any time.</p>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Send application
        </Button>
      </form>
    </Sheet>
  );
}
