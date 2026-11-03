import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Chips from '../components/ui/Chips';
import Field from '../components/ui/Field';
import PageHeader from '../components/ui/PageHeader';
import Toggle from '../components/ui/Toggle';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api, { toFormData } from '../lib/api';
import { EVENT_TYPES } from '../lib/constants';
import { compressImage } from '../lib/files';
import { idOf, memberColleges } from '../lib/memberships';

/** datetime-local values are local time; send them as absolute ISO timestamps. */
const toIso = (local) => (local ? new Date(local).toISOString() : undefined);

export default function NewEvent() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const colleges = memberColleges(user);
  const fromGroup = colleges.find((college) => college._id === params.get('college'));
  const [form, setForm] = useState({ title: '', type: 'site-visit', description: '', start: '', end: '', online: false, venue: '', link: '', collegeOnly: Boolean(fromGroup), college: idOf(fromGroup ?? colleges[0]) ?? '' });
  const [cover, setCover] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const text = (key) => (event) => set(key)(event.target.value);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await api.post('/events', toFormData({ ...form, college: form.collegeOnly ? form.college : undefined, start: toIso(form.start), end: toIso(form.end), cover }));
      toast.success('Event published');
      navigate(`/events/${created._id}`, { replace: true });
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Host an event" subtitle="Bring the community together" back="/events" />
      <form onSubmit={submit} className="card space-y-5 p-4 md:p-6">
        <Field as="div" label="Type">
          <Chips options={EVENT_TYPES} value={form.type} onChange={set('type')} allLabel={null} bleed={false} />
        </Field>
        <Field label="Title">
          <input value={form.title} onChange={text('title')} required maxLength={120} className="input" placeholder="Site visit: Sabarmati Ashram" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts">
            <input type="datetime-local" value={form.start} onChange={text('start')} required className="input" />
          </Field>
          <Field label="Ends (optional)">
            <input type="datetime-local" value={form.end} onChange={text('end')} min={form.start} className="input" />
          </Field>
        </div>
        <Toggle checked={form.online} onChange={set('online')} label="Online event" />
        {form.online ? (
          <Field label="Joining link">
            <input value={form.link} onChange={text('link')} required maxLength={300} className="input" placeholder="meet.google.com/abc-defg-hij" />
          </Field>
        ) : (
          <Field label="Venue">
            <input value={form.venue} onChange={text('venue')} required maxLength={150} className="input" placeholder="Studio 3, Main block" />
          </Field>
        )}
        <Field label="Description">
          <textarea value={form.description} onChange={text('description')} rows={5} maxLength={3000} className="input resize-none" placeholder="Agenda, what to bring, who should come" />
        </Field>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted transition hover:border-brand hover:text-brand">
          <ImagePlus size={20} />
          <span className="truncate">{cover ? cover.name : 'Add a cover image (optional)'}</span>
          <input type="file" accept="image/*" hidden onChange={async (event) => event.target.files[0] && setCover(await compressImage(event.target.files[0]))} />
        </label>
        {colleges.length > 0 && (
          <Toggle checked={form.collegeOnly} onChange={set('collegeOnly')} label={colleges.length > 1 ? 'Only for one of my colleges' : `Only for ${colleges[0].short ?? colleges[0].name}`} hint="Visible only to the college's verified members." />
        )}
        {form.collegeOnly && colleges.length > 1 && (
          <Field label="College">
            <select value={form.college} onChange={text('college')} className="input">
              {colleges.map((college) => (
                <option key={college._id} value={college._id}>
                  {college.short ?? college.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Publish event
        </Button>
      </form>
    </div>
  );
}
