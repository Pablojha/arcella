import { useState } from 'react';
import { Download, Eye, FileText, Trash, Upload } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import api, { toFormData } from '../../lib/api';
import { saveBlob } from '../../lib/files';
import { ago, fileSize, plural } from '../../lib/format';
import AiButton from '../ui/AiButton';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import UserChip from '../ui/UserChip';

/** Only on your own profile: who viewed it lately, and the resume you keep for job applications. */
export default function OwnerPanel() {
  const toast = useToast();
  const { data: views } = useApi('/users/me/views');
  const { data, setData } = useApi('/users/me/resume');
  const [showViews, setShowViews] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const resume = data?.resume;

  const run = async (action, success) => {
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(error.message);
    }
  };
  const upload = (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (file) run(async () => setData(await api.put('/users/me/resume', toFormData({ resume: file }))), 'Resume saved');
  };
  const download = () => run(async () => saveBlob(await api.get('/users/me/resume/file', { responseType: 'blob' }), resume.name));
  const remove = () => window.confirm('Remove your saved resume?') && run(async () => (await api.delete('/users/me/resume'), setData({ resume: null })), 'Resume removed');

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => setShowViews(true)} className="flex items-center gap-3 rounded-2xl border border-line p-3 text-left transition hover:bg-ink/5">
        <Eye size={20} className="text-brand" />
        <span>
          <span className="block font-semibold">{views ? plural(views.count, 'profile view') : '…'}</span>
          <span className="block text-xs text-muted">In the last 30 days. Only you see this.</span>
        </span>
      </button>
      <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
        <FileText size={20} className="shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{resume ? resume.name : 'No resume saved'}</p>
          <p className="text-xs text-muted">{resume ? `${fileSize(resume.size)} · updated ${ago(resume.updatedAt)} · private` : 'Save one to apply to jobs in one tap'}</p>
        </div>
        {resume && <Button variant="ghost" size="sm" icon={Download} onClick={download} aria-label="Download resume" />}
        {resume && <Button variant="ghost" size="sm" icon={Trash} onClick={remove} aria-label="Remove resume" />}
        <label className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium hover:bg-ink/5">
          <Upload size={15} /> {resume ? 'Replace' : 'Upload'}
          <input type="file" accept=".pdf,.doc,.docx" hidden onChange={upload} aria-label="Resume file" />
        </label>
      </div>
      {resume?.name.toLowerCase().endsWith('.pdf') && (
        <div className="sm:col-span-2">
          <AiButton request={() => api.post('/ai/resume-feedback')} onResult={setFeedback}>
            Get AI feedback on my resume
          </AiButton>
        </div>
      )}
      <Sheet open={Boolean(feedback)} onClose={() => setFeedback(null)} title="Resume feedback">
        {feedback && (
          <div className="space-y-4 text-sm">
            <p>{feedback.summary}</p>
            <div>
              <h3 className="mb-1 font-semibold">What works</h3>
              <ul className="list-disc space-y-1 pl-5">
                {feedback.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">What to improve</h3>
              <ol className="list-decimal space-y-1 pl-5">
                {feedback.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
            <p className="text-xs text-muted">Written by AI from your saved resume. Check it against your own judgement.</p>
          </div>
        )}
      </Sheet>
      <Sheet open={showViews} onClose={() => setShowViews(false)} title="Who viewed your profile">
        {views?.viewers.length ? (
          <ul className="space-y-3">
            {views.viewers.map((viewer) => (
              <li key={viewer._id}>
                <UserChip user={viewer} sub={`Viewed ${ago(viewer.viewedAt)}`} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Nobody has viewed your profile in the last 30 days.</p>
        )}
      </Sheet>
    </div>
  );
}
