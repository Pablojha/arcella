import { decimal, int, text, z } from '../utils/zod.js';

const parseJson = (value) => {
  try {
    return typeof value === 'string' && value ? JSON.parse(value) : undefined;
  } catch {
    return value;
  }
};

const giphyUrl = z.string().url().refine((url) => /^https:\/\/(media\d?|i)\.giphy\.com\//.test(url), 'Pick a GIF from the GIF search');

/** A text message or a GIF, in a direct chat or a college group. */
export const sendSchema = z
  .object({ text: text(2000).optional(), gif: z.object({ url: giphyUrl, width: int(1, 4000), height: int(1, 4000) }).optional() })
  .refine((body) => body.text || body.gif, { message: 'Write a message' });

/** A photo, video or voice note, measured by the sender's app. */
export const attachmentSchema = z.object({
  kind: z.enum(['image', 'video', 'voice']),
  width: int(1, 20000),
  height: int(1, 20000),
  duration: decimal(0, 3600),
  waveform: z.preprocess(parseJson, z.array(z.number().min(0).max(1)).max(64).optional()),
});

/** One emoji and nothing else. */
export const reactionSchema = z.object({
  emoji: z
    .string()
    .trim()
    .min(1)
    .max(16)
    .refine((value) => /\p{Extended_Pictographic}/u.test(value) && !/[\p{L}\p{N}<>]/u.test(value), 'Pick an emoji'),
});
