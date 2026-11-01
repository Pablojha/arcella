import { BATCH_YEARS, COLLEGE_ROLES } from '../../lib/constants';
import Button from '../ui/Button';
import Field from '../ui/Field';
import SelectedCollege from './SelectedCollege';

export default function RoleStep({ college, role, batch, onChange, onBack, onNext }) {
  const needsBatch = role !== 'faculty';
  return (
    <div className="space-y-5">
      <SelectedCollege college={college} onChange={onBack} />
      <Field as="div" label="At this college I am">
        <div className="grid grid-cols-3 gap-2">
          {COLLEGE_ROLES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ role: option.value })}
              className={`rounded-2xl border p-3 text-left transition ${role === option.value ? 'border-brand bg-brand/10 ring-4 ring-brand/10' : 'border-line bg-card hover:border-ink/30'}`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-muted">{option.hint}</span>
            </button>
          ))}
        </div>
      </Field>
      {needsBatch && (
        <Field label="Batch year" hint="The year you joined the course">
          <select value={batch} onChange={(event) => onChange({ batch: event.target.value })} className="input">
            <option value="">Select year</option>
            {BATCH_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="flex justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={needsBatch && !batch}>
          Continue
        </Button>
      </div>
    </div>
  );
}
