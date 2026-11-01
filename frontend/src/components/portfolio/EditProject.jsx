import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Sheet from '../ui/Sheet';
import ProjectFields from './ProjectFields';

const EDITABLE = ['title', 'category', 'year', 'site', 'tools', 'description', 'critiquePrompt'];

export default function EditProject({ project, open, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    title: project.title,
    category: project.category,
    year: project.year ?? '',
    site: project.site ?? '',
    tools: project.tools ?? [],
    description: project.description ?? '',
    critiquePrompt: project.critiquePrompt ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await api.patch(`/projects/${project._id}`, form);
      onSaved(Object.fromEntries(EDITABLE.map((key) => [key, updated[key]])));
      toast.success('Project updated');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit project" size="lg">
      <form onSubmit={save} className="space-y-4">
        <ProjectFields form={form} set={set} />
        <Field label="Feedback you want (optional)">
          <input value={form.critiquePrompt} onChange={(event) => set('critiquePrompt')(event.target.value)} maxLength={300} className="input" placeholder="Is the circulation clear at ground level?" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Save changes
        </Button>
      </form>
    </Sheet>
  );
}
