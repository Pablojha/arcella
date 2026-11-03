import { Plus, X } from 'lucide-react';
import Button, { IconButton } from '../ui/Button';

const blank = () => ({ key: crypto.randomUUID(), name: '', issuer: '', year: '', url: '' });

/** Certifications as rows: name, who issued it, year and an optional link to verify it. */
export default function CertificationsEditor({ value, onChange }) {
  const update = (key, changes) => onChange(value.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  return (
    <div className="space-y-3">
      {value.map((item) => (
        <div key={item.key} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-line p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={item.name} onChange={(event) => update(item.key, { name: event.target.value })} required maxLength={100} aria-label="Certification" className="input" placeholder="Certification, e.g. LEED Green Associate" />
            <input value={item.issuer ?? ''} onChange={(event) => update(item.key, { issuer: event.target.value })} maxLength={100} aria-label="Issued by" className="input" placeholder="Issued by" />
            <input value={item.year ?? ''} onChange={(event) => update(item.key, { year: event.target.value })} inputMode="numeric" maxLength={4} aria-label="Year" className="input" placeholder="Year" />
            <input value={item.url ?? ''} onChange={(event) => update(item.key, { url: event.target.value })} maxLength={300} aria-label="Link" className="input" placeholder="Link to verify (optional)" />
          </div>
          <IconButton icon={X} label="Remove certification" onClick={() => onChange(value.filter((other) => other.key !== item.key))} />
        </div>
      ))}
      {value.length < 20 && (
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => onChange([...value, blank()])}>
          Add certification
        </Button>
      )}
    </div>
  );
}
