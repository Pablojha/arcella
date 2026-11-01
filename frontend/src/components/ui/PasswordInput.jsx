import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({ value, onChange, autoComplete = 'current-password', minLength = 1 }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative block">
      <input type={shown ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} required minLength={minLength} maxLength={100} autoComplete={autoComplete} className="input pr-11" />
      <button type="button" onClick={() => setShown((visible) => !visible)} aria-label={shown ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-ink/5">
        {shown ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  );
}
