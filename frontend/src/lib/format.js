import { API_URL } from './api';

const UNITS = [
  ['y', 31_536_000],
  ['mo', 2_592_000],
  ['w', 604_800],
  ['d', 86_400],
  ['h', 3_600],
  ['m', 60],
];

/**
 * Local uploads are "/uploads/..." paths on the API host. Cloudinary images get a resized,
 * auto-format, auto-quality variant when `width` is given, which keeps phones fast.
 */
export function mediaUrl(url, width) {
  if (!url) return '';
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return width && url.includes('/image/upload/') ? url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`) : url;
}

/**
 * Cloudinary videos stream as a 720px MP4 every phone can play (iPhones record .mov); `poster` gives their
 * first frame as an image instead. Local uploads play as they are and have no poster.
 */
export function videoUrl(url, poster = false) {
  if (!url?.includes('/video/upload/')) return poster ? '' : mediaUrl(url);
  const variant = url.replace('/video/upload/', `/video/upload/${poster ? 'so_0,' : ''}q_auto,c_limit,w_720/`);
  return variant.replace(/\.\w+$/, poster ? '.jpg' : '.mp4');
}

/** Compact age for bylines: "now", "5m", "3d". */
export function timeAgo(date) {
  const seconds = (Date.now() - new Date(date)) / 1000;
  const [unit, size] = UNITS.find(([, length]) => seconds >= length) ?? [];
  return unit ? `${Math.floor(seconds / size)}${unit}` : 'now';
}

/** Age for use inside a sentence: "just now", "5m ago". */
export const ago = (date) => (timeAgo(date) === 'now' ? 'just now' : `${timeAgo(date)} ago`);

export const formatDate = (date, options = { day: 'numeric', month: 'short', year: 'numeric' }) => new Date(date).toLocaleDateString('en-IN', options);

export const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export const hueOf = (text = '') => [...text].reduce((hue, char) => (hue * 31 + char.charCodeAt(0)) % 360, 7);

export const fileSize = (bytes = 0) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

export const labelOf = (options, value) => options.find((option) => option.value === value)?.label ?? value;

export function calendarUrl({ title, description, start, end, venue, online, link }) {
  const stamp = (date) => new Date(date).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: description || '',
    location: (online ? link : venue) || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
