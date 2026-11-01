import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectFields from '../components/portfolio/ProjectFields';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import ImagePicker from '../components/ui/ImagePicker';
import PageHeader from '../components/ui/PageHeader';
import Toggle from '../components/ui/Toggle';
import UploadBar from '../components/ui/UploadBar';
import { useToast } from '../context/ToastContext';
import { useUploadProgress } from '../hooks/useUploadProgress';
import api, { toFormData } from '../lib/api';

export default function NewProject() {
  const navigate = useNavigate();
  const toast = useToast();
  const upload = useUploadProgress();
  const [form, setForm] = useState({ title: '', category: 'Residential', year: new Date().getFullYear(), site: '', tools: [], description: '', critiqueOpen: false, critiquePrompt: '' });
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const project = await api.post('/projects', toFormData({ ...form, images }), upload.config);
      toast.success('Project pinned up!');
      navigate(`/projects/${project._id}`, { replace: true });
    } catch (error) {
      toast.error(error.message);
      upload.reset();
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New project" subtitle="Up to 8 images. The first one becomes the cover." back="/explore" />
      <form onSubmit={submit} className="card space-y-5 p-4 md:p-6">
        <Field as="div" label="Images">
          <ImagePicker files={images} onChange={setImages} max={8} />
        </Field>
        <ProjectFields form={form} set={set} />
        <Toggle checked={form.critiqueOpen} onChange={set('critiqueOpen')} label="Ask for critique" hint="Others can rate concept, planning, presentation and technical quality." />
        {form.critiqueOpen && (
          <Field label="What feedback do you want? (optional)">
            <input value={form.critiquePrompt} onChange={(event) => set('critiquePrompt')(event.target.value)} maxLength={300} className="input" placeholder="Is the circulation clear at ground level?" />
          </Field>
        )}
        <UploadBar progress={upload.progress} />
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!images.length}>
          Publish project
        </Button>
      </form>
    </div>
  );
}
