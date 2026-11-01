import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import { REPORT_REASONS } from '../lib/constants';
import Button from './ui/Button';
import Sheet from './ui/Sheet';

/** Report a post, profile, message or other content. `target` is { type, id, label } or null when closed. */
export default function ReportSheet({ target, onClose }) {
  const toast = useToast();
  const [reason, setReason] = useState('spam');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/reports', { type: target.type, target: target.id, reason, note });
      toast.success('Thanks for telling us. Our team will review it.');
      setNote('');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={Boolean(target)} onClose={onClose} title={`Report ${target?.label ?? ''}`}>
      <form onSubmit={submit} className="space-y-4">
        <div role="radiogroup" aria-label="Reason" className="space-y-2">
          {REPORT_REASONS.map((option) => (
            <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${reason === option.value ? 'border-brand bg-brand/10' : 'border-line hover:border-ink/30'}`}>
              <input type="radio" name="reason" value={option.value} checked={reason === option.value} onChange={() => setReason(option.value)} className="mt-1 accent-[var(--brand)]" />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={500} placeholder="Anything else we should know? (optional)" className="input resize-none" />
        <p className="text-xs text-muted">The person you report is not told who reported them.</p>
        <Button type="submit" size="lg" variant="accent" className="w-full" loading={busy}>
          Send report
        </Button>
      </form>
    </Sheet>
  );
}
