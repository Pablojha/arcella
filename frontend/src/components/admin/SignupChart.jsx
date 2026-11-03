import { useState } from 'react';

/** Weekly sign-ups for the last 12 weeks (oldest first): one series in the brand colour, a tooltip per bar, a table for screen readers. */
export default function SignupChart({ weeks }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...weeks);
  const label = (index) => (index === weeks.length - 1 ? 'This week' : `${weeks.length - 1 - index} wk ago`);

  return (
    <figure className="card p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="font-semibold">New members per week</span>
        <span className="text-xs text-muted">Last 12 weeks</span>
      </figcaption>
      <div className="relative flex h-32 items-end gap-0.5 border-b border-line" aria-hidden="true">
        {weeks.map((count, index) => (
          <div key={index} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)}>
            <div className={`w-full rounded-t-[4px] bg-brand transition-opacity ${active !== null && active !== index ? 'opacity-50' : ''}`} style={{ height: `${(count / max) * 100}%`, minHeight: count ? 2 : 0 }} />
            {active === index && (
              <span className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-card px-2 py-1 text-xs shadow-sm">
                <b className="tabular-nums">{count}</b> · {label(index)}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted" aria-hidden="true">
        <span>12 wk ago</span>
        <span>This week</span>
      </div>
      <table className="sr-only">
        <caption>New members per week</caption>
        <tbody>
          {weeks.map((count, index) => (
            <tr key={index}>
              <th scope="row">{label(index)}</th>
              <td>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
