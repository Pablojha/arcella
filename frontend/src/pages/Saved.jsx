import { Bookmark } from 'lucide-react';
import PostCard from '../components/feed/PostCard';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import PullToRefresh from '../components/ui/PullToRefresh';
import Reveal from '../components/ui/Reveal';
import { PostSkeleton } from '../components/ui/Skeleton';
import { usePaged } from '../hooks/usePaged';
import { useTitle } from '../hooks/useTitle';

export default function Saved() {
  const saved = usePaged('/posts', { saved: 1 });
  const hide = (id) => saved.setItems((items) => items.filter((item) => item._id !== id));
  useTitle('Saved');

  return (
    <PullToRefresh onRefresh={saved.reload}>
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader title="Saved" subtitle="Only you can see what you save" />
        {saved.items.map((post, index) => (
          <Reveal key={post._id} index={index}>
            <PostCard post={post} onDeleted={hide} onAuthorBlocked={(authorId) => saved.setItems((items) => items.filter((item) => item.author?._id !== authorId))} />
          </Reveal>
        ))}
        {saved.loading && !saved.items.length && <PostSkeleton />}
        {!saved.loading && !saved.items.length && <EmptyState icon={Bookmark} title="Nothing saved yet" text="Tap the bookmark on any post to keep it here." />}
        <LoadMore hasMore={saved.hasMore} loading={saved.loading} onLoad={saved.loadMore} />
      </div>
    </PullToRefresh>
  );
}
