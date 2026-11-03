import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowBigUp, CircleCheck, Flag, MessageCircleQuestionMark, Trash } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ReportSheet from '../components/ReportSheet';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import UserChip from '../components/ui/UserChip';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import api from '../lib/api';
import { plural, timeAgo } from '../lib/format';

function IconAction({ icon: Icon, label, onClick }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-accent/10 hover:text-accent">
      <Icon size={15} />
    </button>
  );
}

function Vote({ item, onVote }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={onVote}
      aria-pressed={item.upvoted}
      className={`flex w-12 shrink-0 flex-col items-center rounded-2xl py-1.5 transition ${item.upvoted ? 'bg-brand text-on-brand' : 'bg-ink/5 text-ink/70 hover:bg-ink/10'}`}
    >
      <ArrowBigUp size={22} className={item.upvoted ? 'fill-current' : ''} aria-hidden="true" />
      <span className="sr-only">Upvote, votes:</span>
      <span className="font-display text-sm font-bold">{item.upvotesCount}</span>
    </motion.button>
  );
}

export default function QuestionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, setData, loading, error } = useApi(`/questions/${id}`);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(null);

  if (loading) return <Skeleton className="mx-auto h-72 max-w-3xl rounded-3xl" />;
  if (error) return <EmptyState icon={MessageCircleQuestionMark} title="Question not found" text={error.message} />;

  const { question, answers } = data;
  const asker = question.author?._id === user._id;
  const run = async (request) => {
    try {
      return await request();
    } catch (requestError) {
      toast.error(requestError.message);
      return null;
    }
  };

  const voteQuestion = async () => {
    const result = await run(() => api.post(`/questions/${id}/upvote`));
    if (result) setData((current) => ({ ...current, question: { ...current.question, upvoted: result.upvoted, upvotesCount: result.upvotesCount } }));
  };

  const updateAnswer = (answerId, changes) => setData((current) => ({ ...current, answers: current.answers.map((item) => (item._id === answerId ? { ...item, ...changes } : item)) }));

  const voteAnswer = async (answerId) => {
    const result = await run(() => api.post(`/questions/${id}/answers/${answerId}/upvote`));
    if (result) updateAnswer(answerId, { upvoted: result.upvoted, upvotesCount: result.upvotesCount });
  };

  const accept = async (answerId) => {
    const result = await run(() => api.post(`/questions/${id}/answers/${answerId}/accept`));
    if (result) setData((current) => ({ ...current, question: { ...current.question, accepted: result.accepted } }));
  };

  const removeAnswer = async (answerId) => {
    if (!window.confirm('Delete this answer?')) return;
    if (await run(() => api.delete(`/questions/${id}/answers/${answerId}`))) setData((current) => ({ ...current, answers: current.answers.filter((item) => item._id !== answerId) }));
  };

  const removeQuestion = async () => {
    if (!window.confirm('Delete this question and all its answers?')) return;
    if (await run(() => api.delete(`/questions/${id}`))) navigate('/qa', { replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const created = await run(() => api.post(`/questions/${id}/answers`, { body: answer }));
    if (created) {
      setData((current) => ({ ...current, answers: [...current.answers, created] }));
      setAnswer('');
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={question.subject} back="/qa" />
      <article className="card flex gap-4 p-4 md:p-6">
        <Vote item={question} onVote={voteQuestion} />
        <div className="min-w-0 flex-1 space-y-3">
          <h1 className="font-display text-xl font-bold leading-snug tracking-tight md:text-2xl">{question.title}</h1>
          {question.body && <p className="whitespace-pre-line break-words leading-relaxed">{question.body}</p>}
          <div className="flex items-center justify-between gap-3">
            <UserChip user={question.author} sub={`Asked ${timeAgo(question.createdAt)}`} size={34} />
            {(asker || user.isAdmin) && <IconAction icon={Trash} label="Delete question" onClick={removeQuestion} />}
            {!asker && <IconAction icon={Flag} label="Report question" onClick={() => setReporting({ type: 'question', id: question._id, label: 'question' })} />}
          </div>
        </div>
      </article>

      <h2 className="font-display text-lg font-semibold">{plural(answers.length, 'answer')}</h2>
      {answers.map((item) => {
        const accepted = item._id === question.accepted;
        return (
          <motion.article key={item._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`card flex gap-4 p-4 md:p-5 ${accepted ? 'border-brand ring-4 ring-brand/10' : ''}`}>
            <Vote item={item} onVote={() => voteAnswer(item._id)} />
            <div className="min-w-0 flex-1 space-y-3">
              {accepted && (
                <span className="chip bg-brand/10 text-brand">
                  <CircleCheck size={13} /> Accepted answer
                </span>
              )}
              <p className="whitespace-pre-line break-words leading-relaxed">{item.body}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <UserChip user={item.author} sub={timeAgo(item.createdAt)} size={32} />
                <div className="flex items-center gap-1">
                  {asker && (
                    <Button size="sm" variant={accepted ? 'secondary' : 'ghost'} icon={CircleCheck} onClick={() => accept(item._id)}>
                      {accepted ? 'Unaccept' : 'Accept'}
                    </Button>
                  )}
                  {(item.author?._id === user._id || user.isAdmin) && <IconAction icon={Trash} label="Delete answer" onClick={() => removeAnswer(item._id)} />}
                  {item.author?._id !== user._id && <IconAction icon={Flag} label="Report answer" onClick={() => setReporting({ type: 'answer', id: item._id, label: 'answer' })} />}
                </div>
              </div>
            </div>
          </motion.article>
        );
      })}

      <form onSubmit={submit} className="card space-y-3 p-4 md:p-5">
        <h3 className="font-semibold">Your answer</h3>
        <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={4} maxLength={5000} required className="input resize-none" placeholder="Share what worked for you, with specifics." />
        <Button type="submit" loading={busy} disabled={!answer.trim()}>
          Post answer
        </Button>
      </form>
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}
