import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

const MODEL = 'claude-opus-5-5';
// If the model declines a request, the API re-runs it on Anthropic's recommended fallback model in the same call.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

/** AI features exist only when ANTHROPIC_API_KEY is set on the server; the key never reaches the app. */
export const aiEnabled = Boolean(env.anthropicKey);

let client;
const claude = () => (client ??= new Anthropic({ apiKey: env.anthropicKey }));

function assertEnabled() {
  if (!aiEnabled) throw new ApiError(503, 'AI features are not set up yet');
}

/** Turns API failures into messages for the member; details stay in the server log. */
async function call(request) {
  try {
    const response = await request();
    if (response.stop_reason === 'refusal') throw new ApiError(422, "The AI assistant couldn't help with this. Try rewording it.");
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Anthropic.RateLimitError) throw new ApiError(429, 'The AI assistant is busy. Please try again in a minute.');
    if (error instanceof Anthropic.APIError) console.warn(`Claude API error ${error.status}: ${error.message}`);
    else console.warn(`Claude API call failed: ${error.message}`);
    throw new ApiError(502, "The AI assistant isn't available right now. Please try again later.");
  }
}

/** Plain text back, for writing help. Short, everyday requests run at low effort. */
export async function write(system, content) {
  assertEnabled();
  const response = await call(() =>
    claude().beta.messages.create({ model: MODEL, max_tokens: 16000, output_config: { effort: 'low' }, system, messages: [{ role: 'user', content }], ...FALLBACK }),
  );
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

/** An answer shaped by a zod schema (structured outputs), validated by the SDK. */
export async function analyse(system, content, schema) {
  assertEnabled();
  const response = await call(() =>
    claude().beta.messages.parse({ model: MODEL, max_tokens: 16000, output_config: { format: betaZodOutputFormat(schema) }, system, messages: [{ role: 'user', content }], ...FALLBACK }),
  );
  if (!response.parsed_output) throw new ApiError(502, "The AI assistant's answer couldn't be read. Please try again.");
  return response.parsed_output;
}
