import { useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, Camera, Check, Flag, MessageCircle, FolderPlus, GraduationCap, HandHeart, Link as LinkIcon, MapPin, Pencil, Rss, UserRoundX, Users } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import PostCard from '../components/feed/PostCard';
import RequestSession from '../components/mentors/RequestSession';
import ConnectButton from '../components/network/ConnectButton';
import ProjectCard from '../components/portfolio/ProjectCard';
import EditProfile from '../components/profile/EditProfile';
import Education from '../components/profile/Education';
import ReportSheet from '../components/ReportSheet';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import MoreMenu from '../components/ui/MoreMenu';
import Reveal from '../components/ui/Reveal';
import { GridSkeleton, PostSkeleton, Skeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { useBlock } from '../hooks/useBlock';
import { usePaged } from '../hooks/usePaged';
import { useTitle } from '../hooks/useTitle';
import api, { toFormData } from '../lib/api';
import { USER_TYPES } from '../lib/constants';
import { compressImage } from '../lib/files';
import { labelOf, mediaUrl, plural, safeHref } from '../lib/format';

const TABS = [
  { value: 'about', label: 'About' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'activity', label: 'Activity' },
];

function TagList({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-muted">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="chip">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function About({ person, own }) {
  const empty = !person.bio && !person.software?.length && !person.skills?.length && !person.experience?.length && !person.memberships?.length;
  if (empty && !own) return <EmptyState icon={Pencil} title="Nothing here yet" text="This member hasn't filled in their profile." />;
  return (
    <div className="card space-y-6 p-4 md:p-6">
      {person.bio && <p className="whitespace-pre-line break-words leading-relaxed">{person.bio}</p>}
      <Education person={person} own={own} />
      <TagList title="Software" items={person.software} />
      <TagList title="Skills" items={person.skills} />
      {person.experience?.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted">Experience</h3>
          <ol className="relative space-y-5 border-l border-dashed border-ink/25 pl-5">
            {person.experience.map((item) => (
              <li key={item._id} className="relative">
                <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-card bg-brand" />
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted">
                  {item.org}
                  {(item.start || item.end) && ` · ${[item.start, item.end].filter(Boolean).join(' – ')}`}
                </p>
                {item.description && <p className="mt-1 text-sm">{item.description}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Portfolio({ person, own }) {
  const { items, loading, hasMore, loadMore } = usePaged('/projects', { owner: person._id });
  return (
    <div className="space-y-4">
      {own && (
        <Button to="/projects/new" icon={FolderPlus} variant="secondary">
          Add a project
        </Button>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {items.map((project, index) => (
          <Reveal key={project._id} index={index}>
            <ProjectCard project={{ ...project, owner: person }} />
          </Reveal>
        ))}
      </div>
      {loading && <GridSkeleton count={3} />}
      {!loading && !items.length && <EmptyState icon={FolderPlus} title="No projects yet" text={own ? 'Upload your first project to start your portfolio.' : 'Projects will show up here.'} />}
      <LoadMore hasMore={hasMore} loading={loading} onLoad={loadMore} />
    </div>
  );
}

function Activity({ person }) {
  const feed = usePaged('/posts', { author: person._id });
  return (
    <div className="space-y-4">
      {feed.items.map((post, index) => (
        <Reveal key={post._id} index={index}>
          <PostCard post={post} onDeleted={(id) => feed.setItems((items) => items.filter((item) => item._id !== id))} />
        </Reveal>
      ))}
      {feed.loading && <PostSkeleton />}
      {!feed.loading && !feed.items.length && <EmptyState icon={Pencil} title="No posts yet" />}
      <LoadMore hasMore={feed.hasMore} loading={feed.loading} onLoad={feed.loadMore} />
    </div>
  );
}

export default function Profile() {
  const { username } = useParams();
  const [params, setParams] = useSearchParams();
  const { user: me, setUser } = useAuth();
  const toast = useToast();
  const { data, setData, loading, error } = useApi(`/users/${username}`);
  const [editing, setEditing] = useState(() => params.has('edit'));
  const [requesting, setRequesting] = useState(null);
  const [reporting, setReporting] = useState(null);
  const toggleBlock = useBlock();
  const tab = params.get('tab') || 'about';
  const own = data?.status === 'self';
  const toggleFollow = async () => {
    try {
      const { following, followersCount } = await api.post(`/users/${data.user._id}/follow`);
      setData((current) => ({ ...current, following, user: { ...current.user, followersCount } }));
    } catch (error) {
      toast.error(error.message);
    }
  };
  const person = own ? { ...data.user, ...me } : data?.user;
  useTitle(person?.name);

  const block = async () => {
    const blocked = await toggleBlock(person, data.blocked);
    if (blocked !== null) setData((current) => ({ ...current, blocked, status: blocked ? 'none' : current.status }));
  };

  const upload = (field) => async (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    try {
      const { user: updated } = await api.post(`/users/me/${field}`, toFormData({ image: await compressImage(file, field === 'cover' ? 2400 : 800) }));
      setUser(updated);
      toast.success(field === 'cover' ? 'Cover updated' : 'Photo updated');
    } catch (uploadError) {
      toast.error(uploadError.message);
    }
  };

  if (loading) return <Skeleton className="h-80 w-full rounded-3xl" />;
  if (error) return <EmptyState icon={UserRoundX} title="Profile not found" text={error.message} />;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="card overflow-hidden">
        <div className="grid-paper relative h-36 bg-brand/15 bg-cover bg-center md:h-52" style={person.cover ? { backgroundImage: `url(${mediaUrl(person.cover, 1600)})` } : undefined}>
          {own && (
            <label className="absolute right-3 top-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur focus-within:ring-2 focus-within:ring-white hover:bg-black/70">
              <Camera size={14} /> Cover
              <input type="file" accept="image/*" className="sr-only" onChange={upload('cover')} />
            </label>
          )}
        </div>
        <div className="px-4 pb-5 md:px-6">
          <div className="-mt-12 flex items-end justify-between gap-3 md:-mt-16">
            <div className="relative rounded-full ring-4 ring-card">
              <Avatar user={person} size={112} />
              {own && (
                <label className="absolute bottom-1 right-1 grid size-9 cursor-pointer place-items-center rounded-full border-2 border-card bg-brand text-on-brand focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2">
                  <Camera size={16} aria-hidden="true" />
                  <span className="sr-only">Change photo</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={upload('avatar')} />
                </label>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 pb-1">
              {own ? (
                <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                  Edit profile
                </Button>
              ) : (
                <>
                  {person.mentor?.enabled && !data.blocked && (
                    <Button variant="secondary" icon={HandHeart} onClick={() => setRequesting(person)}>
                      Mentor
                    </Button>
                  )}
                  {data.blocked ? (
                    <Button variant="secondary" icon={Ban} onClick={block}>
                      Unblock
                    </Button>
                  ) : (
                    <>
                      <ConnectButton key={data.status} person={person} status={data.status} size="md" />
                      {data.status !== 'connected' && (
                        <Button variant="secondary" icon={MessageCircle} to={`/messages/${person._id}`}>
                          Message
                        </Button>
                      )}
                      <Button variant="secondary" icon={data.following ? Check : Rss} onClick={toggleFollow} aria-pressed={data.following}>
                        {data.following ? 'Following' : 'Follow'}
                      </Button>
                    </>
                  )}
                  <MoreMenu
                    label="Profile options"
                    items={[
                      { label: 'Report profile', icon: Flag, onClick: () => setReporting({ type: 'user', id: person._id, label: person.name }) },
                      !data.blocked && { label: `Block ${person.name.split(' ')[0]}`, icon: Ban, onClick: block, danger: true },
                    ]}
                  />
                </>
              )}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold tracking-tight md:text-3xl">
              {person.name}
              {person.verified && <VerifiedBadge size={22} />}
              <span className="chip">{labelOf(USER_TYPES, person.type)}</span>
            </h1>
            {person.headline && <p className="mt-1 text-[15px]">{person.headline}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
              {person.college && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={15} /> {person.college.short ?? person.college.name}
                  {person.batch && ` · Batch ${person.batch}`}
                </span>
              )}
              {person.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} /> {person.location}
                </span>
              )}
              {person.website && (
                <a href={safeHref(person.website)} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 items-center gap-1.5 text-brand hover:underline">
                  <LinkIcon size={15} className="shrink-0" /> <span className="truncate">{person.website.replace(/^(https?:\/\/|mailto:)/, '')}</span>
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <Users size={15} /> {plural(person.connectionsCount, 'connection')}
              </span>
              <span className="flex items-center gap-1.5">
                <Rss size={15} /> {plural(person.followersCount ?? 0, 'follower')}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <Tabs tabs={TABS} value={tab} onChange={(value) => setParams({ tab: value }, { replace: true })} />
      {tab === 'about' && <About person={person} own={own} />}
      {tab === 'portfolio' && <Portfolio person={person} own={own} />}
      {tab === 'activity' && <Activity person={person} />}

      {own && <EditProfile open={editing} onClose={() => setEditing(false)} onSaved={(updated) => setData((current) => ({ ...current, user: updated }))} />}
      <RequestSession mentor={requesting} onClose={() => setRequesting(null)} />
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}
