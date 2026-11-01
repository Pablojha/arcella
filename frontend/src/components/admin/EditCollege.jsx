import { useState } from 'react';
import { ShieldMinus, ShieldPlus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../lib/api';
import Button from '../ui/Button';
import Field from '../ui/Field';
import SearchInput from '../ui/SearchInput';
import Sheet from '../ui/Sheet';
import TagInput from '../ui/TagInput';
import UserChip from '../ui/UserChip';

function ModeratorPicker({ college, onChange }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const { data } = useApi('/admin/users', { college: college._id, q: debounced, limit: 8 });
  const candidates = (data?.items ?? []).filter((user) => user.verified && !college.moderators.some((moderator) => moderator._id === user._id));
  return (
    <div className="space-y-2">
      <SearchInput value={query} onChange={setQuery} placeholder="Search verified members to promote" />
      {candidates.map((user) => (
        <div key={user._id} className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <UserChip user={user} sub={user.email} size={36} link={false} />
          </div>
          <Button size="sm" variant="secondary" icon={ShieldPlus} onClick={() => onChange(user._id)}>
            Promote
          </Button>
        </div>
      ))}
      {data && !candidates.length && <p className="text-xs text-muted">No verified members match.</p>}
    </div>
  );
}

/** Admin editor for a college: names, official email domains and moderators. */
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

  const toggleModerator = async (userId) => {
    try {
      onSaved(await api.post(`/admin/colleges/${college._id}/moderators/${userId}`));
    } catch (error) {
      toast.error(error.message);
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
        <h3 className="font-display font-semibold">Moderators</h3>
        {college.moderators.map((moderator) => (
          <div key={moderator._id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <UserChip user={moderator} size={36} />
            </div>
            <Button size="sm" variant="danger" icon={ShieldMinus} onClick={() => toggleModerator(moderator._id)}>
              Remove
            </Button>
          </div>
        ))}
        {!college.moderators.length && <p className="text-sm text-muted">No moderators yet. Moderators review document verifications for this college.</p>}
        <ModeratorPicker college={college} onChange={toggleModerator} />
      </section>
    </Sheet>
  );
}
