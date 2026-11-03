import { Fragment } from 'react';
import { Link } from 'react-router-dom';

// The pattern the API uses to find hashtags and mentions (backend/src/utils/text.js): at the start or after a space,
// so an email address isn't read as a mention.
const TOKEN = /((?<=^|\s)[#@][\p{L}\p{N}_-]{2,40})/u;

/**
 * Plain text with #hashtags linking to their feed and @usernames to profiles. Only the members the API matched
 * (`mentions`, populated with usernames) become links. Never renders HTML.
 */
export default function RichText({ text, mentions = [] }) {
  const known = new Set(mentions.map((user) => user?.username));
  return text.split(TOKEN).map((part, index) => {
    const word = part.slice(1).toLowerCase();
    const to = index % 2 === 0 ? null : part[0] === '#' ? `/tags/${encodeURIComponent(word)}` : known.has(word) && `/u/${word}`;
    if (!to) return <Fragment key={index}>{part}</Fragment>;
    return (
      <Link key={index} to={to} className="font-medium text-brand hover:underline">
        {part}
      </Link>
    );
  });
}
