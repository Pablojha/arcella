import { useState } from 'react';
import { FileUp, Lock } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useUploadProgress } from '../../hooks/useUploadProgress';
import api, { toFormData } from '../../lib/api';
import { DOC_TYPES } from '../../lib/constants';
import { compressImage } from '../../lib/files';
import { fileSize } from '../../lib/format';
import Button from '../ui/Button';
import Field from '../ui/Field';
import UploadBar from '../ui/UploadBar';

const MAX_MB = 5;

/** Uploads an ID card, marksheet or degree for review by admins and college moderators. */
export default function DocumentVerify({ details, onSubmitted }) {
  const toast = useToast();
  const upload = useUploadProgress();
  const [docType, setDocType] = useState(details.role === 'alumni' ? 'degree' : 'id_card');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = async (event) => {
    const [picked] = event.target.files;
    event.target.value = '';
    if (!picked) return;
    const ready = picked.type.startsWith('image/') ? await compressImage(picked, 2400, 0.9) : picked;
    if (ready.size > MAX_MB * 1024 * 1024) return toast.error(`The document must be under ${MAX_MB} MB`);
    setFile(ready);
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/verification/document', toFormData({ ...details, docType, document: file }), upload.config);
      onSubmitted();
    } catch (error) {
      toast.error(error.message);
      upload.reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Document">
        <select value={docType} onChange={(event) => setDocType(event.target.value)} className="input">
          {DOC_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-7 text-center text-sm text-muted transition hover:border-brand hover:text-brand">
        <FileUp size={26} />
        {file ? <span className="break-all font-medium text-ink">{file.name} · {fileSize(file.size)}</span> : <span>Photo or PDF, up to {MAX_MB} MB</span>}
        <input type="file" accept="image/*,.pdf" hidden onChange={pick} />
      </label>
      <p className="flex gap-2 rounded-xl bg-brand/10 px-3.5 py-3 text-xs text-ink/80">
        <Lock size={14} className="mt-px shrink-0 text-brand" />
        Only site admins and your college's moderators can see this document, and it is deleted as soon as it has been reviewed.
      </p>
      <UploadBar progress={upload.progress} />
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!file}>
        Submit for review
      </Button>
    </form>
  );
}
