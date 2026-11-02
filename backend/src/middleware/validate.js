import { ApiError } from '../utils/errors.js';

const label = (path) => {
  const words = String(path.at(-1) ?? 'Input').replace(/([A-Z])/g, ' $1').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const valueAt = (input, path) => path.reduce((value, key) => value?.[key], input);

/** One plain-English sentence for the first problem zod found, e.g. "Name must be at least 2 characters". */
function describe(issue, input) {
  const name = label(issue.path);
  const unit = issue.origin === 'string' ? ' characters' : issue.origin === 'array' ? ' items' : '';
  switch (issue.code) {
    case 'too_small':
      return issue.origin === 'string' && issue.minimum <= 1 ? `${name} is required` : `${name} must be at least ${issue.minimum}${unit}`;
    case 'too_big':
      return `${name} must be at most ${issue.maximum}${unit}`;
    case 'invalid_type':
      return valueAt(input, issue.path) === undefined ? `${name} is required` : `${name} is invalid`;
    case 'invalid_format':
      return issue.format === 'regex' ? issue.message : `Enter a valid ${name.toLowerCase()}`;
    case 'custom':
      return issue.message;
    default:
      return `${name} is invalid`;
  }
}

/** Parses req[source] with a zod schema and replaces it with the clean, typed result. */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const input = req[source] ?? {};
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, describe(result.error.issues[0], input));
  Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true, enumerable: true });
  next();
};
