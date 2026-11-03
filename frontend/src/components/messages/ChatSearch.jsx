import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate, formatTime } from '../../lib/format';
import SearchInput from '../ui/SearchInput';
import Sheet from '../ui/Sheet';

/** Finds messages in one chat by their words, newest first. */
export default function ChatSearch({ userId, open, onClose, me, other }) {
  const [query, setQuery] = useState('');
  const q = useDebounce(query).trim();
  const { data, loading } = useApi(open && q.length > 0 ? `/messages/${userId}/search` : null, { q });

  return (
    <Sheet open={open} onClose={onClose} title="Search chat">
      <div className="space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search messages" />
        {q && !loading && !data?.items.length && <p className="py-6 text-center text-sm text-muted">No messages with “{q}”</p>}
        {!q && (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
            <Search size={15} /> Type a word to find it in this chat
          </p>
        )}
        <ul className="divide-y divide-line">
          {data?.items.map((message) => (
            <li key={message._id} className="py-2.5 text-sm">
              <p className="text-xs text-muted">
                {message.from === me ? 'You' : other?.name} · {formatDate(message.createdAt)} {formatTime(message.createdAt)}
              </p>
              <p className="whitespace-pre-line break-words">{message.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
