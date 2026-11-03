import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import Button from '../ui/Button';
import Field from '../ui/Field';
import OtpInput from '../ui/OtpInput';

/** The second sign-in step for accounts with two-factor on: a code from the authenticator app, or a recovery code. */
export default function TwoFactorStep({ onSubmit, onBack }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit(code);
    } catch (error) {
      toast.error(error.message);
      setCode('');
      setBusy(false);
    }
  };

  const switchMode = () => {
    setRecovery((current) => !current);
    setCode('');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">{recovery ? 'Enter one of the recovery codes you saved when you turned on two-factor sign-in.' : 'Enter the 6-digit code from your authenticator app.'}</p>
      {recovery ? (
        <Field label="Recovery code">
          <input value={code} onChange={(event) => setCode(event.target.value.trim())} required maxLength={9} autoComplete="off" className="input font-mono" placeholder="abcd-1234" autoFocus />
        </Field>
      ) : (
        <OtpInput value={code} onChange={setCode} />
      )}
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={recovery ? code.length < 9 : code.length !== 6}>
        Sign in
      </Button>
      <div className="flex justify-between gap-3 text-sm">
        <button type="button" onClick={onBack} className="text-muted hover:text-ink">
          Back
        </button>
        <button type="button" onClick={switchMode} className="font-medium text-brand">
          {recovery ? 'Use the app code' : 'Use a recovery code'}
        </button>
      </div>
    </form>
  );
}
