import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import CodeStep from '../auth/CodeStep';
import Button from '../ui/Button';
import Field from '../ui/Field';

/** Sends a 6-digit code to an official college address and confirms it. */
export default function EmailVerify({ college, details, onVerified }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  const sendCode = () => api.post('/verification/email/send', { ...details, email });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      setSent(await sendCode());
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return <CodeStep email={sent.email} devCode={sent.devCode} submitLabel="Verify" onSubmit={async (code) => onVerified((await api.post('/verification/email/confirm', { code })).user)} onResend={sendCode} onBack={() => setSent(null)} />;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Official college email" hint={`Must end with ${college.domains.map((domain) => `@${domain}`).join(' or ')}`}>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="input" placeholder={`you@${college.domains[0]}`} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        Send code
      </Button>
    </form>
  );
}
