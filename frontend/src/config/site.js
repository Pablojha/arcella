/**
 * Facts about Arcella used on the legal pages and in search and social previews. Business details that Arcella's
 * operator still has to confirm are null: the legal pages show them as clearly marked placeholders until filled in.
 */
export const SITE = {
  name: 'Arcella',
  url: (import.meta.env.VITE_SITE_URL || 'https://arcella-seven.vercel.app').replace(/\/+$/, ''),
  description: 'Arcella is the professional network for architecture students, alumni, faculty and firms in India.',
  /** Legal name of the person or company that runs Arcella. */
  operator: null,
  /** Public address for privacy, legal and support requests. */
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || null,
  /** Postal address (or at least city and state) for legal notices. */
  address: null,
  /** The law and courts that govern the Terms, e.g. "the laws of India; courts of Roorkee, Uttarakhand". */
  governingLaw: null,
  policiesUpdated: '3 November 2026',
};
