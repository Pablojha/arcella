import { useState } from 'react';
import { FileUp, Mail } from 'lucide-react';
import Button from '../ui/Button';
import Tabs from '../ui/Tabs';
import DocumentVerify from './DocumentVerify';
import EmailVerify from './EmailVerify';
import SelectedCollege from './SelectedCollege';

const METHODS = [
  { value: 'email', label: 'College email', icon: Mail },
  { value: 'document', label: 'Document', icon: FileUp },
];

export default function MethodStep({ college, details, onBack, onVerified, onSubmitted }) {
  const hasEmail = college.domains?.length > 0;
  const [method, setMethod] = useState(hasEmail ? 'email' : 'document');

  return (
    <div className="space-y-5">
      <SelectedCollege college={college} />
      {hasEmail ? (
        <Tabs variant="pill" tabs={METHODS} value={method} onChange={setMethod} />
      ) : (
        <p className="rounded-xl bg-ink/5 px-3.5 py-3 text-sm text-muted">This college has no official email domain on Arcella yet, so membership is confirmed by document review.</p>
      )}
      {method === 'email' ? <EmailVerify college={college} details={details} onVerified={onVerified} /> : <DocumentVerify details={details} onSubmitted={onSubmitted} />}
      <Button variant="ghost" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
