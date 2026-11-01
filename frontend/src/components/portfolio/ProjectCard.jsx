import { HandHeart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mediaUrl } from '../../lib/format';

export default function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project._id}`} className="group card block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      <div className="relative aspect-[4/3] overflow-hidden bg-line">
        <img src={mediaUrl(project.images[0], 640)} alt={project.title} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
        {project.critiqueOpen && <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent">Open for critique</span>}
        {project.images.length > 1 && <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">+{project.images.length - 1}</span>}
      </div>
      <div className="p-3">
        <p className="truncate font-medium">{project.title}</p>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">
            {project.owner?.name} · {project.category}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <HandHeart size={13} />
            {project.appreciationsCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
