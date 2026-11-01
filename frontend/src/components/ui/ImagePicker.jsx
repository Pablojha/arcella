import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, X } from 'lucide-react';
import { compressImage } from '../../lib/files';

export default function ImagePicker({ files, onChange, max = 4 }) {
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
            <img src={src} alt="" className="size-full rounded-xl object-cover" />
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
    </div>
  );
}
