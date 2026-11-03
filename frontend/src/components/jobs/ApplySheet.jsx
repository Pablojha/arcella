import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
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
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = (event) => {
    const [picked] = event.target.files;
    if (picked && picked.size > MAX_MB * 1024 * 1024) return toast.error(`Resumes can be up to ${MAX_MB} MB`);
    setResume(picked ?? null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!resume) return toast.error('Attach your resume first');
    setBusy(true);
    try {
      onApplied(await api.post(`/jobs/${job._id}/applications`, toFormData({ resume, note })));
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
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-6 text-center text-sm text-muted transition hover:border-brand hover:text-brand">
          <FileText size={24} />
          {resume ? (
            <span className="break-all font-medium text-ink">
              {resume.name} · {fileSize(resume.size)}
            </span>
          ) : (
            <span>Resume: PDF or Word, up to {MAX_MB} MB</span>
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
