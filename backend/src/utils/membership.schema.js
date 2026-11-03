import { COLLEGE_ROLES, DEGREE_LEVELS } from '../config/constants.js';
import { int, objectId, text, z } from './zod.js';

const thisYear = new Date().getFullYear();

/** What a member says about one college: their role there and, for students and alumni, the degree and years. */
export const membershipDetails = {
  college: objectId,
  role: z.enum(COLLEGE_ROLES),
  level: z.preprocess((value) => (value === '' || value === null ? undefined : value), z.enum(DEGREE_LEVELS).optional()),
  degree: text(80).optional(),
  batch: int(1950, thisYear + 6),
  graduation: int(1950, thisYear + 12),
};

/** Students and alumni give the year they joined, and finish no earlier; `needsLevel` also asks for the degree level. */
export const membershipRules = (schema, { needsLevel = false } = {}) =>
  schema
    .refine((data) => data.role === 'faculty' || Boolean(data.batch), { message: 'Batch year is required', path: ['batch'] })
    .refine((data) => !needsLevel || data.role === 'faculty' || Boolean(data.level), { message: 'Choose the degree level', path: ['level'] })
    .refine((data) => !data.graduation || !data.batch || data.graduation >= data.batch, { message: 'The finishing year must be the batch year or later', path: ['graduation'] });
