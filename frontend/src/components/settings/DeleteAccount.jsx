import { useState } from 'react';
import { Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import Button from '../ui/Button';
import Field from '../ui/Field';
import PasswordInput from '../ui/PasswordInput';
import Sheet from '../ui/Sheet';

const GONE = ['Your profile, photos and experience', 'Posts, comments, stories and projects (with their critiques)', 'Messages, connections, mentoring sessions and notifications', 'Firm pages you own, with their job posts, and resources you shared'];

export default function DeleteAccount() {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.delete('/users/me', { data: { password } });
      logout({ signedOut: true });
      navigate('/', { replace: true });
      toast.success('Your account and data were deleted. Take care!');
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <>
      <p className="text-sm text-muted">Permanently delete your account and everything you created. This can't be undone.</p>
      <Button variant="danger" icon={Trash} className="mt-3 border border-accent/30" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Delete your account?">
        <form onSubmit={submit} className="space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink/80">
            {GONE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Field label="Enter your password to confirm">
            <PasswordInput value={password} onChange={setPassword} />
          </Field>
          <Button type="submit" variant="accent" size="lg" className="w-full" loading={busy} disabled={!password}>
            Delete everything
          </Button>
        </form>
      </Sheet>
    </>
  );
}
