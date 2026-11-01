import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTitle } from '../hooks/useTitle';
import api from '../lib/api';
import { USER_TYPES } from '../lib/constants';

export default function Auth({ mode }) {
  const register = mode === 'register';
  const { user, login } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', type: 'student' });
  const [busy, setBusy] = useState(false);
  const next = /^\/(?!\/)/.test(params.get('next') ?? '') ? params.get('next') : '/';
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  useTitle(register ? 'Create account' : 'Log in');

  if (user) return <Navigate to={next} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const session = await api.post(`/auth/${mode}`, register ? form : { email: form.email, password: form.password });
      login(session);
      toast.success(register ? `Welcome to Arcella, ${session.user.name.split(' ')[0]}!` : 'Welcome back');
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={register ? 'Create your account' : 'Welcome back'} subtitle={register ? 'Join the network for Indian architecture.' : 'Log in to your studio.'}>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {register && (
          <Field label="Full name">
            <input value={form.name} onChange={(event) => set('name')(event.target.value)} required minLength={2} maxLength={60} autoComplete="name" className="input" placeholder="Asha Rao" />
          </Field>
        )}
        <Field label="Email">
          <input type="email" value={form.email} onChange={(event) => set('email')(event.target.value)} required autoComplete="email" className="input" placeholder="you@example.com" />
        </Field>
        <Field label="Password" hint={register ? 'At least 8 characters' : undefined}>
          <PasswordInput value={form.password} onChange={set('password')} minLength={register ? 8 : 1} autoComplete={register ? 'new-password' : 'current-password'} />
        </Field>
        {!register && (
          <Link to="/reset" className="-mt-2 block text-right text-sm font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        )}
        {register && (
          <Field as="div" label="I am">
            <div className="grid grid-cols-2 gap-2">
              {USER_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => set('type')(type.value)}
                  className={`rounded-2xl border p-3 text-left transition ${form.type === type.value ? 'border-brand bg-brand/10 ring-4 ring-brand/10' : 'border-line bg-card hover:border-ink/30'}`}
                >
                  <span className="block text-sm font-semibold">{type.label}</span>
                  <span className="block text-xs text-muted">{type.hint}</span>
                </button>
              ))}
            </div>
          </Field>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {register ? 'Create account' : 'Log in'}
        </Button>
        {register && (
          <p className="text-center text-xs text-muted">
            By joining you agree to how we handle your data in our{' '}
            <Link to="/privacy" className="underline hover:text-ink">
              privacy policy
            </Link>
            .
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {register ? 'Already on Arcella?' : 'New to Arcella?'}{' '}
        <Link to={`${register ? '/login' : '/register'}${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand hover:underline">
          {register ? 'Log in' : 'Create an account'}
        </Link>
      </p>
    </AuthLayout>
  );
}
