import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag, FolderX, HandHeart, Pencil, Trash } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import CritiquePanel from '../components/portfolio/CritiquePanel';
import EditProject from '../components/portfolio/EditProject';
import ReportSheet from '../components/ReportSheet';
import EmptyState from '../components/ui/EmptyState';
import LikeButton from '../components/ui/LikeButton';
import Lightbox from '../components/ui/Lightbox';
import MoreMenu from '../components/ui/MoreMenu';
import { Skeleton } from '../components/ui/Skeleton';
import UserChip from '../components/ui/UserChip';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { usePageMeta } from '../hooks/usePageMeta';
import { useTitle } from '../hooks/useTitle';
import api from '../lib/api';
import { mediaUrl } from '../lib/format';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: project, setData, loading, error } = useApi(`/projects/${id}`);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(null);
  useTitle(project?.title);
  usePageMeta({
    path: `/projects/${id}`,
    description: project ? `${project.title} by ${project.owner?.name ?? 'an Arcella member'}: an architecture project on Arcella.` : undefined,
  });

  if (loading) return <Skeleton className="aspect-video w-full rounded-3xl" />;
  if (error) return <EmptyState icon={FolderX} title="Project not found" text={error.message} />;

  const own = user?._id === project.owner?._id;
  const merge = (changes) => setData((current) => ({ ...current, ...changes }));

  const appreciate = async () => {
    if (!user) return navigate(`/login?next=/projects/${id}`);
    const previous = { appreciated: project.appreciated, appreciationsCount: project.appreciationsCount };
    merge({ appreciated: !previous.appreciated, appreciationsCount: previous.appreciationsCount + (previous.appreciated ? -1 : 1) });
    try {
      merge(await api.post(`/projects/${id}/appreciate`));
    } catch (appreciateError) {
      merge(previous);
      toast.error(appreciateError.message);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this project and its critiques?')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      navigate(`/u/${user.username}?tab=portfolio`, { replace: true });
    } catch (removeError) {
      toast.error(removeError.message);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-3">
        <button type="button" onClick={() => setLightbox(active)} className="card block w-full overflow-hidden" aria-label="Open full screen">
          <AnimatePresence mode="wait">
            <motion.img key={active} src={mediaUrl(project.images[active], 1600)} alt={project.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="max-h-[70dvh] w-full bg-ink/5 object-contain" />
          </AnimatePresence>
        </button>
        {project.images.length > 1 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {project.images.map((src, index) => (
              <button key={src} type="button" onClick={() => setActive(index)} className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 transition md:size-20 ${index === active ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <img src={mediaUrl(src, 160)} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <aside className="card space-y-4 p-4 md:p-5 lg:sticky lg:top-22 lg:row-span-2 lg:self-start">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="chip">{project.category}</span>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">{project.title}</h1>
            <p className="text-sm text-muted">{[project.year, project.site].filter(Boolean).join(' · ')}</p>
          </div>
          {user && (
            <MoreMenu
              label="Project options"
              items={[
                own && { label: 'Edit details', icon: Pencil, onClick: () => setEditing(true) },
                (own || user.isAdmin) && { label: 'Delete project', icon: Trash, onClick: remove, danger: true },
                !own && { label: 'Report project', icon: Flag, onClick: () => setReporting({ type: 'project', id: project._id, label: 'project' }) },
              ]}
            />
          )}
        </div>
        <UserChip user={project.owner} />
        {project.description && <p className="whitespace-pre-line break-words text-sm leading-relaxed">{project.description}</p>}
        {project.tools?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.tools.map((tool) => (
              <span key={tool} className="chip">
                {tool}
              </span>
            ))}
          </div>
        )}
        <div className="-mx-2 border-t border-line pt-3">
          <LikeButton icon={HandHeart} active={project.appreciated} count={project.appreciationsCount} onToggle={appreciate} label="Appreciate" />
        </div>
      </aside>

      <div className="min-w-0">
        <CritiquePanel project={project} onChange={merge} />
      </div>

      <Lightbox items={project.images} index={lightbox} onChange={setLightbox} />
      {own && editing && <EditProject project={project} open onClose={() => setEditing(false)} onSaved={merge} />}
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}
