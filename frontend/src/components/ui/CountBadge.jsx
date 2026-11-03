/** The count as the badge shows it; buttons named by `aria-label` must include it (WCAG 2.5.3, label in name). */
export const badgeText = (count) => (count > 9 ? '9+' : String(count));

export default function CountBadge({ count, className = '' }) {
  if (!count) return null;
  return (
    <span className={`absolute -right-1.5 -top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-on-accent ring-2 ring-card ${className}`}>
      {badgeText(count)}
    </span>
  );
}
