import { useState } from 'react';
import { Building, Check, Globe, MapPin, Pencil, Plus, UserPlus, Users } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import FirmForm from '../components/firms/FirmForm';
import JobCard from '../components/jobs/JobCard';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import FirmLogo from '../components/ui/FirmLogo';
import Lightbox from '../components/ui/Lightbox';
import Sheet from '../components/ui/Sheet';
import { Skeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import UserChip from '../components/ui/UserChip';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import api from '../lib/api';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import { mediaUrl, plural, safeHref } from '../lib/format';

export default function FirmDetail() {
  const { slug } = useParams();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data: firm, setData, loading, error, reload } = useApi(`/firms/${slug}`);
  const [editing, setEditing] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const tab = params.get('tab') || 'about';

  if (loading) return <Skeleton className="h-72 w-full rounded-3xl" />;
  if (error) return <EmptyState icon={Building} title="Firm not found" text={error.message} />;

  const act = async (path, update) => {
    try {
      const result = await api.post(`/firms/${firm._id}/${path}`);
      setData((current) => ({ ...current, ...update(result) }));
    } catch (actionError) {
      toast.error(actionError.message);
    }
  };

  const tabs = [
    { value: 'about', label: 'About' },
    { value: 'team', label: `Team · ${firm.team.length}` },
    { value: 'roles', label: 'Open roles', count: firm.jobs.length },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="card overflow-hidden">
        <div className="grid-paper h-32 bg-accent/10 bg-cover bg-center md:h-48" style={firm.cover ? { backgroundImage: `url(${mediaUrl(firm.cover, 1600)})` } : undefined} />
        <div className="px-4 pb-5 md:px-6">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
            <FirmLogo logo={firm.logo} name={firm.name} size={84} className="ring-4 ring-card" />
            <div className="flex flex-wrap gap-2">
              {firm.canEdit && (
                <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
              <Button variant="secondary" icon={firm.working ? Check : Building} onClick={() => act('work', (result) => ({ working: result.working, team: result.team }))}>
                {firm.working ? 'You work here' : 'I work here'}
              </Button>
              <Button variant={firm.following ? 'secondary' : 'primary'} icon={firm.following ? Check : UserPlus} onClick={() => act('follow', (result) => ({ following: result.following, followersCount: result.followersCount }))}>
                {firm.following ? 'Following' : 'Follow'}
              </Button>
            </div>
          </div>
          <h1 className="mt-3 flex items-center gap-2 font-display text-2xl font-bold tracking-tight md:text-3xl">
            {firm.name}
            {firm.verified && <VerifiedBadge size={22} title="Verified by Arcella" />}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {firm.city && (
              <span className="flex items-center gap-1.5">
                <MapPin size={15} /> {firm.city}
              </span>
            )}
            {firm.size && (
              <span className="flex items-center gap-1.5">
                <Users size={15} /> {firm.size} people
              </span>
            )}
            <span>{plural(firm.followersCount, 'follower')}</span>
            {firm.website && (
              <a href={safeHref(firm.website)} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 items-center gap-1.5 text-brand hover:underline">
                <Globe size={15} className="shrink-0" /> <span className="truncate">{firm.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
        </div>
      </section>

      <Tabs tabs={tabs} value={tab} onChange={(value) => setParams({ tab: value }, { replace: true })} />

      {tab === 'about' && (
        <div className="space-y-4">
          <div className="card p-5">
            <p className="whitespace-pre-line break-words leading-relaxed">{firm.about || 'This firm has not written an introduction yet.'}</p>
          </div>
          {firm.gallery.length > 0 && (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {firm.gallery.map((src, index) => (
                <button key={src} type="button" onClick={() => setLightbox(index)} aria-label={`Open photo ${index + 1} of ${firm.gallery.length}`} className="aspect-[4/3] overflow-hidden rounded-2xl bg-line">
                  <img src={mediaUrl(src, 800)} alt="" loading="lazy" className="size-full object-cover transition duration-500 hover:scale-105" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="card divide-y divide-line">
          {firm.team.map((member) => (
            <div key={member._id} className="px-4 py-3">
              <UserChip user={member} />
            </div>
          ))}
          {!firm.team.length && <p className="p-5 text-sm text-muted">Work here? Tap “I work here” to join the team list.</p>}
        </div>
      )}

      {tab === 'roles' && (
        <div className="space-y-3">
          {firm.canHire && (
            <Button to={`/jobs/new?firm=${firm._id}`} icon={Plus} variant="secondary">
              Post a role
            </Button>
          )}
          {firm.jobs.map((job) => (
            <JobCard key={job._id} job={{ ...job, firm }} />
          ))}
          {!firm.jobs.length && <EmptyState icon={Building} title="No open roles right now" text="Follow the firm to hear when they hire." />}
        </div>
      )}

      <Lightbox items={firm.gallery} index={lightbox} onChange={setLightbox} />
      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit firm page" size="lg">
        <FirmForm
          key={editing}
          firm={firm}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      </Sheet>
    </div>
  );
}
