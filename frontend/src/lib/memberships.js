import { COLLEGE_ROLES, DEGREE_LEVELS } from './constants';
import { labelOf } from './format';

export const idOf = (value) => value?._id ?? value;

const verifiedEntries = (user) => (user?.memberships ?? []).filter((entry) => entry.verified);

/** The colleges whose private groups the user belongs to, the main one first. */
export function memberColleges(user) {
  const colleges = new Map();
  const entries = verifiedEntries(user).sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)));
  for (const { college } of entries) if (college && !colleges.has(idOf(college))) colleges.set(idOf(college), college);
  return [...colleges.values()];
}

/** The user's verified memberships of one college (an undergraduate and a postgraduate degree, say). */
export const entriesAt = (user, collegeId) => verifiedEntries(user).filter((entry) => idOf(entry.college) === collegeId);

/** What someone studied or does there: "B.Arch · Undergraduate", or "Faculty". */
export function entryTitle(entry) {
  if (entry.role === 'faculty') return 'Faculty';
  return [entry.degree, labelOf(DEGREE_LEVELS, entry.level)].filter(Boolean).join(' · ') || labelOf(COLLEGE_ROLES, entry.role);
}

/** When: "2019 – 2024 · Alumni" or "Batch 2022 · Student" (the role only when the title doesn't say it already). */
export function entryYears(entry) {
  if (entry.role === 'faculty') return '';
  const years = entry.graduation ? `${entry.batch ?? '…'} – ${entry.graduation}` : entry.batch ? `Batch ${entry.batch}` : '';
  return [years, (entry.degree || entry.level) && labelOf(COLLEGE_ROLES, entry.role)].filter(Boolean).join(' · ');
}
