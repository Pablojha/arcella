import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import CollegePicker from '../college/CollegePicker';
import MembershipFields, { membershipDetails, membershipReady } from '../college/MembershipFields';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import SelectedCollege from '../verify/SelectedCollege';

const BLANK = { role: 'student', level: '', degree: '', batch: '', graduation: '' };

/** Adds a college to the member's education (pick the college, then role, degree and years) or edits an entry. */
export default function EducationSheet({ entry, onClose, onSaved }) {
  const toast = useToast();
  const adding = !entry._id;
  const [college, setCollege] = useState(entry.college ?? null);
  const [details, setDetails] = useState({ ...BLANK, ...entry });
  const [busy, setBusy] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const body = membershipDetails(details);
      onSaved(adding ? await api.post('/users/me/memberships', { college: college._id, ...body }) : await api.put(`/users/me/memberships/${entry._id}`, body));
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={adding ? 'Add education' : 'Edit education'}>
      {college ? (
        <form onSubmit={save} className="space-y-5">
          <SelectedCollege college={college} onChange={adding ? () => setCollege(null) : undefined} />
          <MembershipFields value={details} onChange={(change) => setDetails((current) => ({ ...current, ...change }))} verified={entry.verified} />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!membershipReady(details)}>
            Save
          </Button>
        </form>
      ) : (
        <CollegePicker onSelect={setCollege} />
      )}
    </Sheet>
  );
}
