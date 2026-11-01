import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { SUBJECTS } from '../../lib/constants';
import Button from '../ui/Button';
import Chips from '../ui/Chips';
import Field from '../ui/Field';
import Sheet from '../ui/Sheet';

export default function AskSheet({ open, onClose }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', body: '', subject: 'Design' });
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const question = await api.post('/questions', form);
      toast.success('Question posted');
      onClose();
      navigate(`/qa/${question._id}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Ask the community">
      <form onSubmit={submit} className="space-y-4">
        <Field as="div" label="Subject">
          <Chips options={SUBJECTS} value={form.subject} onChange={(subject) => setForm((current) => ({ ...current, subject }))} allLabel={null} bleed={false} />
        </Field>
        <Field label="Your question" hint="At least 10 characters">
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required minLength={10} maxLength={160} className="input" placeholder="How do you calculate staircase risers for a 3.2 m floor?" />
        </Field>
        <Field label="Details (optional)">
          <textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} rows={5} maxLength={5000} className="input resize-none" placeholder="Add context: semester, what you tried, constraints" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Post question
        </Button>
      </form>
    </Sheet>
  );
}
