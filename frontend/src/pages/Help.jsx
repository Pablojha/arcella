import { useState } from 'react';
import { ChevronDown, LifeBuoy, MessageSquareText } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Field from '../components/ui/Field';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import { ListSkeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import { useToast } from '../context/ToastContext';
import { usePaged } from '../hooks/usePaged';
import api from '../lib/api';
import { SUPPORT_TOPICS } from '../lib/constants';
import { ago, labelOf } from '../lib/format';

/** Answers to what members ask most, written from how Arcella actually works. */
const FAQ = [
  ['How do I verify my college?', 'Open College and choose Verify. Use a code sent to your college email address, or upload a photo of your ID card, marksheet or degree for your college admins to review. Documents are deleted as soon as they are reviewed.', '/college'],
  ['Who can message me?', 'Your connections and verified batchmates can message you. Anyone else can send you one message request, which waits under Messages → Message requests until you reply. Blocked members can never message you.', '/messages'],
  ['How do job applications work?', 'Roles without an outside link take applications in Arcella: attach a resume (or your saved one) and a note. Only the people hiring for that role see it. Follow each one under Jobs → Applied, where you can also withdraw.', '/jobs?tab=applied'],
  ['How do I keep my account secure?', 'In Settings → Security you can turn on two-factor sign-in, see every device signed in to your account and sign them out, and check recent sign-ins. After 5 wrong passwords an account is locked for 15 minutes.', '/settings?section=security'],
  ['How do I choose my notifications?', 'Settings → Notifications lets you switch off likes, comments, mentions, network updates, posts, jobs or mentoring notices. Security alerts always arrive.', '/settings'],
  ['Who sees my email and phone?', 'Nobody, until you choose. In Edit profile → Contact, pick Only me, Connections or Everyone for each.', null],
  ['How do I report or block someone?', 'Use the ••• menu on a post, comment, profile or chat. Reports go to the moderation team, and blocking hides you from each other everywhere. The Community Guidelines explain what is not allowed.', '/guidelines'],
  ['Why does a photo say "Photo unavailable"?', 'Some photos and videos uploaded before November 2026 were lost when our storage changed. Uploads are now stored safely; please upload those again.', null],
  ['How do I download or delete my data?', 'Settings → Your data downloads everything Arcella stores about you. Settings → Delete account removes your account and everything you created.', '/settings'],
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="card divide-y divide-line">
      {FAQ.map(([question, answer, link], index) => (
        <div key={question}>
          <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left font-medium">
            {question}
            <ChevronDown size={18} className={`shrink-0 text-muted transition ${open === index ? 'rotate-180' : ''}`} />
          </button>
          {open === index && (
            <div className="space-y-2 px-4 pb-4 text-sm leading-relaxed text-muted">
              <p>{answer}</p>
              {link && (
                <Link to={link} className="inline-block font-medium text-brand hover:underline">
                  Go there
                </Link>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Contact({ onSent }) {
  const toast = useToast();
  const [params] = useSearchParams();
  const page = params.get('page') ?? '';
  const [form, setForm] = useState({ topic: params.get('topic') ?? 'account', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/support', { ...form, page: form.topic === 'problem' ? page : undefined });
      toast.success("Sent. We'll reply here and notify you.");
      setForm({ topic: 'account', subject: '', message: '' });
      onSent();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-4 md:p-6">
      <Field label="Topic">
        <select value={form.topic} onChange={set('topic')} className="input">
          {SUPPORT_TOPICS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {form.topic === 'problem' && page && <p className="text-xs text-muted">We'll include the page you were on ({page}) and your browser, to help us find the problem.</p>}
      <Field label="Subject">
        <input value={form.subject} onChange={set('subject')} required minLength={3} maxLength={120} className="input" placeholder="In a few words" />
      </Field>
      <Field label="Message">
        <textarea value={form.message} onChange={set('message')} required minLength={10} maxLength={4000} rows={6} className="input resize-none" placeholder="What happened, and what did you expect?" />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        Send to the Arcella team
      </Button>
    </form>
  );
}

function Requests() {
  const toast = useToast();
  const list = usePaged('/support/mine');
  const [drafts, setDrafts] = useState({});

  const followUp = async (ticket) => {
    try {
      const saved = await api.post(`/support/${ticket._id}/replies`, { text: drafts[ticket._id] });
      list.setItems((items) => items.map((item) => (item._id === saved._id ? { ...item, ...saved, replies: [...item.replies, { staff: false, text: drafts[ticket._id], at: new Date().toISOString() }] } : item)));
      setDrafts((current) => ({ ...current, [ticket._id]: '' }));
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-3">
      {list.items.map((ticket) => (
        <article key={ticket._id} className="card space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold">{ticket.subject}</h3>
              <p className="text-xs text-muted">
                {labelOf(SUPPORT_TOPICS, ticket.topic)} · sent {ago(ticket.createdAt)}
              </p>
            </div>
            <span className="chip shrink-0 capitalize">{ticket.status}</span>
          </div>
          <p className="whitespace-pre-line break-words text-sm">{ticket.message}</p>
          {ticket.replies.map((reply, index) => (
            <div key={index} className={`rounded-2xl p-3 text-sm ${reply.staff ? 'bg-brand/10' : 'bg-ink/5'}`}>
              <p className="mb-1 text-xs font-semibold">{reply.staff ? 'Arcella team' : 'You'} · {ago(reply.at)}</p>
              <p className="whitespace-pre-line break-words">{reply.text}</p>
            </div>
          ))}
          {ticket.status !== 'closed' && ticket.replies.some((reply) => reply.staff) && (
            <div className="flex gap-2">
              <input value={drafts[ticket._id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [ticket._id]: event.target.value }))} maxLength={4000} aria-label={`Reply about ${ticket.subject}`} className="input min-w-0 flex-1" placeholder="Reply" />
              <Button size="md" variant="secondary" disabled={!drafts[ticket._id]?.trim()} onClick={() => followUp(ticket)}>
                Send
              </Button>
            </div>
          )}
        </article>
      ))}
      {list.loading && <ListSkeleton count={2} lines={2} />}
      {!list.loading && !list.items.length && <EmptyState icon={MessageSquareText} title="No requests yet" text="Questions you send the Arcella team, and their replies, appear here." />}
      <LoadMore hasMore={list.hasMore} loading={list.loading} onLoad={list.loadMore} />
    </div>
  );
}

const TABS = [
  { value: 'faq', label: 'Help center' },
  { value: 'contact', label: 'Contact support' },
  { value: 'requests', label: 'My requests' },
];

export default function Help() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(({ value }) => value === params.get('tab')) ? params.get('tab') : 'faq';
  const go = (value) => setParams({ tab: value }, { replace: true });
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Help" subtitle="Answers, and a direct line to the Arcella team" />
      <Tabs tabs={TABS} value={tab} onChange={go} className="mb-4" />
      {tab === 'faq' && (
        <div className="space-y-4">
          <Faq />
          <div className="card flex items-center gap-3 p-4">
            <LifeBuoy size={20} className="shrink-0 text-brand" />
            <p className="flex-1 text-sm">Didn't find your answer?</p>
            <Button size="sm" onClick={() => go('contact')}>
              Contact support
            </Button>
          </div>
        </div>
      )}
      {tab === 'contact' && <Contact onSent={() => go('requests')} />}
      {tab === 'requests' && <Requests />}
    </div>
  );
}
