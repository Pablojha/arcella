import { SITE } from '../../config/site';
import SiteFooter from '../layout/SiteFooter';
import PageHeader from '../ui/PageHeader';

/** A business detail Arcella's operator hasn't supplied yet, marked so nobody mistakes it for real information. */
export function Missing({ children }) {
  return <mark className="rounded bg-accent/15 px-1 font-medium text-ink">[To be confirmed: {children}]</mark>;
}

/** The address for privacy, legal and support requests (or a marked placeholder until there is one). */
export function ContactEmail() {
  if (!SITE.contactEmail) return <Missing>contact email</Missing>;
  return (
    <a href={`mailto:${SITE.contactEmail}`} className="font-medium text-brand hover:underline">
      {SITE.contactEmail}
    </a>
  );
}

/** The shared layout of the policy pages: title, last-updated date, "On this page" links and numbered sections. */
export default function LegalPage({ title, intro, sections }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={title} subtitle={`Last updated ${SITE.policiesUpdated}`} />
      <article className="card p-5 md:p-8">
        <p className="text-[15px] leading-relaxed">{intro}</p>
        {sections.length > 3 && (
          <nav aria-label="On this page" className="mt-5 rounded-2xl bg-ink/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">On this page</p>
            <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {sections.map(({ id, title: heading }, index) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-brand hover:underline">
                    {index + 1}. {heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="mt-6 space-y-7">
          {sections.map(({ id, title: heading, body }, index) => (
            <section key={id} id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
              <h2 id={`${id}-title`} className="font-display text-lg font-semibold">
                {index + 1}. {heading}
              </h2>
              <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink/85 [&_a]:underline [&_a]:underline-offset-2 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">{body}</div>
            </section>
          ))}
        </div>
      </article>
      <SiteFooter className="mt-8 px-1" />
    </div>
  );
}
