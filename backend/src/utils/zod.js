import { z } from 'zod';
import { isObjectIdOrHexString } from 'mongoose';

export { z };

const blank = (value) => value === undefined || value === null || value === '';
const toList = (value) => (Array.isArray(value) ? value : String(value).split(',')).map((item) => String(item).trim()).filter(Boolean);

function normalizeLink(value) {
  if (typeof value !== 'string' || !value.trim()) return value;
  const link = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link)) return `mailto:${link}`;
  return /^[a-z][\w+.-]*:/i.test(link) ? link : `https://${link}`;
}

const LINK_PATTERN = /^(https?:\/\/[^\s/]+\.[^\s]+|mailto:\S+@\S+)$/i;

export const objectId = z.string().refine(isObjectIdOrHexString, 'Invalid id');
export const optionalId = z.preprocess((value) => (blank(value) ? undefined : value), objectId.optional());
export const text = (max = 200) => z.string().trim().max(max);
export const required = (max = 200, min = 1) => z.string().trim().min(min).max(max);
export const email = z.string().trim().toLowerCase().email();

/** Accepts an array or a comma-separated string (multipart forms). */
export const list = (max = 20, size = 40) =>
  z.preprocess((value) => (value == null ? undefined : toList(value)), z.array(z.string().max(size)).max(max).optional());

export const bool = z.preprocess(
  (value) => (blank(value) ? undefined : value === true || value === 'true' || value === '1' || value === 'on'),
  z.boolean().optional(),
);

export const int = (min, max) => z.preprocess((value) => (blank(value) ? undefined : value), z.coerce.number().int().min(min).max(max).optional());

export const date = z.preprocess((value) => (blank(value) ? undefined : value), z.coerce.date().optional());

/** Website or apply link: adds https:// when missing, turns emails into mailto:, rejects any other protocol. */
export const link = z.preprocess(normalizeLink, z.string().max(300).refine((value) => value === '' || LINK_PATTERN.test(value), 'Enter a valid link').optional());
export const requiredLink = z.preprocess(normalizeLink, z.string().min(1).max(300).refine((value) => LINK_PATTERN.test(value), 'Enter a valid link'));

/** Paged list query; empty params from the client are ignored. */
export const listQuery = (shape = {}) =>
  z.preprocess(
    (query) => Object.fromEntries(Object.entries(query ?? {}).filter(([, value]) => value !== '')),
    z.object({
      page: z.coerce.number().int().min(1).max(500).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(12),
      q: text(80).optional(),
      ...shape,
    }),
  );
