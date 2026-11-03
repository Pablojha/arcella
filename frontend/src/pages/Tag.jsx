import { Hash } from 'lucide-react';
import { useParams } from 'react-router-dom';
import PostCard from '../components/feed/PostCard';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import { ListSkeleton } from '../components/ui/Skeleton';
import { usePaged } from '../hooks/usePaged';

/** Every public post with a hashtag, newest first. */
export default function Tag() {
  const tag = useParams().tag.toLowerCase();
  const posts = usePaged('/posts', { tag });
  const hide = (test) => posts.setItems((items) => items.filter(test));

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={`#${tag}`} subtitle="Posts with this hashtag" back="/" />
      <div className="space-y-4">
        {posts.items.map((post) => (
          <PostCard key={post._id} post={post} onDeleted={(id) => hide((item) => item._id !== id)} onAuthorBlocked={(authorId) => hide((item) => item.author?._id !== authorId)} />
        ))}
        {posts.loading && <ListSkeleton count={2} lines={3} />}
        {posts.error && <EmptyState icon={Hash} title="Couldn't load this hashtag" text={posts.error.message} />}
        {!posts.loading && !posts.error && !posts.items.length && <EmptyState icon={Hash} title={`No posts with #${tag} yet`} text="Add it to a post to start the conversation." />}
        <LoadMore hasMore={posts.hasMore} loading={posts.loading} onLoad={posts.loadMore} />
      </div>
    </div>
  );
}
