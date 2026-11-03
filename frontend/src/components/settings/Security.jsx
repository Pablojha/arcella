import { useState } from 'react';
import { CircleAlert, CircleCheck, Copy, KeyRound, LogOut, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import api from '../../lib/api';
import { ago, deviceName } from '../../lib/format';
import Button from '../ui/Button';
import Field from '../ui/Field';
import OtpInput from '../ui/OtpInput';
import PasswordInput from '../ui/PasswordInput';

const FAILURE = { password: 'Wrong password', two_factor: 'Wrong two-factor code', locked: 'Blocked: too many attempts' };

/** Turns two-factor sign-in on (authenticator app plus one-time recovery codes) or off. */
function TwoFactor() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recovery, setRecovery] = useState(null);
  const [busy, setBusy] = useState(false);
  const enabled = user.twoFactor?.enabled;

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const start = () => run(async () => setSetup(await api.post('/auth/2fa/setup')));
  const enable = (event) => {
    event.preventDefault();
    run(async () => {
      const { recoveryCodes } = await api.post('/auth/2fa/enable', { code });
      setRecovery(recoveryCodes);
      setSetup(null);
      setCode('');
      setUser({ ...user, twoFactor: { enabled: true } });
      toast.success('Two-factor sign-in is on');
    });
  };
  const disable = (event) => {
    event.preventDefault();
    run(async () => {
      await api.post('/auth/2fa/disable', { password, code });
      setPassword('');
      setCode('');
      setUser({ ...user, twoFactor: { enabled: false } });
      toast.success('Two-factor sign-in is off');
    });
  };

  if (recovery) {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          <b>Save these recovery codes.</b> Each one signs you in once if you lose your phone. They won't be shown again.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-2xl bg-ink/5 p-3 font-mono text-sm" aria-label="Recovery codes">
          {recovery.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Copy} onClick={() => navigator.clipboard.writeText(recovery.join('\n')).then(() => toast.success('Copied'))}>
            Copy
          </Button>
          <Button size="sm" onClick={() => setRecovery(null)}>
            I've saved them
          </Button>
        </div>
      </div>
    );
  }

  if (setup) {
    return (
      <form onSubmit={enable} className="space-y-4">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>
            Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…) and add an account with this key, or{' '}
            <a href={setup.url} className="font-medium text-brand underline">
              open it in the app
            </a>{' '}
            on this phone.
          </li>
          <li>Enter the 6-digit code the app shows.</li>
        </ol>
        <p className="break-all rounded-2xl bg-ink/5 p-3 text-center font-mono text-sm tracking-wider" aria-label="Setup key">
          {setup.secret.match(/.{1,4}/g).join(' ')}
        </p>
        <OtpInput value={code} onChange={setCode} />
        <div className="flex gap-2">
          <Button type="submit" loading={busy} disabled={code.length !== 6}>
            Turn on
          </Button>
          <Button variant="ghost" onClick={() => setSetup(null)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  if (enabled) {
    return (
      <form onSubmit={disable} className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck size={16} className="text-brand" /> On: signing in asks for a code from your authenticator app.
        </p>
        <Field label="Password">
          <PasswordInput value={password} onChange={setPassword} />
        </Field>
        <Field label="Code from your app, or a recovery code">
          <input value={code} onChange={(event) => setCode(event.target.value.trim())} required maxLength={9} autoComplete="one-time-code" className="input" />
        </Field>
        <Button type="submit" variant="secondary" loading={busy}>
          Turn off two-factor sign-in
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Ask for a code from your phone as well as your password, so a leaked password alone can't open your account.</p>
      <Button variant="secondary" size="sm" icon={KeyRound} onClick={start} loading={busy}>
        Set up two-factor sign-in
      </Button>
    </div>
  );
}

/** Where the account is signed in: sign out any one device, or all of them except this one. */
function Devices() {
  const toast = useToast();
  const { data, setData, error } = useApi('/auth/devices');
  const items = data?.items ?? [];

  const signOut = async (device) => {
    try {
      await api.delete(`/auth/devices/${device._id}`);
      setData((current) => ({ items: current.items.filter((item) => item._id !== device._id) }));
      toast.success('Signed out that device');
    } catch (signOutError) {
      toast.error(signOutError.message);
    }
  };
  const signOutOthers = async () => {
    if (!window.confirm('Sign out every other device?')) return;
    try {
      await api.post('/auth/devices/sign-out-others');
      setData((current) => ({ items: current.items.filter((item) => item.current) }));
      toast.success('Signed out your other devices');
    } catch (signOutError) {
      toast.error(signOutError.message);
    }
  };

  if (error) return <p className="text-sm text-accent">{error.message}</p>;
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line">
        {items.map((device) => (
          <li key={device._id} className="flex items-center gap-3 py-2.5">
            <MonitorSmartphone size={20} className="shrink-0 text-muted" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">
                {deviceName(device.agent)} {device.current && <span className="text-brand">· This device</span>}
              </p>
              <p className="text-xs text-muted">
                Active {ago(device.lastSeenAt)} · signed in {ago(device.createdAt)}
              </p>
            </div>
            {!device.current && (
              <Button variant="ghost" size="sm" onClick={() => signOut(device)} aria-label={`Sign out ${deviceName(device.agent)}`}>
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <Button variant="secondary" size="sm" icon={LogOut} onClick={signOutOthers}>
          Sign out all other devices
        </Button>
      )}
    </div>
  );
}

/** The last sign-in attempts on the account, successful or not. */
function History() {
  const { data } = useApi('/auth/history');
  if (!data?.items.length) return <p className="text-sm text-muted">Sign-ins from now on are listed here.</p>;
  return (
    <ul className="divide-y divide-line">
      {data.items.map((event) => (
        <li key={event._id} className="flex items-center gap-3 py-2 text-sm">
          {event.ok ? <CircleCheck size={16} className="shrink-0 text-brand" /> : <CircleAlert size={16} className="shrink-0 text-accent" />}
          <span className="min-w-0 flex-1 truncate">
            {event.ok ? 'Signed in' : FAILURE[event.reason]} · {deviceName(event.agent)}
          </span>
          <span className="shrink-0 text-xs text-muted">{ago(event.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Security() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-semibold">Two-factor sign-in</h3>
        <TwoFactor />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Where you're signed in</h3>
        <Devices />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Recent sign-ins</h3>
        <History />
      </div>
    </div>
  );
}
