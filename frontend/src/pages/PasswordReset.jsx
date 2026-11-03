import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

/** Forgot password: email → 6-digit code + new password → signed in. */
export default function PasswordReset() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [busy, setBusy] = useState(false);
  useTitle('Reset password');
  usePageMeta({ path: '/reset', description: 'Reset your Arcella password with a one-time code sent to your email.', noindex: true });

  const requestCode = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      setSent(await api.post('/auth/forgot', { email }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const signIn = (session) => {
    login(session);
    toast.success('Password updated. You are signed in.');
    navigate('/', { replace: true });
  };

  // With two-factor sign-in on, the new password is saved and the app code is still needed to sign in.
  const reset = async (code) => {
    const result = await api.post('/auth/reset', { email, code, password });
    if (result.twoFactor) setTicket(result.ticket);
    else signIn(result);
  };

  return (
    <AuthLayout title={sent ? 'Choose a new password' : 'Forgot your password?'} subtitle={sent ? 'Your other devices will be signed out.' : "We'll email you a 6-digit code."}>
      <div className="mt-7">
        {ticket ? (
          <TwoFactorStep onSubmit={async (code) => signIn(await api.post('/auth/2fa/login', { ticket, code }))} onBack={() => navigate('/login')} />
        ) : sent ? (
          <CodeStep email={email} devCode={sent.devCode} submitLabel="Save password" onSubmit={reset} onResend={() => api.post('/auth/forgot', { email })} onBack={() => setSent(null)}>
            <Field label="New password" hint="At least 8 characters">
              <PasswordInput value={password} onChange={setPassword} minLength={8} autoComplete="new-password" />
            </Field>
          </CodeStep>
        ) : (
          <form onSubmit={requestCode} className="space-y-4">
            <Field label="Email">
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="input" placeholder="you@example.com" />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Send code
            </Button>
          </form>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
