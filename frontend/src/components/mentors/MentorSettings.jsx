import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { MENTOR_TOPICS } from '../../lib/constants';
import Button from '../ui/Button';
import Field from '../ui/Field';
import TagInput from '../ui/TagInput';
import Toggle from '../ui/Toggle';

export default function MentorSettings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ enabled: false, topics: [], slots: [], about: '', ...user.mentor });
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { user: updated } = await api.put('/mentorship/settings', form);
      setUser(updated);
      toast.success(form.enabled ? 'You are now listed as a mentor' : 'Mentoring settings saved');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="card space-y-5 p-4 md:p-6">
      <Toggle checked={form.enabled} onChange={set('enabled')} label="Open to mentoring" hint="Students can find you and request sessions in your free slots." />
      <Field as="div" label="Topics you can help with">
        <TagInput value={form.topics} onChange={set('topics')} suggestions={MENTOR_TOPICS} max={10} placeholder="Portfolio review, thesis…" />
      </Field>
      <Field as="div" label="Free time slots" hint="For example: Sat 10–11 AM, Wed 7–8 PM (online)">
        <TagInput value={form.slots} onChange={set('slots')} max={10} placeholder="Add a slot and press Enter" />
      </Field>
      <Field label="A line about how you mentor (optional)">
        <textarea value={form.about} onChange={(event) => set('about')(event.target.value)} rows={3} maxLength={500} className="input resize-none" />
      </Field>
      <Button type="submit" loading={busy}>
        Save
      </Button>
    </form>
  );
}
