import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTitle } from '../../hooks/useTitle';

/** Pass `as="p"` on detail pages, where the item's own title is the page's one h1 and this only names its kind. */
export default function PageHeader({ title, subtitle, action, back, as: Title = 'h1' }) {
  useTitle(title);
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-1">
        {back && (
          <Link to={back} aria-label="Back" className="-ml-2 mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-ink/80 hover:bg-ink/5">
            <ArrowLeft size={20} />
          </Link>
        )}
        <div className="min-w-0">
          <Title className="font-display text-2xl font-bold tracking-tight md:text-[28px]">{title}</Title>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
