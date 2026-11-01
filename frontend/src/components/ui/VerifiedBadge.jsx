import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ size = 15 }) {
  return (
    <span title="Verified college member" className="inline-flex shrink-0 text-brand">
      <BadgeCheck size={size} aria-label="Verified" />
    </span>
  );
}
