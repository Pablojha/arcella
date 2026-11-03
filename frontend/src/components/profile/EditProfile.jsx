import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { SKILLS, SOFTWARE, VISIBILITY } from '../../lib/constants';
import CertificationsEditor from './CertificationsEditor';
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
  languages: user.languages ?? [],
  certifications: (user.certifications ?? []).map(({ _id, ...item }) => ({ ...item, key: _id })),
  contact: { phone: user.contact?.phone ?? '', emailVisibility: user.contact?.emailVisibility ?? 'nobody', phoneVisibility: user.contact?.phoneVisibility ?? 'nobody' },
});

function VisibilitySelect({ value, onChange, label }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="input h-10 w-auto">
      {VISIBILITY.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

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
      const { user: updated } = await api.patch('/users/me', { ...form, certifications: form.certifications.map(({ key, ...item }) => item) });
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
        <Field as="div" label="Languages">
          <TagInput value={form.languages} onChange={set('languages')} suggestions={['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Bengali']} max={10} placeholder="English, Hindi…" />
        </Field>
        <Field as="div" label="Certifications">
          <CertificationsEditor value={form.certifications} onChange={set('certifications')} />
        </Field>
        <Field as="div" label="Contact" hint="Your sign-in email and a phone number, each shown only to the people you choose">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{user.email}</span>
              <VisibilitySelect label="Who sees your email" value={form.contact.emailVisibility} onChange={(emailVisibility) => set('contact')({ ...form.contact, emailVisibility })} />
            </div>
            <div className="flex items-center gap-3">
              <input value={form.contact.phone} onChange={(event) => set('contact')({ ...form.contact, phone: event.target.value })} maxLength={20} inputMode="tel" aria-label="Phone" className="input min-w-0 flex-1" placeholder="Phone (optional)" />
              <VisibilitySelect label="Who sees your phone" value={form.contact.phoneVisibility} onChange={(phoneVisibility) => set('contact')({ ...form.contact, phoneVisibility })} />
            </div>
          </div>
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
