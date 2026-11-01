import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { timeAgo } from '../../lib/format';

export default function QuestionCard({ question }) {
  const answered = question.answersCount > 0;
  return (
    <Link to={`/qa/${question._id}`} className="card flex gap-4 p-4 transition hover:border-ink/25">
      <div className="flex shrink-0 flex-col gap-1.5 text-center text-xs">
        <span className="w-14 rounded-xl bg-ink/5 py-1.5">
          <b className="block font-display text-base">{question.upvotesCount}</b>votes
        </span>
        <span className={`w-14 rounded-xl py-1.5 ${question.accepted ? 'bg-brand text-on-brand' : answered ? 'border border-brand text-brand' : 'border border-line text-muted'}`}>
          <b className="flex items-center justify-center gap-0.5 font-display text-base">
            {question.accepted && <Check size={13} strokeWidth={3} />}
            {question.answersCount}
          </b>
          answers
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug">{question.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="chip">{question.subject}</span>
          <span className="truncate">
            {question.author?.name} · {timeAgo(question.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
