import { useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api, { toFormData } from '../../lib/api';
import { FIRM_SIZES } from '../../lib/constants';
import { compressImage } from '../../lib/files';
import { mediaUrl } from '../../lib/format';
import Button from '../ui/Button';
import Field from '../ui/Field';
import ImagePicker from '../ui/ImagePicker';

function FilePick({ label, onPick }) {
  return (
    <label className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line px-3 text-sm text-muted transition hover:border-brand hover:text-brand">
      {label}
      <input type="file" accept="image/*" hidden onChange={async (event) => event.target.files[0] && onPick(await compressImage(event.target.files[0]))} />
    </label>
  );
}

/** Create or edit a firm page, including logo, cover and gallery uploads. */
export default function FirmForm({ firm, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: firm?.name ?? '', city: firm?.city ?? '', size: firm?.size ?? '1-10', website: firm?.website ?? '', about: firm?.about ?? '' });
  const [files, setFiles] = useState({ logo: null, cover: null, gallery: [] });
  const [removeGallery, setRemoveGallery] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const body = toFormData({ ...form, ...files, ...(firm && { removeGallery }) });
      const saved = firm ? await api.patch(`/firms/${firm._id}`, body) : await api.post('/firms', body);
      toast.success(firm ? 'Firm page updated' : 'Firm page created');
      onSaved(saved);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Firm name">
        <input value={form.name} onChange={set('name')} required minLength={2} maxLength={100} className="input" placeholder="Studio Mud" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City">
          <input value={form.city} onChange={set('city')} maxLength={60} className="input" placeholder="Bengaluru" />
        </Field>
        <Field label="Team size">
          <select value={form.size} onChange={set('size')} className="input">
            {FIRM_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} people
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Website">
        <input value={form.website} onChange={set('website')} maxLength={300} className="input" placeholder="studiomud.in" />
      </Field>
      <Field label="About">
        <textarea value={form.about} onChange={set('about')} rows={4} maxLength={3000} className="input resize-none" placeholder="What you design, your values, the kind of people you hire" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field as="div" label="Logo" hint={files.logo?.name}>
          <FilePick label={firm?.logo ? 'Replace logo' : 'Upload logo'} onPick={(logo) => setFiles((current) => ({ ...current, logo }))} />
        </Field>
        <Field as="div" label="Cover" hint={files.cover?.name}>
          <FilePick label={firm?.cover ? 'Replace cover' : 'Upload cover'} onPick={(cover) => setFiles((current) => ({ ...current, cover }))} />
        </Field>
      </div>
      {firm?.gallery.length > 0 && (
        <Field as="div" label="Current gallery">
          <div className="grid grid-cols-4 gap-2">
            {firm.gallery
              .filter((url) => !removeGallery.includes(url))
              .map((url) => (
                <div key={url} className="relative aspect-square">
                  <img src={mediaUrl(url, 200)} alt="" className="size-full rounded-xl object-cover" />
                  <button type="button" aria-label="Remove photo" onClick={() => setRemoveGallery((list) => [...list, url])} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white">
                    <X size={13} />
                  </button>
                </div>
              ))}
          </div>
        </Field>
      )}
      <Field as="div" label="Add gallery photos">
        <ImagePicker files={files.gallery} onChange={(gallery) => setFiles((current) => ({ ...current, gallery }))} max={12} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {firm ? 'Save changes' : 'Create firm page'}
      </Button>
    </form>
  );
}
