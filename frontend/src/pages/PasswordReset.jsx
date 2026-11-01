import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTitle } from '../hooks/useTitle';
import api from '../lib/api';

/** /reset asks for an email and sends a link; /reset?token=… sets the new password and signs in. */
export default function PasswordReset() {
  const [params] = useSearchParams();
  const resetToken = params.get('token');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  useTitle('Reset password');

  const run = async (event, request) => {
    event.preventDefault();
    setBusy(true);
    try {
      await request();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const requestLink = (event) => run(event, async () => setSent(await api.post('/auth/forgot', { email })));

  const choosePassword = (event) =>
    run(event, async () => {
      login(await api.post('/auth/reset', { token: resetToken, password }));
      toast.success('Password updated. You are signed in.');
      navigate('/', { replace: true });
    });

  if (resetToken) {
    return (
      <AuthLayout title="Choose a new password" subtitle="Other devices will be signed out.">
        <form onSubmit={choosePassword} className="mt-7 space-y-4">
          <Field label="New password" hint="At least 8 characters">
            <PasswordInput value={password} onChange={setPassword} minLength={8} autoComplete="new-password" />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Save password
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
      {sent ? (
        <div className="mt-7 space-y-4 rounded-2xl border border-line bg-card p-5 text-center">
          <MailCheck size={32} className="mx-auto text-brand" />
          <p className="text-sm">If an account exists for <b>{email}</b>, a reset link is on its way. It works for 30 minutes.</p>
          {sent.devLink && (
            <a href={sent.devLink} className="block break-all rounded-xl bg-accent/10 px-3 py-2 text-xs text-accent">
              Development mode: open the reset link
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={requestLink} className="mt-7 space-y-4">
          <Field label="Email">
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="input" placeholder="you@example.com" />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
