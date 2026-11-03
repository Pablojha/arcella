import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import CodeStep from '../components/auth/CodeStep';
import TwoFactorStep from '../components/auth/TwoFactorStep';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useTitle } from '../hooks/useTitle';
import api from '../lib/api';
import { USER_TYPES } from '../lib/constants';

/** Login and sign-up. Unconfirmed emails get a 6-digit code step before the session starts. */
export default function Auth({ mode }) {
  const register = mode === 'register';
  const { user, login } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', type: 'student', acceptTerms: false });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const next = /^\/(?!\/)/.test(params.get('next') ?? '') ? params.get('next') : '/';
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  useTitle(register ? 'Create account' : 'Log in');
  usePageMeta({
    path: register ? '/register' : '/login',
    description: register
      ? 'Create your free Arcella account: portfolios, crits, private college groups, internships and mentorship for architecture in India.'
      : 'Log in to Arcella, the professional network for architecture students, alumni, faculty and firms in India.',
  });

  if (user) return <Navigate to={next} replace />;

  const welcome = (session) => {
    login(session);
    toast.success(`Welcome${register ? ' to Arcella' : ' back'}, ${session.user.name.split(' ')[0]}!`);
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.post(`/auth/${mode}`, register ? form : { email: form.email, password: form.password });
      if (result.verify || result.twoFactor) setPending(result);
      else welcome(result);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (pending?.twoFactor) {
    return (
      <AuthLayout title="Two-factor sign-in" subtitle="One more step to confirm it's you.">
        <div className="mt-7">
          <TwoFactorStep onSubmit={async (code) => welcome(await api.post('/auth/2fa/login', { ticket: pending.ticket, code }))} onBack={() => setPending(null)} />
        </div>
      </AuthLayout>
    );
  }

  if (pending) {
    return (
      <AuthLayout title="Check your email" subtitle="One quick step to confirm it's you.">
        <div className="mt-7">
          <CodeStep
            email={pending.email}
            devCode={pending.devCode}
            submitLabel="Verify email"
            onSubmit={async (code) => welcome(await api.post('/auth/verify-email', { email: pending.email, code }))}
            onResend={() => api.post('/auth/resend-code', { email: pending.email })}
            onBack={() => setPending(null)}
          />
        </div>
      </AuthLayout>
    );
  }

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
                  aria-pressed={form.type === type.value}
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
        {register && (
          <label className="flex items-start gap-2.5 text-sm text-muted">
            <input type="checkbox" checked={form.acceptTerms} onChange={(event) => set('acceptTerms')(event.target.checked)} required className="mt-0.5 size-4 shrink-0 accent-brand" />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="font-medium text-brand underline underline-offset-2">
                Terms of Use
              </Link>{' '}
              and the{' '}
              <Link to="/privacy" className="font-medium text-brand underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {register ? 'Create account' : 'Log in'}
        </Button>
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
