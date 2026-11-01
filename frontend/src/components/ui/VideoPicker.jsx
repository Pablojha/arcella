import { useEffect, useMemo } from 'react';
import { Video, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const MAX_MB = 40;

/** Without a file: a tile that picks one video, refusing files over 40 MB. With one: its preview and a remove button. */
export default function VideoPicker({ file, onChange }) {
  const toast = useToast();
  const preview = useMemo(() => file && URL.createObjectURL(file), [file]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (event) => {
    const [picked] = event.target.files;
    event.target.value = '';
    if (picked?.size > MAX_MB * 1024 * 1024) toast.error(`Videos can be up to ${MAX_MB} MB. Trim it or choose a shorter clip.`);
    else if (picked) onChange(picked);
  };

  if (file) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video src={preview} controls playsInline className="max-h-72 w-full" />
        <button type="button" aria-label="Remove video" onClick={() => onChange(null)} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-muted transition hover:border-brand hover:text-brand">
      <span className="flex flex-col items-center gap-1 text-[11px] font-medium">
        <Video size={20} />
        Video
      </span>
      <input type="file" accept="video/mp4,video/quicktime,video/webm,.m4v" hidden onChange={pick} />
    </label>
  );
}
