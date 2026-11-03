import { useState } from 'react';
import { BadgeCheck, Ban, Clock, RotateCcw, ShieldOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePaged } from '../../hooks/usePaged';
import api from '../../lib/api';
import { BATCH_YEARS, COLLEGE_ROLES, DEGREE_LEVELS, STAFF_ROLES } from '../../lib/constants';
import { can } from '../../lib/permissions';
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

const STATUSES = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Banned' },
];

const rankOf = (role) => STAFF_ROLES.findIndex((item) => item.value === (role ?? 'user'));

export default function UsersAdmin() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ role: '', status: '' });
  const users = usePaged('/admin/users', { q: useDebounce(query), ...filters, limit: 20 });
  const [verifying, setVerifying] = useState(null);
  const patch = (member, changes) => users.setItems((items) => items.map((item) => (item._id === member._id ? { ...item, ...changes } : item)));
  // The API refuses actions on yourself or on staff of your rank or above; the controls follow the same rule.
  const outranks = (member) => member._id !== me._id && rankOf(member.role) < rankOf(me.role);

  const setRole = async (member, role) => {
    try {
      patch(member, await api.patch(`/admin/users/${member._id}/role`, { role }));
      toast.success(`${member.name} is now: ${STAFF_ROLES.find((item) => item.value === role).label}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const setStatus = async (member, status) => {
    const body = { status };
    if (status === 'suspended') {
      const days = Number(window.prompt(`Suspend ${member.name} for how many days (1 to 365)?`, '7'));
      if (!Number.isInteger(days) || days < 1 || days > 365) return;
      body.days = days;
    }
    if (status !== 'active') {
      const reason = window.prompt('Reason (the member sees this when they try to sign in):');
      if (!reason?.trim()) return;
      body.reason = reason.trim();
    } else if (!window.confirm(`Restore the account of ${member.name}?`)) return;
    try {
      patch(member, await api.post(`/admin/users/${member._id}/status`, body));
      toast.success(status === 'active' ? 'Account restored' : status === 'banned' ? 'Account banned and signed out' : 'Account suspended and signed out');
    } catch (error) {
      toast.error(error.message);
    }
  };

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
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email or username" />
        <select value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))} aria-label="Role" className="input">
          <option value="">Any role</option>
          {STAFF_ROLES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} aria-label="Status" className="input">
          {STATUSES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {users.items.map((user) => (
        <div key={user._id} className="card flex flex-wrap items-center gap-3 p-3.5">
          <div className="min-w-0 flex-1">
            <UserChip user={user} sub={`${user.email}${user.verified ? ` · ${user.college?.short ?? user.college?.name ?? ''}` : ''}`} />
          </div>
          {user.status === 'suspended' && <span className="chip text-accent">Suspended until {new Date(user.suspendedUntil).toLocaleDateString()}</span>}
          {user.status === 'banned' && <span className="chip text-accent">Banned</span>}
          {can(me, 'roles:manage') && outranks(user) ? (
            <select value={user.role ?? 'user'} onChange={(event) => setRole(user, event.target.value)} aria-label={`Role of ${user.name}`} className="input h-8 w-auto py-0 text-[13px]">
              {STAFF_ROLES.filter(({ value }) => rankOf(value) < rankOf(me.role)).map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            rankOf(user.role) > 0 && <span className="chip">{STAFF_ROLES[rankOf(user.role)].label}</span>
          )}
          {outranks(user) && can(me, 'users:suspend') && (user.status ?? 'active') === 'active' && (
            <Button size="sm" variant="secondary" icon={Clock} onClick={() => setStatus(user, 'suspended')}>
              Suspend
            </Button>
          )}
          {outranks(user) && can(me, 'users:ban') && user.status !== 'banned' && (
            <Button size="sm" variant="danger" icon={Ban} onClick={() => setStatus(user, 'banned')}>
              Ban
            </Button>
          )}
          {outranks(user) && can(me, user.status === 'banned' ? 'users:ban' : 'users:suspend') && user.status && user.status !== 'active' && (
            <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setStatus(user, 'active')}>
              Restore
            </Button>
          )}
          {can(me, 'users:verify') && user.verified && (
            <Button size="sm" variant="danger" icon={ShieldOff} onClick={() => revoke(user)}>
              Revoke
            </Button>
          )}
          {can(me, 'users:verify') && (
            <Button size="sm" variant="secondary" icon={BadgeCheck} onClick={() => setVerifying(user)}>
              Verify
            </Button>
          )}
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
