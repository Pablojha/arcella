import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import SearchInput from '../ui/SearchInput';
import Sheet from '../ui/Sheet';
import { Skeleton } from '../ui/Skeleton';

/** Trending GIFs and search (through the API, which keeps the Giphy key); tapping one sends it at once. */
export default function GifSheet({ open, onClose, onPick }) {
  const [query, setQuery] = useState('');
  const { data, loading, error } = useApi(open ? '/gifs' : null, { q: useDebounce(query) });

  const pick = (gif) => {
    onPick(gif);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="GIFs" size="lg">
      <SearchInput value={query} onChange={setQuery} placeholder="Search GIFs" />
      {error && <p className="py-12 text-center text-sm text-muted">{error.message}</p>}
      <div className="mt-3 columns-2 gap-2 sm:columns-3">
        {loading && !data && Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="mb-2 h-32 w-full break-inside-avoid rounded-xl" />)}
        {data?.items.map((gif) => (
          <button key={gif.id} type="button" onClick={() => pick(gif)} className="mb-2 block w-full break-inside-avoid overflow-hidden rounded-xl bg-ink/5">
            <img src={gif.url} width={gif.width} height={gif.height} alt={gif.title} loading="lazy" className="h-auto w-full" />
          </button>
        ))}
      </div>
      {data && !data.items.length && <p className="py-12 text-center text-sm text-muted">No GIFs found. Try another search.</p>}
      {data && <p className="mt-2 text-center text-[11px] text-muted">Powered by GIPHY</p>}
    </Sheet>
  );
}
