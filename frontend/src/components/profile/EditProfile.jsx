import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { SKILLS, SOFTWARE } from '../../lib/constants';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Sheet from '../ui/Sheet';
import TagInput from '../ui/TagInput';
import ExperienceEditor from './ExperienceEditor';

const fromUser = (user) => ({
  name: user.name,
  headline: user.headline ?? '',
  bio: user.bio ?? '',
  location: user.location ?? '',
  website: user.website ?? '',
  software: user.software ?? [],
  skills: user.skills ?? [],
  experience: (user.experience ?? []).map((item) => ({ ...item, key: item._id })),
});

export default function EditProfile({ open, onClose, onSaved }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(() => fromUser(user));
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const text = (key) => (event) => set(key)(event.target.value);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { user: updated } = await api.patch('/users/me', form);
      setUser(updated);
      onSaved(updated);
      toast.success('Profile updated');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit profile" size="lg">
      <form onSubmit={save} className="space-y-4">
        <Field label="Name">
          <input value={form.name} onChange={text('name')} required minLength={2} maxLength={60} className="input" />
        </Field>
        <Field label="Headline" hint="One line: “B.Arch, 4th year at CEPT” or “Architect at Studio Lotus”">
          <input value={form.headline} onChange={text('headline')} maxLength={120} className="input" />
        </Field>
        <Field label="About">
          <textarea value={form.bio} onChange={text('bio')} rows={4} maxLength={1500} className="input resize-none" placeholder="What kind of spaces excite you?" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <input value={form.location} onChange={text('location')} maxLength={80} className="input" placeholder="Ahmedabad" />
          </Field>
          <Field label="Website or portfolio link">
            <input value={form.website} onChange={text('website')} maxLength={300} className="input" placeholder="behance.net/you" />
          </Field>
        </div>
        <Field as="div" label="Software">
          <TagInput value={form.software} onChange={set('software')} suggestions={SOFTWARE} max={25} placeholder="Revit, Rhino…" />
        </Field>
        <Field as="div" label="Skills">
          <TagInput value={form.skills} onChange={set('skills')} suggestions={SKILLS} max={30} placeholder="Model making, BIM…" />
        </Field>
        <Field as="div" label="Experience">
          <ExperienceEditor value={form.experience} onChange={set('experience')} />
        </Field>
        <div className="sticky bottom-0 -mx-5 border-t border-line bg-card px-5 pt-3">
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Save profile
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
