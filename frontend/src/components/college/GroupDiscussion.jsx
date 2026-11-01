import { useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePaged } from '../../hooks/usePaged';
import CreatePost from '../feed/CreatePost';
import PostCard from '../feed/PostCard';
import Avatar from '../ui/Avatar';
import EmptyState from '../ui/EmptyState';
import LoadMore from '../ui/LoadMore';
import PullToRefresh from '../ui/PullToRefresh';
import Reveal from '../ui/Reveal';
import { ListSkeleton } from '../ui/Skeleton';

export default function GroupDiscussion({ college }) {
  const { user } = useAuth();
  const feed = usePaged('/posts', { college: college._id });
  const [composing, setComposing] = useState(false);
  const hide = (keep) => feed.setItems((items) => items.filter(keep));

  return (
    <PullToRefresh onRefresh={feed.reload}>
      <div className="space-y-4">
        <button type="button" onClick={() => setComposing(true)} className="card flex w-full items-center gap-3 p-3 text-left transition hover:border-ink/25">
          <Avatar user={user} size={40} />
          <span className="flex-1 truncate rounded-full border border-line px-4 py-2.5 text-sm text-muted">Start a discussion with {college.short ?? 'your college'}…</span>
        </button>
        {feed.items.map((post, index) => (
          <Reveal key={post._id} index={index}>
            <PostCard post={post} canModerate={college.moderator} onDeleted={(id) => hide((item) => item._id !== id)} onAuthorBlocked={(authorId) => hide((item) => item.author?._id !== authorId)} />
          </Reveal>
        ))}
        {feed.loading && !feed.items.length && <ListSkeleton count={2} />}
        {!feed.loading && !feed.items.length && <EmptyState icon={MessagesSquare} title="Quiet in here" text="Ask about studio schedules, share jury dates or plan a site visit." />}
        <LoadMore hasMore={feed.hasMore} loading={feed.loading} onLoad={feed.loadMore} />
        <CreatePost open={composing} onClose={() => setComposing(false)} college={college._id} onCreated={(post) => feed.setItems((items) => [post, ...items])} />
      </div>
    </PullToRefresh>
  );
}
