import api from './api';

const MINUTE = 60_000;
const UPLOAD_TIMEOUT_MS = 15 * 60_000;
let localId = 0;
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const PICTOGRAPH = /\p{Extended_Pictographic}/u;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Messages of 1–3 emoji and nothing else show large, without a bubble. */
export function isEmojiOnly(text = '') {
  const parts = [...graphemes.segment(text.replace(/\s/g, ''))].map(({ segment }) => segment);
  return parts.length > 0 && parts.length <= 3 && parts.every((part) => PICTOGRAPH.test(part) && !LETTER_OR_DIGIT.test(part));
}

/** A time separator goes above the first message and after any gap longer than 15 minutes. */
export const startsNewSection = (previous, message) => !previous || new Date(message.createdAt) - new Date(previous.createdAt) > 15 * MINUTE;

const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** "9:41 pm" today, "Yesterday 9:41 pm", "Mon 9:41 pm" this week, otherwise "12 Oct, 9:41 pm". */
export function separatorLabel(value) {
  const date = new Date(value);
  const now = new Date();
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const days = Math.round((dayStart(now) - dayStart(date)) / (1440 * MINUTE));
  if (days === 0) return time;
  if (days === 1) return `Yesterday ${time}`;
  if (days < 7) return `${date.toLocaleDateString('en-IN', { weekday: 'short' })} ${time}`;
  const year = date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' };
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...year })}, ${time}`;
}

/** "0:07", "12:30" */
export const clock = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** Peak levels (0–1) of a recording in `bars` slices, drawn as the voice note's waveform. */
export async function waveformOf(blob, bars = 32) {
  const context = new AudioContext();
  try {
    const samples = (await context.decodeAudioData(await blob.arrayBuffer())).getChannelData(0);
    const size = Math.max(1, Math.floor(samples.length / bars));
    const peaks = Array.from({ length: bars }, (_, bar) => {
      let peak = 0;
      for (let index = bar * size; index < (bar + 1) * size && index < samples.length; index += 1) peak = Math.max(peak, Math.abs(samples[index]));
      return peak;
    });
    const loudest = Math.max(...peaks, 0.01);
    return peaks.map((peak) => Math.round((peak / loudest) * 100) / 100);
  } catch {
    return [];
  } finally {
    context.close();
  }
}

/** Adds messages not already in the list (they can arrive both from a request and over the socket). */
export const mergeMessages = (current, incoming) => [...current, ...incoming.filter((message) => !current.some((old) => old._id === message._id))];

/** Swaps a pending message for the saved one, which may already have arrived over the socket. */
export const settleMessage = (items, id, saved) => items.filter((message) => message._id !== saved._id).map((message) => (message._id === id ? saved : message));

/** A just-sent message shown at once, before the server has it. */
export function pendingMessage(item, sender) {
  const { kind, file, url, width, height, duration, waveform } = item;
  const content = {
    text: { text: item.text },
    gif: { gif: item.gif },
    voice: { voice: { url, duration, waveform } },
    image: { media: { url, kind, width, height } },
    video: { media: { url, kind, width, height, duration } },
  }[kind];
  return { _id: `local-${++localId}`, ...sender, createdAt: new Date().toISOString(), status: 'sending', progress: 0, ...content, file, upload: { kind, width, height, duration, waveform } };
}

/**
 * Sends a pending message to a chat at `base` (a conversation or a college group): JSON for text and GIFs, an upload
 * to `base/attachments` with progress for photos, videos and voice notes.
 */
export function sendMessage(base, message, onProgress) {
  if (!message.file) return api.post(base, message.gif ? { gif: message.gif } : { text: message.text });
  const { kind, width, height, duration, waveform } = message.upload;
  const form = new FormData();
  Object.entries({ kind, width, height, duration, waveform: waveform?.length ? JSON.stringify(waveform) : undefined }).forEach(([key, value]) => value != null && form.append(key, value));
  form.append('file', message.file);
  return api.post(`${base}/attachments`, form, { timeout: UPLOAD_TIMEOUT_MS, onUploadProgress: ({ loaded, total }) => total && onProgress(loaded / total) });
}
