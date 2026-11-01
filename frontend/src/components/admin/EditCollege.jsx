import { useState } from 'react';
import { Users } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { GROUP_ROLES } from '../../lib/constants';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Sheet from '../ui/Sheet';
import TagInput from '../ui/TagInput';
import UserChip from '../ui/UserChip';

/** Admin editor for a college: names and official email domains, plus a way into its group to choose admins. */
export default function EditCollege({ college, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => ({ name: college.name, short: college.short ?? '', city: college.city ?? '', state: college.state ?? '', domains: college.domains }));
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      onSaved(await api.patch(`/admin/colleges/${college._id}`, form));
      toast.success('College updated');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="Edit college" size="lg">
      <form onSubmit={save} className="space-y-4">
        <Field label="Name">
          <input value={form.name} onChange={set('name')} required minLength={3} maxLength={150} className="input" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Short name">
            <input value={form.short} onChange={set('short')} maxLength={40} className="input" />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={set('city')} maxLength={60} className="input" />
          </Field>
          <Field label="State">
            <input value={form.state} onChange={set('state')} maxLength={60} className="input" />
          </Field>
        </div>
        <Field as="div" label="Official email domains" hint="Members can verify instantly with an address on these domains (subdomains included).">
          <TagInput value={form.domains} onChange={(domains) => setForm((current) => ({ ...current, domains }))} max={10} placeholder="college.ac.in" />
        </Field>
        <Button type="submit" loading={busy}>
          Save college
        </Button>
      </form>

      <section className="mt-6 space-y-3 border-t border-line pt-5">
        <h3 className="font-display font-semibold">Group admins</h3>
        {['admin', 'coAdmin'].map((role) => college[role] && <UserChip key={role} user={college[role]} sub={GROUP_ROLES[role]} size={36} />)}
        <p className="text-sm text-muted">
          Choose the admin and co-admin from the group&apos;s Members tab; the college admin can also pick their own co-admin. They run the chat, remove posts and review document verifications.
        </p>
        <Button variant="secondary" icon={Users} to={`/college?id=${college._id}&tab=members`}>
          Open group
        </Button>
      </section>
    </Sheet>
  );
}
