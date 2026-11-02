import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import api, { token } from '../../lib/api';
import { syncPush } from '../../lib/push';
import Button from '../ui/Button';
import Field from '../ui/Field';
import PasswordInput from '../ui/PasswordInput';

export default function ChangePassword() {
  const toast = useToast();
  const [form, setForm] = useState({ current: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { token: fresh } = await api.patch('/auth/password', form);
      token.set(fresh);
      // Signing out the other devices also stopped every device's notifications; this one keeps getting them.
      syncPush().catch(() => {});
      setForm({ current: '', password: '' });
      toast.success('Password changed. Your other devices were signed out.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Current password">
        <PasswordInput value={form.current} onChange={set('current')} />
      </Field>
      <Field label="New password" hint="At least 8 characters">
        <PasswordInput value={form.password} onChange={set('password')} minLength={8} autoComplete="new-password" />
      </Field>
      <Button type="submit" loading={busy}>
        Change password
      </Button>
    </form>
  );
}
