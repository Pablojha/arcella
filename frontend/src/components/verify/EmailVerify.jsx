import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import Button from '../ui/Button';
import Field from '../ui/Field';
import OtpInput from '../ui/OtpInput';

const RESEND_SECONDS = 30;

/** Sends a 6-digit code to an official college address and confirms it. */
export default function EmailVerify({ college, details, onVerified }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const id = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const send = async (event) => {
    event?.preventDefault();
    setBusy(true);
    try {
      const result = await api.post('/verification/email/send', { ...details, email });
      setSent(result);
      setCode('');
      setCooldown(RESEND_SECONDS);
      toast.success(`Code sent to ${result.email}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { user } = await api.post('/verification/email/confirm', { code });
      onVerified(user);
    } catch (error) {
      toast.error(error.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.form key="code" onSubmit={confirm} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
          <p className="text-sm text-muted">
            Enter the 6-digit code sent to <b className="text-ink">{sent.email}</b>. It expires in 10 minutes.
          </p>
          {sent.devCode && <p className="rounded-xl bg-accent/10 px-3 py-2 text-xs text-accent">Development mode: no email provider is set, your code is {sent.devCode}</p>}
          <OtpInput value={code} onChange={setCode} />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length !== 6}>
            Verify
          </Button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => setSent(null)} className="text-muted hover:text-ink">
              Change email
            </button>
            <button type="button" onClick={() => send()} disabled={cooldown > 0 || busy} className="font-medium text-brand disabled:text-muted">
              {cooldown ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </motion.form>
      ) : (
        <motion.form key="email" onSubmit={send} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
          <Field label="Official college email" hint={`Must end with ${college.domains.map((domain) => `@${domain}`).join(' or ')}`}>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="input" placeholder={`you@${college.domains[0]}`} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Send code
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
