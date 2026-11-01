import { useState } from 'react';
import { Bookmark, Download, DraftingCompass, File, FileArchive, FileImage, FileSpreadsheet, FileText, Trash } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { RESOURCE_KINDS } from '../../lib/constants';
import { downloadFile } from '../../lib/files';
import { fileSize, labelOf, mediaUrl } from '../../lib/format';
import Button from '../ui/Button';

const ICONS = { pdf: FileText, zip: FileArchive, xlsx: FileSpreadsheet, xls: FileSpreadsheet, dwg: DraftingCompass, dxf: DraftingCompass, jpg: FileImage, jpeg: FileImage, png: FileImage, webp: FileImage, gif: FileImage };

export default function ResourceCard({ resource, onDeleted }) {
  const { user } = useAuth();
  const toast = useToast();
  const [bookmark, setBookmark] = useState({ active: resource.bookmarked, count: resource.bookmarksCount });
  const [downloads, setDownloads] = useState(resource.downloads);
  const [busy, setBusy] = useState(false);
  const Icon = ICONS[resource.file.ext] ?? File;

  const toggleBookmark = async () => {
    try {
      const result = await api.post(`/resources/${resource._id}/bookmark`);
      setBookmark({ active: result.bookmarked, count: result.bookmarksCount });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      const file = await api.post(`/resources/${resource._id}/download`);
      setDownloads(file.downloads);
      await downloadFile(mediaUrl(file.url), file.name);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await api.delete(`/resources/${resource._id}`);
      onDeleted(resource._id);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
          <Icon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">{resource.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {labelOf(RESOURCE_KINDS, resource.kind)} · Sem {resource.semester}
            {resource.subject && ` · ${resource.subject}`}
          </p>
        </div>
        <button type="button" onClick={toggleBookmark} aria-pressed={bookmark.active} aria-label="Bookmark" className={`grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-ink/5 ${bookmark.active ? 'text-accent' : 'text-muted'}`}>
          <Bookmark size={18} className={bookmark.active ? 'fill-current' : ''} />
        </button>
      </div>
      {resource.description && <p className="line-clamp-2 text-sm text-ink/80">{resource.description}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="min-w-0 truncate text-xs text-muted">
          {resource.file.ext.toUpperCase()} · {fileSize(resource.file.size)} · {downloads} downloads · {bookmark.count} saved
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {(resource.uploader?._id === user._id || user.isAdmin) && (
            <button type="button" aria-label="Delete resource" onClick={remove} className="grid size-8 place-items-center rounded-full text-muted hover:bg-accent/10 hover:text-accent">
              <Trash size={15} />
            </button>
          )}
          <Button size="sm" icon={Download} loading={busy} onClick={download}>
            Get
          </Button>
        </div>
      </div>
    </div>
  );
}
