import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, X } from 'lucide-react';
import { compressImage } from '../../lib/files';

/** A picked photo; formats this browser can't draw (iPhone HEIC in Chrome or Edge) show their name instead. */
function Preview({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="grid size-full place-items-center break-all rounded-xl bg-ink/5 p-2 text-center text-[11px] text-muted">{name}</span>;
  return <img src={src} alt="" onError={() => setFailed(true)} className="size-full rounded-xl object-cover" />;
}

/** Photo previews plus an add tile; `children` (e.g. a video tile) sit after it in the same grid. */
export default function ImagePicker({ files, onChange, max = 4, children }) {
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const add = async (event) => {
    const picked = await Promise.all([...event.target.files].map((file) => compressImage(file)));
    event.target.value = '';
    onChange([...files, ...picked].slice(0, max));
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      <AnimatePresence>
        {previews.map((src, index) => (
          <motion.div key={src} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative aspect-square">
            <Preview src={src} name={files[index]?.name} />
            <button type="button" aria-label="Remove image" onClick={() => onChange(files.filter((_, i) => i !== index))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white">
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      {files.length < max && (
        <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-muted transition hover:border-brand hover:text-brand">
          <span className="flex flex-col items-center gap-1 text-[11px] font-medium">
            <ImagePlus size={20} />
            {files.length}/{max}
          </span>
          <input type="file" accept="image/*" multiple hidden onChange={add} />
        </label>
      )}
      {children}
    </div>
  );
}
