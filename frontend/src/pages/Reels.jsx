import { ArrowLeft, Clapperboard } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Reel from '../components/feed/Reel';
import { useApi } from '../hooks/useApi';
import { usePaged } from '../hooks/usePaged';
import { useTitle } from '../hooks/useTitle';

/** Full-screen vertical reels to swipe through, starting at `?start=<postId>` when given. */
export default function Reels() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const start = params.get('start');
  const { data: first } = useApi(start && `/posts/${start}`);
  const reels = usePaged('/posts', { video: 1, limit: 6 });
  useTitle('Reels');
  const items = first?.video ? [first, ...reels.items.filter((post) => post._id !== first._id)] : reels.items;

  const reached = (index) => {
    if (index >= items.length - 2 && reels.hasMore && !reels.loading) reels.loadMore();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" aria-label="Back" onClick={() => (window.history.state?.idx ? navigate(-1) : navigate('/', { replace: true }))} className="pointer-events-auto grid size-10 place-items-center rounded-full transition hover:bg-white/10">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-lg font-semibold">Reels</h1>
      </header>
      <div className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain">
        {items.map((post, index) => (
          <Reel key={post._id} post={post} onActive={() => reached(index)} />
        ))}
        {!reels.loading && !items.length && (
          <div className="grid h-full place-items-center p-8 text-center">
            <div className="space-y-2">
              <Clapperboard size={40} className="mx-auto text-white/60" />
              <p className="font-display text-lg font-semibold">No reels yet</p>
              <p className="text-sm text-white/70">Post a video and it shows up here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
