import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import api from '../../lib/api';
import { CRITERIA } from '../../lib/constants';
import { plural, timeAgo } from '../../lib/format';
import Button from '../ui/Button';
import Stars from '../ui/Stars';
import Toggle from '../ui/Toggle';
import UserChip from '../ui/UserChip';

function ScoreBar({ label, value }) {
  return (
    <div className="grid grid-cols-[96px_1fr_32px] items-center gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-ink/10">
        <motion.span className="block h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${(value / 5) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      </span>
      <span className="text-right font-semibold tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}

function CritiqueForm({ projectId, existing, onSaved }) {
  const toast = useToast();
  const [scores, setScores] = useState(existing?.scores ?? { concept: 0, planning: 0, presentation: 0, technical: 0 });
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const complete = CRITERIA.every(({ value }) => scores[value] > 0);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(`/projects/${projectId}/critiques`, { scores, comment });
      toast.success('Thanks for the critique!');
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-dashed border-line p-4">
      <p className="text-sm font-semibold">{existing ? 'Update your critique' : 'Give your critique'}</p>
      {CRITERIA.map(({ value, label }) => (
        <div key={value} className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">{label}</span>
          <Stars value={scores[value]} label={label} onChange={(score) => setScores((current) => ({ ...current, [value]: score }))} />
        </div>
      ))}
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} maxLength={1500} placeholder="What works? What would you push further?" className="input resize-none" />
      <Button type="submit" loading={busy} disabled={!complete}>
        {existing ? 'Update' : 'Submit critique'}
      </Button>
    </form>
  );
}

/** Owner asks for feedback; others rate four criteria and comment; averages shown as bars. */
export default function CritiquePanel({ project, onChange }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, reload } = useApi(`/projects/${project._id}/critiques`);
  const isOwner = user?._id === project.owner?._id;
  const mine = data?.items.find((item) => item.author?._id === user?._id);

  const toggleOpen = async (critiqueOpen) => {
    try {
      const updated = await api.patch(`/projects/${project._id}`, { critiqueOpen });
      onChange({ critiqueOpen: updated.critiqueOpen });
      toast.success(critiqueOpen ? 'Your project is open for critique' : 'Critique closed');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <section className="card space-y-5 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <MessageSquareText size={19} className="text-brand" /> Critique
        </h2>
        {data && <span className="text-sm text-muted">{plural(data.count, 'review')}</span>}
      </div>

      {isOwner && <Toggle checked={project.critiqueOpen} onChange={toggleOpen} label="Ask for feedback" hint="Let others rate concept, planning, presentation and technical quality." />}
      {project.critiqueOpen && project.critiquePrompt && <p className="rounded-xl bg-ink/[0.04] px-4 py-3 text-sm italic">“{project.critiquePrompt}”</p>}

      {data?.count > 0 && (
        <div className="space-y-2.5">
          {CRITERIA.map(({ value, label }) => (
            <ScoreBar key={value} label={label} value={data.averages[value]} />
          ))}
        </div>
      )}

      {project.critiqueOpen && !isOwner && (user ? <CritiqueForm key={mine?._id ?? 'new'} projectId={project._id} existing={mine} onSaved={reload} /> : <Button to="/login" variant="secondary">Log in to critique</Button>)}
      {!project.critiqueOpen && !data?.count && <p className="text-sm text-muted">{isOwner ? 'Turn on feedback to get critiques from the community.' : 'The owner has not asked for critique on this project.'}</p>}

      {data?.items.map((item) => (
        <div key={item._id} className="space-y-2 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <UserChip user={item.author} sub={timeAgo(item.createdAt)} size={36} />
            <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
              {(CRITERIA.reduce((sum, { value }) => sum + item.scores[value], 0) / CRITERIA.length).toFixed(1)} / 5
            </span>
          </div>
          {item.comment && <p className="whitespace-pre-line break-words text-sm">{item.comment}</p>}
        </div>
      ))}
    </section>
  );
}
