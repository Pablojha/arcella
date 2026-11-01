import { useEffect } from 'react';
import { ArrowBigUp, BadgeCheck, Bell, CircleAlert, CircleCheck, HandHeart, Heart, MessageSquare, MessageSquareText, Repeat2, Shield, ShieldCheck, TriangleAlert, UserCheck, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/brand/Logo';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import PullToRefresh from '../components/ui/PullToRefresh';
import Reveal from '../components/ui/Reveal';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useBadges } from '../context/BadgeContext';
import { usePaged } from '../hooks/usePaged';
import api from '../lib/api';
import { timeAgo } from '../lib/format';

const TYPES = {
  like: { icon: Heart, text: 'liked your post' },
  comment: { icon: MessageSquare, text: 'commented on your post' },
  repost: { icon: Repeat2, text: 'reposted your post' },
  important: { icon: TriangleAlert, text: 'posted something important' },
  college_role: { icon: Shield, text: 'made you a group admin' },
  connect_request: { icon: UserPlus, text: 'wants to connect' },
  connect_accept: { icon: UserCheck, text: 'accepted your connection request' },
  appreciate: { icon: HandHeart, text: 'appreciated your project' },
  critique: { icon: MessageSquareText, text: 'critiqued your project' },
  verify_approved: { icon: BadgeCheck, text: 'Your college verification was approved. Welcome to the group!' },
  verify_rejected: { icon: CircleAlert, text: 'Your college verification was not approved' },
  verify_request: { icon: ShieldCheck, text: 'asked to verify their college membership' },
  mentor_request: { icon: HandHeart, text: 'requested a mentoring session' },
  mentor_update: { icon: HandHeart, text: 'updated your mentoring session' },
  answer: { icon: ArrowBigUp, text: 'answered your question' },
  accepted: { icon: CircleCheck, text: 'accepted your answer' },
};

const SYSTEM = new Set(['verify_approved', 'verify_rejected']);

export default function Notifications() {
  const { refresh } = useBadges();
  const { items, loading, hasMore, loadMore, reload } = usePaged('/notifications', { limit: 20 });

  useEffect(() => {
    api.post('/notifications/read').then(refresh).catch(() => {});
  }, [refresh]);

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Notifications" />
        <div className={items.length ? 'card divide-y divide-line overflow-hidden' : ''}>
          {items.map((note, index) => {
            const { icon: Icon, text } = TYPES[note.type] ?? { icon: Bell, text: 'sent you an update' };
            const system = SYSTEM.has(note.type) && !note.actor;
            return (
              <Reveal key={note._id} index={index}>
                <Link to={note.link || '/'} className={`flex items-start gap-3 px-4 py-3.5 transition hover:bg-ink/5 ${note.read ? '' : 'bg-brand/[0.06]'}`}>
                  <span className="relative shrink-0">
                    {system ? <Logo size={42} /> : <Avatar user={note.actor} size={42} />}
                    <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-card bg-brand text-on-brand">
                      <Icon size={11} />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    {!SYSTEM.has(note.type) && <b>{note.actor?.name ?? 'Someone'} </b>}
                    {text}
                    {note.text && <span className="mt-0.5 block truncate text-muted">“{note.text}”</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(note.createdAt)}</span>
                </Link>
              </Reveal>
            );
          })}
        </div>
        {loading && !items.length && <ListSkeleton count={3} lines={0} />}
        {!loading && !items.length && <EmptyState icon={Bell} title="You're all caught up" text="Likes, comments, requests and verification updates will show up here." />}
        <LoadMore hasMore={hasMore} loading={loading} onLoad={loadMore} />
      </div>
    </PullToRefresh>
  );
}
