import { useState } from 'react';
import { ChevronRight, Mail, Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../lib/api';
import Button from '../ui/Button';
import Field from '../ui/Field';
import FirmLogo from '../ui/FirmLogo';
import SearchInput from '../ui/SearchInput';
import Sheet from '../ui/Sheet';
import { Skeleton } from '../ui/Skeleton';

function AddCollege({ open, initialName, onClose, onAdded }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: initialName, city: '', state: '' });
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      onAdded(await api.post('/colleges', form));
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add your college">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name of the college">
          <input value={form.name} onChange={set('name')} required minLength={3} maxLength={150} className="input" placeholder="School of Architecture, …" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <input value={form.city} onChange={set('city')} required maxLength={60} className="input" />
          </Field>
          <Field label="State">
            <input value={form.state} onChange={set('state')} required maxLength={60} className="input" />
          </Field>
        </div>
        <p className="text-xs text-muted">New colleges verify members by document review until an admin adds the official email domain.</p>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Add college
        </Button>
      </form>
    </Sheet>
  );
}

export default function CollegePicker({ onSelect }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);
  const { data, loading } = useApi('/colleges', { q: debounced });
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-semibold">Which college?</h2>
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, short name or city" />
      <div className="card max-h-[52dvh] divide-y divide-line overflow-y-auto">
        {loading && !data && <Skeleton className="m-3 h-14" />}
        {data?.items.map((college) => (
          <button key={college._id} type="button" onClick={() => onSelect(college)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink/5">
            <FirmLogo name={college.short || college.name} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{college.name}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                {college.city}, {college.state}
                {college.domains.length > 0 && (
                  <span className="flex items-center gap-1 text-brand">
                    · <Mail size={11} /> email
                  </span>
                )}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-muted" />
          </button>
        ))}
        {data && !data.items.length && <p className="px-4 py-6 text-center text-sm text-muted">No college matches “{query}”.</p>}
      </div>
      <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)} className="w-full">
        Can't find it? Add your college
      </Button>
      {adding && <AddCollege open={adding} initialName={query} onClose={() => setAdding(false)} onAdded={onSelect} />}
    </div>
  );
}
