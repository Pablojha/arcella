import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import Button from '../ui/Button';
import Chips from '../ui/Chips';
import Field from '../ui/Field';
import Sheet from '../ui/Sheet';
import UserChip from '../ui/UserChip';

/** Pick one of the mentor's topics and free slots, add a note, send. */
export default function RequestSession({ mentor, onClose, onRequested }) {
  const toast = useToast();
  const [topic, setTopic] = useState('');
  const [slot, setSlot] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const open = Boolean(mentor);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/mentorship/sessions', { mentor: mentor._id, topic, slot, note });
      toast.success('Request sent. You will be notified when they respond.');
      onRequested?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Request a session">
      {open && (
        <form onSubmit={submit} className="space-y-4">
          <UserChip user={mentor} link={false} />
          <Field as="div" label="Topic">
            <Chips options={mentor.mentor.topics} value={topic} onChange={setTopic} allLabel={null} bleed={false} />
          </Field>
          <Field as="div" label="Free slot">
            <Chips options={mentor.mentor.slots} value={slot} onChange={setSlot} allLabel={null} bleed={false} />
          </Field>
          <Field label="Note (optional)">
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={600} className="input resize-none" placeholder="What would you like help with?" />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!topic || !slot}>
            Send request
          </Button>
        </form>
      )}
    </Sheet>
  );
}
