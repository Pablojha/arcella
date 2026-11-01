import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Chips from '../components/ui/Chips';
import Field from '../components/ui/Field';
import PageHeader from '../components/ui/PageHeader';
import TagInput from '../components/ui/TagInput';
import Toggle from '../components/ui/Toggle';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import api from '../lib/api';
import { JOB_TYPES, SKILLS, SOFTWARE } from '../lib/constants';

export default function NewJob() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: myFirms } = useApi('/firms', { mine: true, limit: 50 });
  const [form, setForm] = useState({ title: '', type: 'internship', firm: '', company: '', location: '', remote: false, compensation: '', deadline: '', applyLink: '', skills: [], description: '' });
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const text = (key) => (event) => set(key)(event.target.value);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const job = await api.post('/jobs', form);
      toast.success('Job posted');
      navigate(`/jobs/${job._id}`, { replace: true });
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Post a job" subtitle="Reach students and young architects across India" back="/jobs" />
      <form onSubmit={submit} className="card space-y-5 p-4 md:p-6">
        <Field as="div" label="Type">
          <Chips options={JOB_TYPES} value={form.type} onChange={set('type')} allLabel={null} bleed={false} />
        </Field>
        <Field label="Title">
          <input value={form.title} onChange={text('title')} required maxLength={100} className="input" placeholder="Architectural intern (6 months)" />
        </Field>
        {myFirms?.items.length > 0 && (
          <Field label="Firm page" hint="Linking a firm page shows the role on that page too">
            <select value={form.firm} onChange={text('firm')} className="input">
              <option value="">Not linked to a firm page</option>
              {myFirms.items.map((firm) => (
                <option key={firm._id} value={firm._id}>
                  {firm.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {!form.firm && (
          <Field label="Company or organiser">
            <input value={form.company} onChange={text('company')} required maxLength={100} className="input" placeholder="Studio name, college or competition host" />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <input value={form.location} onChange={text('location')} maxLength={80} className="input" placeholder="Mumbai" />
          </Field>
          <Field label="Stipend or salary">
            <input value={form.compensation} onChange={text('compensation')} maxLength={60} className="input" placeholder="15,000 / month" />
          </Field>
          <Field label="Apply by">
            <input type="date" value={form.deadline} onChange={text('deadline')} className="input" />
          </Field>
          <Field label="Apply link or email">
            <input value={form.applyLink} onChange={text('applyLink')} required maxLength={300} className="input" placeholder="careers@studio.in" />
          </Field>
        </div>
        <Toggle checked={form.remote} onChange={set('remote')} label="Remote friendly" />
        <Field as="div" label="Skills">
          <TagInput value={form.skills} onChange={set('skills')} suggestions={[...SOFTWARE.slice(0, 6), ...SKILLS.slice(0, 4)]} max={15} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={text('description')} rows={6} maxLength={5000} className="input resize-none" placeholder="Responsibilities, who you're looking for, how to apply" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Publish
        </Button>
      </form>
    </div>
  );
}
