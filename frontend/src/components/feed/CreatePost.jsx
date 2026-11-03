import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, CalendarDays, CircleQuestionMark, Clock, FolderPlus, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useUploadProgress } from '../../hooks/useUploadProgress';
import api, { toFormData } from '../../lib/api';
import { aspectOf } from '../../lib/media';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import ImagePicker from '../ui/ImagePicker';
import Sheet from '../ui/Sheet';
import UploadBar from '../ui/UploadBar';
import VideoPicker from '../ui/VideoPicker';

const SHORTCUTS = [
  { label: 'Story', icon: Clock, story: true },
  { label: 'Project', icon: FolderPlus, to: '/projects/new' },
  { label: 'Question', icon: CircleQuestionMark, to: '/qa?ask=1' },
  { label: 'Event', icon: CalendarDays, to: '/events/new' },
  { label: 'Job', icon: Briefcase, to: '/jobs/new' },
];

/** "Create a post" sheet. In the main feed it also offers quick links to the other creators. */
/** With `firm`, the post goes out under the firm's name (for its owner and admins). */
export default function CreatePost({ open, onClose, onCreated, college, firm, onStory }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const upload = useUploadProgress();
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [important, setImportant] = useState(false);
  const [busy, setBusy] = useState(false);
  const audience = college
    ? 'Everyone in your college group will be notified.'
    : user.isAdmin
      ? 'Everyone on Arcella will be notified.'
      : 'Your connections will be notified. You can mark one post a day as Important.';

  const shortcut = (item) => {
    onClose();
    if (item.story) onStory();
    else navigate(item.to);
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      // The first photo's shape lets the feed size the post before its photos load.
      const aspect = images[0] && (await aspectOf(images[0]));
      const post = await api.post('/posts', toFormData({ text, college, firm: firm?._id, images, video, important: important || undefined, aspect }), upload.config);
      onCreated(post);
      setText('');
      setImages([]);
      setVideo(null);
      setImportant(false);
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
        // Swiped sideways on phones; on wider screens, where there's no swipe, the chips wrap so none is cut off.
        <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
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
            <p className="truncate font-medium">{firm ? `${firm.name} · by ${user.name}` : user.name}</p>
            <p className="text-xs text-muted">{college ? 'Only verified members of your college will see this' : firm ? 'Visible to everyone, and in the feeds of the firm’s followers' : 'Visible to everyone on Arcella'}</p>
          </div>
        </div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} maxLength={3000} placeholder="Share a sketch, a site visit, a jury moment…" className={`input resize-none ${important ? 'border-alert' : ''}`} />
        {video ? (
          <VideoPicker file={video} onChange={setVideo} />
        ) : (
          <ImagePicker files={images} onChange={setImages} max={4}>
            {!images.length && <VideoPicker onChange={setVideo} />}
          </ImagePicker>
        )}
        {(images.length > 0 || video) && <UploadBar progress={upload.progress} />}
        {important && <p className="text-xs font-medium text-alert">{audience}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setImportant((value) => !value)}
            aria-pressed={important}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition ${important ? 'border-alert bg-alert text-on-alert' : 'border-line text-muted hover:border-alert hover:text-alert'}`}
          >
            <TriangleAlert size={15} /> Important
          </button>
          <span className="ml-auto text-xs tabular-nums text-muted">{text.length}/3000</span>
          <Button type="submit" loading={busy} disabled={!text.trim() && !images.length && !video}>
            Post
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
