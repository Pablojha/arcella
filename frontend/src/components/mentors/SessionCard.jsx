import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { ago } from '../../lib/format';
import Button from '../ui/Button';
import UserChip from '../ui/UserChip';

const STATUS_STYLES = {
  pending: 'bg-ink/5 text-ink/70',
  accepted: 'bg-brand/10 text-brand',
  done: 'bg-brand text-on-brand',
  declined: 'bg-accent/10 text-accent',
  cancelled: 'bg-ink/5 text-muted',
};

const ACTIONS = {
  mentor: { pending: [['accepted', 'Accept'], ['declined', 'Decline']], accepted: [['done', 'Mark done'], ['declined', 'Decline']] },
  mentee: { pending: [['cancelled', 'Cancel']], accepted: [['cancelled', 'Cancel']] },
};

export default function SessionCard({ session: initial }) {
  const { user } = useAuth();
  const toast = useToast();
  const [session, setSession] = useState(initial);
  const [busy, setBusy] = useState('');
  const role = session.mentor?._id === user._id ? 'mentor' : 'mentee';
  const other = role === 'mentor' ? session.mentee : session.mentor;

  const update = async (status) => {
    setBusy(status);
    try {
      setSession(await api.patch(`/mentorship/sessions/${session._id}`, { status }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <UserChip user={other} sub={role === 'mentor' ? 'Wants your mentorship' : 'Your mentor'} />
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLES[session.status]}`}>{session.status}</span>
      </div>
      <div className="rounded-xl bg-ink/[0.04] px-3.5 py-2.5 text-sm">
        <p>
          <b>{session.topic}</b> · {session.slot}
        </p>
        {session.note && <p className="mt-1 text-ink/80">{session.note}</p>}
        <p className="mt-1 text-xs text-muted">Requested {ago(session.createdAt)}</p>
      </div>
      {ACTIONS[role][session.status] && (
        <div className="flex flex-wrap gap-2">
          {ACTIONS[role][session.status].map(([status, label], index) => (
            <Button key={status} size="sm" variant={index === 0 && role === 'mentor' ? 'primary' : 'secondary'} loading={busy === status} disabled={Boolean(busy)} onClick={() => update(status)}>
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
