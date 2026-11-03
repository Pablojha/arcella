import { useId } from 'react';
import { BATCH_YEARS, COLLEGE_ROLES, DEGREE_LEVELS } from '../../lib/constants';
import Field from '../ui/Field';

/** Only the details that apply: faculty have no degree or years. */
export const membershipDetails = ({ role, level, degree, batch, graduation }) =>
  role === 'faculty' ? { role } : { role, level: level || undefined, degree: degree?.trim() || undefined, batch: batch || undefined, graduation: graduation || undefined };

/** Students and alumni need a degree level and the year they joined; faculty need nothing more. */
export const membershipReady = (details) => details.role === 'faculty' || Boolean(details.level && details.batch);

function Choices({ options, value, onChange, isDisabled = () => false }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={isDisabled(option)}
          onClick={() => onChange(option.value)}
          className={`rounded-2xl border p-3 text-left transition disabled:opacity-50 ${value === option.value ? 'border-brand bg-brand/10 ring-4 ring-brand/10' : 'border-line bg-card hover:border-ink/30'}`}
        >
          <span className="block text-sm font-semibold">{option.label}</span>
          <span className="mt-0.5 block text-[11px] leading-tight text-muted">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Role, degree level, degree and years at one college, for adding education and for verification. A verified entry
 * keeps its batch and faculty status (they decide who can see and message whom); the rest stays editable.
 */
export default function MembershipFields({ value, onChange, verified = false }) {
  const degreesId = useId();
  const faculty = value.role === 'faculty';
  const level = DEGREE_LEVELS.find((option) => option.value === value.level);
  const set = (key) => (event) => onChange({ [key]: event.target.value });

  return (
    <div className="space-y-5">
      <Field as="div" label="At this college I am" hint={verified ? 'Verified members can switch between student and alumni.' : undefined}>
        <Choices options={COLLEGE_ROLES} value={value.role} onChange={(role) => onChange({ role })} isDisabled={(option) => verified && (faculty || option.value === 'faculty')} />
      </Field>
      {!faculty && (
        <>
          <Field as="div" label="Degree level">
            <Choices options={DEGREE_LEVELS} value={value.level} onChange={(choice) => onChange({ level: choice })} />
          </Field>
          <Field label="Degree" hint="For example B.Arch, M.Arch in Urban Design or PhD">
            <input value={value.degree ?? ''} onChange={set('degree')} maxLength={80} list={degreesId} className="input" placeholder={level?.degrees[0] ?? 'B.Arch'} />
            <datalist id={degreesId}>
              {(level?.degrees ?? DEGREE_LEVELS.flatMap((option) => option.degrees)).map((degree) => (
                <option key={degree} value={degree} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Batch year" hint={verified ? 'Verified, so it stays as is' : 'The year you joined'}>
              <select value={value.batch ?? ''} onChange={set('batch')} disabled={verified} className="input">
                <option value="">Select year</option>
                {BATCH_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Finishing year" hint={value.role === 'student' ? 'Expected (optional)' : 'Optional'}>
              <select value={value.graduation ?? ''} onChange={set('graduation')} className="input">
                <option value="">Not set</option>
                {BATCH_YEARS.filter((year) => !value.batch || year >= Number(value.batch)).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </>
      )}
    </div>
  );
}
