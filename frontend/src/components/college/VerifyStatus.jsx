import { motion } from 'framer-motion';
import { CalendarDays, CircleAlert, Hourglass, Lock, MessagesSquare, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useTitle } from '../../hooks/useTitle';
import { ago } from '../../lib/format';
import Button from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

const PERKS = [
  { icon: MessagesSquare, title: 'Private discussion', text: 'Only verified members can read or post.' },
  { icon: Users, title: 'Members by batch', text: 'Find seniors, juniors and faculty.' },
  { icon: CalendarDays, title: 'College-only events', text: 'Juries, site visits, workshops.' },
];

/** Shown on /college until the member is verified: intro, pending review or rejection note. */
export default function VerifyStatus() {
  const { data, loading } = useApi('/verification/me');
  const request = data?.verification;
  const pending = request?.status === 'pending' && request.method === 'document';
  const rejected = request?.status === 'rejected';
  const Icon = pending ? Hourglass : rejected ? CircleAlert : Lock;
  useTitle('College');

  if (loading) return <Skeleton className="mx-auto h-72 max-w-2xl rounded-3xl" />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card relative overflow-hidden px-6 py-10 text-center md:px-12">
        <div className="grid-paper absolute inset-0 opacity-80" />
        <div className="relative">
          <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} className={`mx-auto grid size-16 place-items-center rounded-2xl ${rejected ? 'bg-accent text-on-accent' : 'bg-brand text-on-brand'}`}>
            <Icon size={28} />
          </motion.span>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight md:text-3xl">
            {pending ? 'Your request is under review' : rejected ? 'Verification not approved' : 'Your college has a private group'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-muted">
            {pending
              ? `A moderator of ${request.college?.name} will check your document soon (submitted ${ago(request.createdAt)}). You'll get a notification.`
              : rejected
                ? request.note || 'The reviewer could not confirm your membership from the document. You can try again with a clearer document.'
                : 'Verify that you study, studied or teach at a college to join its members-only space.'}
          </p>
          <Button to="/college/verify" size="lg" className="mt-6">
            {pending ? 'Submit a different document' : rejected ? 'Try again' : 'Verify my college'}
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PERKS.map(({ icon: PerkIcon, title, text }, index) => (
          <motion.div key={title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.08 }} className="card p-4">
            <PerkIcon size={20} className="text-brand" />
            <p className="mt-2 font-semibold">{title}</p>
            <p className="text-sm text-muted">{text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
