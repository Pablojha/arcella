import { useState } from 'react';
import { motion } from 'framer-motion';
import { Image, Newspaper, Plus } from 'lucide-react';
import CreatePost from '../components/feed/CreatePost';
import PostCard from '../components/feed/PostCard';
import StoriesBar from '../components/feed/StoriesBar';
import ProfileCard from '../components/home/ProfileCard';
import ProfileStrength from '../components/home/ProfileStrength';
import Suggestions from '../components/home/Suggestions';
import UpcomingEvents from '../components/home/UpcomingEvents';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import PullToRefresh from '../components/ui/PullToRefresh';
import Reveal from '../components/ui/Reveal';
import { ListSkeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import { useAuth } from '../context/AuthContext';
import { usePaged } from '../hooks/usePaged';
import { useTitle } from '../hooks/useTitle';

const SCOPES = [
  { value: 'all', label: 'For you' },
  { value: 'network', label: 'My network' },
];

export default function Home() {
  const { user } = useAuth();
  const [scope, setScope] = useState('all');
  const [composing, setComposing] = useState(false);
  const [addingStory, setAddingStory] = useState(false);
  const feed = usePaged('/posts', { scope });
  const hide = (keep) => feed.setItems((items) => items.filter(keep));
  useTitle('Home');

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)_290px]">
      <aside className="hidden lg:block">
        <div className="sticky top-22">
          <ProfileCard />
        </div>
      </aside>

      <PullToRefresh onRefresh={feed.reload}>
        <section className="min-w-0 space-y-4">
          <StoriesBar composerOpen={addingStory} onComposerOpen={setAddingStory} />
          <ProfileStrength />
          <button type="button" onClick={() => setComposing(true)} className="card hidden w-full items-center gap-3 p-3 text-left transition hover:border-ink/25 md:flex">
            <Avatar user={user} size={42} />
            <span className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm text-muted">Share a sketch, a site visit, a jury moment…</span>
            <Image size={20} className="mr-2 text-brand" />
          </button>
          <Tabs tabs={SCOPES} value={scope} onChange={setScope} />
          {feed.items.map((post, index) => (
            <Reveal key={post._id} index={index}>
              <PostCard post={post} onDeleted={(id) => hide((item) => item._id !== id)} onAuthorBlocked={(authorId) => hide((item) => item.author?._id !== authorId)} />
            </Reveal>
          ))}
          {feed.loading && !feed.items.length && <ListSkeleton count={2} lines={3} />}
          {!feed.loading && !feed.items.length && (
            <EmptyState icon={Newspaper} title={scope === 'network' ? 'Your network is quiet' : 'No posts yet'} text="Be the first to share something with the community." />
          )}
          <LoadMore hasMore={feed.hasMore} loading={feed.loading} onLoad={feed.loadMore} />
        </section>
      </PullToRefresh>

      <aside className="hidden space-y-4 lg:block">
        <Suggestions />
        <UpcomingEvents />
      </aside>

      <motion.button
        type="button"
        aria-label="Create a post"
        onClick={() => setComposing(true)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.3 }}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 grid size-14 place-items-center rounded-full bg-brand text-on-brand shadow-xl shadow-brand/30 md:hidden"
      >
        <Plus size={26} strokeWidth={2.5} />
      </motion.button>

      <CreatePost open={composing} onClose={() => setComposing(false)} onCreated={(post) => feed.setItems((items) => [post, ...items])} onStory={() => setAddingStory(true)} />
    </div>
  );
}
