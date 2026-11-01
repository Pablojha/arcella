import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, CalendarDays, CircleQuestionMark, Clock, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useUploadProgress } from '../../hooks/useUploadProgress';
import api, { toFormData } from '../../lib/api';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import ImagePicker from '../ui/ImagePicker';
import Sheet from '../ui/Sheet';
import UploadBar from '../ui/UploadBar';

const SHORTCUTS = [
  { label: 'Story', icon: Clock, story: true },
  { label: 'Project', icon: FolderPlus, to: '/projects/new' },
  { label: 'Question', icon: CircleQuestionMark, to: '/qa?ask=1' },
  { label: 'Event', icon: CalendarDays, to: '/events/new' },
  { label: 'Job', icon: Briefcase, to: '/jobs/new' },
];

/** "Create a post" sheet. In the main feed it also offers quick links to the other creators. */
export default function CreatePost({ open, onClose, onCreated, college, onStory }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const upload = useUploadProgress();
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);

  const shortcut = (item) => {
    onClose();
    if (item.story) onStory();
    else navigate(item.to);
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const post = await api.post('/posts', toFormData({ text, college, images }), upload.config);
      onCreated(post);
      setText('');
      setImages([]);
      onClose();
      toast.success(college ? 'Posted to your college group' : 'Posted');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
      upload.reset();
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Create a post">
      {onStory && (
        <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
          {SHORTCUTS.map((item, index) => (
            <motion.button
              key={item.label}
              type="button"
              onClick={() => shortcut(item)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="flex shrink-0 items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm font-medium transition hover:border-brand hover:text-brand"
            >
              <item.icon size={16} />
              {item.label}
            </motion.button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar user={user} size={42} />
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>
            <p className="text-xs text-muted">{college ? 'Only verified members of your college will see this' : 'Visible to everyone on Arcella'}</p>
          </div>
        </div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} maxLength={3000} placeholder="Share a sketch, a site visit, a jury moment…" className="input resize-none" />
        <ImagePicker files={images} onChange={setImages} max={4} />
        {images.length > 0 && <UploadBar progress={upload.progress} />}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-muted">{text.length}/3000</span>
          <Button type="submit" loading={busy} disabled={!text.trim() && !images.length}>
            Post
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
