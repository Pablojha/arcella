import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Chips from '../components/ui/Chips';
import Field from '../components/ui/Field';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import TagInput from '../components/ui/TagInput';
import Tabs from '../components/ui/Tabs';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import api from '../lib/api';
import { EXPERIENCE, JOB_TYPES, SKILLS, SOFTWARE, WORKPLACES } from '../lib/constants';

const EMPTY = { title: '', type: 'internship', firm: '', company: '', location: '', workplace: 'onsite', experience: '', compensation: '', deadline: '', applyLink: '', skills: [], description: '' };

/** The form's fields from a saved job. */
const fromJob = (job) => ({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, job[key] ?? EMPTY[key]])), firm: job.firm?._id ?? job.firm ?? '', deadline: job.deadline?.slice(0, 10) ?? '' });

/** Posts a new role, or edits one at /jobs/:id/edit. */
export default function NewJob() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: myFirms } = useApi('/firms', { mine: true, limit: 50 });
  const { data: existing } = useApi(id ? `/jobs/${id}` : null);
  const [form, setForm] = useState(() => ({ ...EMPTY, firm: params.get('firm') ?? '' }));
  const [external, setExternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const text = (key) => (event) => set(key)(event.target.value);

  useEffect(() => {
    if (!existing) return;
    setForm(fromJob(existing));
    setExternal(Boolean(existing.applyLink));
  }, [existing]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, applyLink: external ? form.applyLink : '' };
      const job = id ? await api.patch(`/jobs/${id}`, body) : await api.post('/jobs', body);
      toast.success(id ? 'Job updated' : 'Job posted');
      navigate(`/jobs/${job._id}`, { replace: true });
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  if (id && !existing) return <Skeleton className="mx-auto h-96 max-w-2xl rounded-3xl" />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={id ? 'Edit job' : 'Post a job'} subtitle="Reach students and young architects across India" back={id ? `/jobs/${id}` : '/jobs'} />
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
        <Field as="div" label="Workplace">
          <Chips options={WORKPLACES} value={form.workplace} onChange={set('workplace')} allLabel={null} bleed={false} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <input value={form.location} onChange={text('location')} maxLength={80} className="input" placeholder="Mumbai" />
          </Field>
          <Field label="Experience">
            <select value={form.experience} onChange={text('experience')} className="input">
              <option value="">Any</option>
              {EXPERIENCE.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stipend or salary">
            <input value={form.compensation} onChange={text('compensation')} maxLength={60} className="input" placeholder="15,000 / month" />
          </Field>
          <Field label="Apply by">
            <input type="date" value={form.deadline} onChange={text('deadline')} className="input" />
          </Field>
        </div>
        <Field as="div" label="How people apply">
          <Tabs
            variant="pill"
            value={external ? 'link' : 'arcella'}
            onChange={(value) => setExternal(value === 'link')}
            tabs={[
              { value: 'arcella', label: 'In Arcella' },
              { value: 'link', label: 'Your own link' },
            ]}
          />
          <p className="mt-2 text-xs text-muted">{external ? 'Applicants leave Arcella for your site or email.' : 'Applicants send their resume here, and you track them under Applicants.'}</p>
        </Field>
        {external && (
          <Field label="Apply link or email">
            <input value={form.applyLink} onChange={text('applyLink')} required maxLength={300} className="input" placeholder="careers@studio.in" />
          </Field>
        )}
        <Field as="div" label="Skills">
          <TagInput value={form.skills} onChange={set('skills')} suggestions={[...SOFTWARE.slice(0, 6), ...SKILLS.slice(0, 4)]} max={15} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={text('description')} rows={6} maxLength={5000} className="input resize-none" placeholder="Responsibilities and who you're looking for" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {id ? 'Save changes' : 'Publish'}
        </Button>
      </form>
    </div>
  );
}
