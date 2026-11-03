import MembershipFields, { membershipReady } from '../college/MembershipFields';
import Button from '../ui/Button';
import SelectedCollege from './SelectedCollege';

export default function RoleStep({ college, details, onChange, onBack, onNext }) {
  return (
    <div className="space-y-5">
      <SelectedCollege college={college} onChange={onBack} />
      <MembershipFields value={details} onChange={onChange} />
      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!membershipReady(details)}>
          Continue
        </Button>
      </div>
    </div>
  );
}
