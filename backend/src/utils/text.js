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

export const excerpt = (text = '', size = 80) => (text.length > size ? `${text.slice(0, size - 1)}…` : text);
