import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import Button from '../ui/Button';
import OtpInput from '../ui/OtpInput';

const RESEND_SECONDS = 30;

/** "Enter the 6-digit code" step shared by sign-up, password reset and college verification. */
export default function CodeStep({ email, devCode, submitLabel, onSubmit, onResend, onBack, children }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [shownCode, setShownCode] = useState(devCode);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (!cooldown) return undefined;
    const id = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit(code);
    } catch (error) {
      toast.error(error.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      setShownCode((await onResend())?.devCode);
      setCooldown(RESEND_SECONDS);
      toast.success(`A new code is on its way to ${email}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">
        Enter the 6-digit code we sent to <b className="break-all text-ink">{email}</b>. It expires in 10 minutes.
      </p>
      {shownCode && <p className="rounded-xl bg-accent/10 px-3 py-2 text-xs text-accent">Development mode: no email provider is set up, so your code is {shownCode}</p>}
      <OtpInput value={code} onChange={setCode} />
      {children}
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>
        {submitLabel}
      </Button>
      <div className="flex justify-between gap-3 text-sm">
        <button type="button" onClick={onBack} className="text-muted hover:text-ink">
          Change email
        </button>
        <button type="button" onClick={resend} disabled={cooldown > 0} className="font-medium text-brand disabled:text-muted">
          {cooldown ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}
