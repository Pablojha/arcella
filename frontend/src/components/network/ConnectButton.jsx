import { useState } from 'react';
import { Clock, MessageCircle, UserCheck, UserPlus } from 'lucide-react';
import { useBadges } from '../../context/BadgeContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import Button from '../ui/Button';

/** Connect / Pending (withdraw) / Accept + Ignore / Message, depending on the relationship. */
export default function ConnectButton({ person, status: initial, size = 'sm' }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { refresh } = useBadges();
  const path = `/connections/${person._id}`;

  const run = async (request) => {
    setBusy(true);
    try {
      setStatus((await request()).status);
      refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (status === 'self') return null;
  if (status === 'connected') return <Button size={size} variant="secondary" icon={MessageCircle} to={`/messages/${person._id}`}>Message</Button>;
  if (status === 'incoming') {
    return (
      <div className="flex shrink-0 gap-1.5">
        <Button size={size} icon={UserCheck} loading={busy} onClick={() => run(() => api.post(`${path}/accept`))}>
          Accept
        </Button>
        <Button size={size} variant="ghost" disabled={busy} onClick={() => run(() => api.delete(path))}>
          Ignore
        </Button>
      </div>
    );
  }
  if (status === 'outgoing') {
    return (
      <Button size={size} variant="secondary" icon={Clock} loading={busy} title="Withdraw request" onClick={() => window.confirm('Withdraw your connection request?') && run(() => api.delete(path))}>
        Pending
      </Button>
    );
  }
  return (
    <Button size={size} variant="secondary" icon={UserPlus} loading={busy} onClick={() => run(() => api.post(path))}>
      Connect
    </Button>
  );
}
