import { useState } from 'react';
import { BadgeCheck, ShieldOff } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePaged } from '../../hooks/usePaged';
import api from '../../lib/api';
import { BATCH_YEARS, COLLEGE_ROLES, DEGREE_LEVELS } from '../../lib/constants';
import Button from '../ui/Button';
import CollegeSelect from '../ui/CollegeSelect';
import Field from '../ui/Field';
import LoadMore from '../ui/LoadMore';
import SearchInput from '../ui/SearchInput';
import Sheet from '../ui/Sheet';
import { ListSkeleton } from '../ui/Skeleton';
import UserChip from '../ui/UserChip';

function VerifyUser({ user, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ college: '', role: user.type === 'professional' ? 'alumni' : user.type, level: '', batch: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post(`/admin/users/${user._id}/verify`, form);
      toast.success(`${user.name} verified`);
      onDone();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={`Verify ${user.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="College">
          <CollegeSelect value={form.college} onChange={(college) => setForm((current) => ({ ...current, college }))} placeholder="Select a college" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="input">
              {COLLEGE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </Field>
          {form.role !== 'faculty' && (
            <Field label="Degree level">
              <select value={form.level} onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))} className="input">
                <option value="">Not set</option>
                {DEGREE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {form.role !== 'faculty' && (
            <Field label="Batch">
              <select value={form.batch} onChange={(event) => setForm((current) => ({ ...current, batch: event.target.value }))} className="input">
                <option value="">Year</option>
                {BATCH_YEARS.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!form.college}>
          Verify member
        </Button>
      </form>
    </Sheet>
  );
}

export default function UsersAdmin() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const users = usePaged('/admin/users', { q: useDebounce(query), limit: 20 });
  const [verifying, setVerifying] = useState(null);

  const revoke = async (user) => {
    if (!window.confirm(`Remove all of ${user.name}'s college verifications? Their education stays on their profile, unverified.`)) return;
    try {
      await api.delete(`/admin/users/${user._id}/verify`);
      toast.success('Verification removed');
      users.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email or username" />
      {users.items.map((user) => (
        <div key={user._id} className="card flex flex-wrap items-center gap-3 p-3.5">
          <div className="min-w-0 flex-1">
            <UserChip user={user} sub={`${user.email}${user.verified ? ` · ${user.college?.short ?? user.college?.name ?? ''}` : ''}`} />
          </div>
          {user.isAdmin && <span className="chip">Admin</span>}
          {user.verified && (
            <Button size="sm" variant="danger" icon={ShieldOff} onClick={() => revoke(user)}>
              Revoke
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={BadgeCheck} onClick={() => setVerifying(user)}>
            Verify
          </Button>
        </div>
      ))}
      {users.loading && <ListSkeleton count={3} lines={0} />}
      <LoadMore hasMore={users.hasMore} loading={users.loading} onLoad={users.loadMore} />
      {verifying && (
        <VerifyUser
          user={verifying}
          onClose={() => setVerifying(null)}
          onDone={() => {
            setVerifying(null);
            users.reload();
          }}
        />
      )}
    </div>
  );
}
