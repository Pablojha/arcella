import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const editProfile = (user) => `/u/${user.username}?edit=1`;

/** In priority order; the first unfinished step is offered as the next action. */
const STEPS = [
  { label: 'Verify your college', done: (user) => user.verified, to: () => '/college/verify' },
  { label: 'Add a profile photo', done: (user) => Boolean(user.avatar), to: (user) => `/u/${user.username}` },
  { label: 'Write a headline', done: (user) => Boolean(user.headline), to: editProfile },
  { label: 'List the software you use', done: (user) => user.software?.length > 0, to: editProfile },
  { label: 'Add your skills', done: (user) => user.skills?.length > 0, to: editProfile },
  { label: 'Tell people about yourself', done: (user) => Boolean(user.bio), to: editProfile },
  { label: 'Add an internship or job', done: (user) => user.experience?.length > 0, to: editProfile },
];

export default function ProfileStrength() {
  const { user } = useAuth();
  const next = STEPS.find((step) => !step.done(user));
  if (!next) return null;
  const done = STEPS.filter((step) => step.done(user)).length;
  const share = done / STEPS.length;

  return (
    <Link to={next.to(user)} className="card relative flex items-center gap-4 overflow-hidden p-4 transition hover:border-ink/25">
      <div className="grid-paper absolute inset-0 opacity-60" />
      <span className="relative grid size-13 shrink-0 place-items-center">
        <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" className="stroke-ink/10" />
          <motion.circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-brand" initial={{ pathLength: 0 }} animate={{ pathLength: share }} transition={{ duration: 1, ease: 'easeOut' }} />
        </svg>
        <span className="font-display text-sm font-bold">{Math.round(share * 100)}%</span>
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-xs font-medium uppercase tracking-wider text-muted">Next step</span>
        <span className="block font-semibold">{next.label}</span>
        <span className="block text-sm text-muted">
          {done} of {STEPS.length} done · complete profiles get more connections
        </span>
      </span>
      <ChevronRight size={20} className="relative shrink-0 text-muted" />
    </Link>
  );
}
