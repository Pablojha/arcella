import { useEffect, useMemo, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api, { toFormData } from '../../lib/api';
import { compressImage } from '../../lib/files';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';

export default function StoryComposer({ open, onClose, onPosted }) {
  const { user } = useAuth();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => file && URL.createObjectURL(file), [file]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = async (event) => {
    const [picked] = event.target.files;
    event.target.value = '';
    if (picked) setFile(await compressImage(picked, 1600));
  };

  const close = () => {
    setFile(null);
    setCaption('');
    onClose();
  };

  const share = async () => {
    setBusy(true);
    try {
      await api.post('/stories', toFormData({ image: file, caption }));
      toast.success('Added to your story');
      onPosted();
      close();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title="Add to your story">
      <div className="space-y-4">
        <label className="relative grid aspect-[4/5] max-h-[48dvh] w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-ink/[0.03] text-muted transition hover:border-brand hover:text-brand">
          {preview ? (
            <img src={preview} alt="Story preview" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm font-medium">
              <ImagePlus size={28} />
              Choose a photo
            </span>
          )}
          <input type="file" accept="image/*" hidden onChange={pick} />
        </label>
        <input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={200} placeholder="Add a caption (optional)" className="input" />
        <p className="text-xs text-muted">Visible to your connections{user.verified ? ' and college mates' : ''} for 24 hours.</p>
        <Button className="w-full" size="lg" onClick={share} loading={busy} disabled={!file}>
          Share story
        </Button>
      </div>
    </Sheet>
  );
}
