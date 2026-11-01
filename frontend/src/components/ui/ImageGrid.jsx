import { useState } from 'react';
import { mediaUrl } from '../../lib/format';
import Lightbox from './Lightbox';

/** 1–4 images in a tidy grid; tapping one opens the lightbox. */
export default function ImageGrid({ images }) {
  const [open, setOpen] = useState(null);
  const count = images.length;
  if (!count) return null;

  return (
    <>
      <div className={`grid gap-1 overflow-hidden rounded-2xl ${count > 1 ? 'grid-cols-2' : ''}`}>
        {images.map((src, index) => {
          const tall = count === 3 && index === 0;
          return (
            <button key={src} type="button" onClick={() => setOpen(index)} className={`overflow-hidden bg-line ${tall ? 'row-span-2' : ''} ${count > 1 && !tall ? 'aspect-square' : ''}`}>
              <img src={mediaUrl(src, count === 1 ? 1200 : 700)} alt="" loading="lazy" className={`w-full object-cover transition duration-500 hover:scale-[1.03] ${count === 1 ? 'max-h-[520px]' : 'h-full'}`} />
            </button>
          );
        })}
      </div>
      <Lightbox images={images} index={open} onChange={setOpen} />
    </>
  );
}
