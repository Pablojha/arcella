import { useState } from 'react';
import { PenLine, Repeat2, Undo2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import QuotedPost from './QuotedPost';

/** Repost straight away, repost with your own words on top, or take back an earlier repost. */
export default function RepostSheet({ post, reposted, open, onClose, onChange }) {
  const toast = useToast();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    onClose();
    setWriting(false);
    setText('');
  };

  const send = async (request, active, message) => {
    setBusy(true);
    try {
      const { repostsCount } = await request();
      onChange({ active, count: repostsCount });
      toast.success(message);
      close();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const quote = (event) => {
    event.preventDefault();
    send(() => api.post(`/posts/${post._id}/repost`, { text }), reposted, 'Reposted with your thoughts');
  };

  const options = [
    reposted
      ? { icon: Undo2, label: 'Undo repost', hint: 'Remove it from your profile and feeds', run: () => send(() => api.delete(`/posts/${post._id}/repost`), false, 'Repost removed') }
      : { icon: Repeat2, label: 'Repost', hint: 'Share it with your network right away', run: () => send(() => api.post(`/posts/${post._id}/repost`), true, 'Reposted') },
    { icon: PenLine, label: 'Repost with your thoughts', hint: 'Add a comment above it', run: () => setWriting(true) },
  ];

  return (
    <Sheet open={open} onClose={close} title={writing ? 'Repost with your thoughts' : 'Repost'}>
      {writing ? (
        <form onSubmit={quote} className="space-y-4">
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} maxLength={3000} autoFocus placeholder="What do you think of this?" className="input resize-none" />
          <QuotedPost post={post} />
          <Button type="submit" loading={busy} disabled={!text.trim()} className="w-full">
            Repost
          </Button>
        </form>
      ) : (
        <div className="space-y-1 pb-1">
          {options.map(({ icon: Icon, label, hint, run }) => (
            <button key={label} type="button" disabled={busy} onClick={run} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-ink/5 disabled:opacity-50">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                <Icon size={19} />
              </span>
              <span>
                <span className="block font-medium">{label}</span>
                <span className="block text-sm text-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
