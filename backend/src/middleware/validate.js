import { ApiError } from '../utils/errors.js';

const label = (path) => {
  const words = String(path.at(-1) ?? 'Input').replace(/([A-Z])/g, ' $1').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

function describe(issue) {
  const name = label(issue.path);
  const unit = issue.type === 'string' ? ' characters' : issue.type === 'array' ? ' items' : '';
  switch (issue.code) {
    case 'too_small':
      return issue.type === 'string' && issue.minimum <= 1 ? `${name} is required` : `${name} must be at least ${issue.minimum}${unit}`;
    case 'too_big':
      return `${name} must be at most ${issue.maximum}${unit}`;
    case 'invalid_type':
      return issue.received === 'undefined' ? `${name} is required` : `${name} is invalid`;
    case 'invalid_string':
      return issue.validation === 'regex' ? issue.message : `Enter a valid ${name.toLowerCase()}`;
    case 'custom':
      return issue.message;
    default:
      return `${name} is invalid`;
  }
}

/** Parses req[source] with a zod schema and replaces it with the clean, typed result. */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) throw new ApiError(400, describe(result.error.issues[0]));
  Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true, enumerable: true });
  next();
};
