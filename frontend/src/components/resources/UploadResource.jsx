import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useUploadProgress } from '../../hooks/useUploadProgress';
import api, { toFormData } from '../../lib/api';
import { MAX_RESOURCE_MB, RESOURCE_ACCEPT, RESOURCE_KINDS, SEMESTERS } from '../../lib/constants';
import { fileSize } from '../../lib/format';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Sheet from '../ui/Sheet';
import UploadBar from '../ui/UploadBar';

const EMPTY = { title: '', description: '', kind: 'notes', semester: 1, subject: '' };

export default function UploadResource({ open, onClose, onUploaded }) {
  const toast = useToast();
  const upload = useUploadProgress();
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const pick = (event) => {
    const [picked] = event.target.files;
    if (picked && picked.size > MAX_RESOURCE_MB * 1024 * 1024) return toast.error(`Files can be up to ${MAX_RESOURCE_MB} MB`);
    setFile(picked ?? null);
    if (picked && !form.title) setForm((current) => ({ ...current, title: picked.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      onUploaded(await api.post('/resources', toFormData({ ...form, file }), upload.config));
      toast.success('Thanks for sharing!');
      setForm(EMPTY);
      setFile(null);
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
      upload.reset();
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Share a resource">
      <form onSubmit={submit} className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-6 text-center text-sm text-muted transition hover:border-brand hover:text-brand">
          <Upload size={24} />
          {file ? (
            <span className="break-all font-medium text-ink">
              {file.name} · {fileSize(file.size)}
            </span>
          ) : (
            <span>PDF, DWG, DXF, XLSX, ZIP or images · up to {MAX_RESOURCE_MB} MB</span>
          )}
          <input type="file" accept={RESOURCE_ACCEPT} hidden onChange={pick} />
        </label>
        <Field label="Title">
          <input value={form.title} onChange={set('title')} required maxLength={120} className="input" placeholder="Climatology notes, unit 3" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={form.kind} onChange={set('kind')} className="input">
              {RESOURCE_KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Semester">
            <select value={form.semester} onChange={set('semester')} className="input">
              {SEMESTERS.map((semester) => (
                <option key={semester.value} value={semester.value}>
                  {semester.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Subject (optional)">
          <input value={form.subject} onChange={set('subject')} maxLength={80} className="input" placeholder="Building construction" />
        </Field>
        <Field label="Description (optional)">
          <textarea value={form.description} onChange={set('description')} rows={3} maxLength={1000} className="input resize-none" />
        </Field>
        <UploadBar progress={upload.progress} />
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!file}>
          Upload
        </Button>
      </form>
    </Sheet>
  );
}
