import { Link } from 'react-router-dom';
import { SITE } from '../../config/site';
import { openStorageSettings } from '../../lib/consent';
import Logo from '../brand/Logo';

export const LEGAL_LINKS = [
  ['/terms', 'Terms'],
  ['/privacy', 'Privacy'],
  ['/cookies', 'Cookies'],
  ['/refunds', 'Refunds'],
];

/** Copyright, the policy pages and cookie settings. `compact` fits the app's sidebar and the More page. */
export default function SiteFooter({ compact = false, className = '' }) {
  const link = 'rounded transition hover:text-ink hover:underline';
  return (
    <footer className={`text-muted ${compact ? 'space-y-2 text-xs' : 'flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between'} ${className}`}>
      <p className="flex items-center gap-2">
        {!compact && <Logo size={22} />}© {new Date().getFullYear()} {SITE.name}
      </p>
      <nav aria-label="Policies" className="flex flex-wrap gap-x-4 gap-y-1.5">
        {!compact && (
          <Link to="/explore" className={link}>
            Explore
          </Link>
        )}
        {LEGAL_LINKS.map(([to, label]) => (
          <Link key={to} to={to} className={link}>
            {label}
          </Link>
        ))}
        <button type="button" onClick={openStorageSettings} className={link}>
          Cookie settings
        </button>
      </nav>
    </footer>
  );
}
