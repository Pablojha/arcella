import { motion } from 'framer-motion';
import { BadgeCheck, Hourglass } from 'lucide-react';
import Button from '../ui/Button';
import Confetti from '../ui/Confetti';

/** End of the wizard: confetti for instant (email) verification, a calm note for document review. */
export default function VerifySuccess({ college, pending = false }) {
  const Icon = pending ? Hourglass : BadgeCheck;
  return (
    <div className="card relative overflow-hidden px-6 py-10 text-center">
      {!pending && <Confetti />}
      <div className="grid-paper absolute inset-0 opacity-70" />
      <div className="relative">
        <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 13, delay: 0.1 }} className="mx-auto grid size-20 place-items-center rounded-full bg-brand text-on-brand shadow-lg shadow-brand/30">
          <Icon size={40} />
        </motion.span>
        <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-5 font-display text-3xl font-bold tracking-tight">
          {pending ? 'Submitted for review' : "You're verified!"}
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mx-auto mt-2 max-w-sm text-muted">
          {pending ? `An admin of ${college.name} will review your document. We'll notify you as soon as it's done.` : `Welcome to the ${college.name} group.`}
        </motion.p>
        <Button to="/college" size="lg" className="mt-6">
          {pending ? 'Back to college' : 'Open your college group'}
        </Button>
      </div>
    </div>
  );
}
