import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import Avatar from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import StoryComposer from './StoryComposer';
import StoryViewer from './StoryViewer';

function Ring({ seen, children }) {
  return (
    <span className={`grid rounded-full p-[2.5px] ${seen ? 'bg-line' : 'bg-[conic-gradient(var(--brand),var(--accent),var(--brand))]'}`}>
      <span className="rounded-full bg-paper p-[2px]">{children}</span>
    </span>
  );
}

/** Horizontal row of story rings; "Your story" first. */
export default function StoriesBar({ composerOpen, onComposerOpen }) {
  const { user } = useAuth();
  const { data, setData, reload } = useApi('/stories');
  const [viewing, setViewing] = useState(null);
  const groups = data?.items ?? [];
  const mineIndex = groups.findIndex((group) => group.author._id === user._id);

  const markSeen = (storyId) =>
    setData((current) => ({
      items: current.items.map((group) => {
        const stories = group.stories.map((story) => (story._id === storyId ? { ...story, seen: true } : story));
        return { ...group, stories, seen: stories.every((story) => story.seen) };
      }),
    }));

  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      <div className="relative flex w-[72px] shrink-0 flex-col items-center gap-1.5">
        <button type="button" onClick={() => (mineIndex >= 0 ? setViewing(mineIndex) : onComposerOpen(true))}>
          <Ring seen={mineIndex < 0}>
            <Avatar user={user} size={60} />
          </Ring>
          <span className="sr-only">{mineIndex >= 0 ? 'View your story' : 'Add a story'}</span>
        </button>
        <button type="button" onClick={() => onComposerOpen(true)} aria-label="Add a story" className="absolute right-0.5 top-[46px] grid size-6 place-items-center rounded-full border-2 border-paper bg-brand text-on-brand">
          <Plus size={14} strokeWidth={3} />
        </button>
        <span className="w-full truncate text-center text-xs text-muted">Your story</span>
      </div>

      {!data && Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="size-[68px] shrink-0 rounded-full" />)}

      {groups.map(
        (group, index) =>
          index !== mineIndex && (
            <motion.button
              key={group.author._id}
              type="button"
              onClick={() => setViewing(index)}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
              className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
            >
              <Ring seen={group.seen}>
                <Avatar user={group.author} size={60} />
              </Ring>
              <span className="w-full truncate text-center text-xs">{group.author.name.split(' ')[0]}</span>
            </motion.button>
          ),
      )}

      <StoryViewer groups={groups} index={viewing} onIndex={setViewing} onSeen={markSeen} onDeleted={reload} />
      <StoryComposer open={composerOpen} onClose={() => onComposerOpen(false)} onPosted={reload} />
    </div>
  );
}
