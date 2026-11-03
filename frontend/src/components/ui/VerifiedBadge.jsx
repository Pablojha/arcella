import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ size = 15, title = 'Verified college member' }) {
  return (
    <span title={title} className="inline-flex shrink-0 text-brand">
      <BadgeCheck size={size} aria-label="Verified" />
    </span>
  );
}
