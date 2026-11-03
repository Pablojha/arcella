export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchRegex = (text) => new RegExp(escapeRegex(text.trim()), 'i');

export const slugify = (text) =>
  text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'item';

const suffix = () => Math.random().toString(36).slice(2, 6);

export const randomSlug = (text) => `${slugify(text)}-${suffix()}`;

export async function uniqueSlug(Model, text, field = 'slug') {
  const base = slugify(text);
  return (await Model.exists({ [field]: base })) ? `${base}-${suffix()}` : base;
}

// #hashtags and @mentions: at the start or after a space (so emails don't count), 2–40 letters, digits, _ or -.
// The app's RichText component uses the same pattern.
const TOKENS = /(?<=^|\s)([#@])([\p{L}\p{N}_-]{2,40})/gu;

/** The hashtags and @usernames in a text, lowercased and unique (10 of each at most). */
export function tokensOf(text = '') {
  const tags = new Set();
  const usernames = new Set();
  for (const [, kind, word] of text.matchAll(TOKENS)) (kind === '#' ? tags : usernames).add(word.toLowerCase());
  return { tags: [...tags].slice(0, 10), usernames: [...usernames].slice(0, 10) };
}

export const excerpt = (text = '', size = 80) => (text.length > size ? `${text.slice(0, size - 1)}…` : text);
