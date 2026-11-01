import { useState } from 'react';
import { MessageCircleQuestionMark, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AskSheet from '../components/qa/AskSheet';
import QuestionCard from '../components/qa/QuestionCard';
import Button from '../components/ui/Button';
import Chips from '../components/ui/Chips';
import EmptyState from '../components/ui/EmptyState';
import LoadMore from '../components/ui/LoadMore';
import PageHeader from '../components/ui/PageHeader';
import Reveal from '../components/ui/Reveal';
import SearchInput from '../components/ui/SearchInput';
import { ListSkeleton } from '../components/ui/Skeleton';
import Tabs from '../components/ui/Tabs';
import { useDebounce } from '../hooks/useDebounce';
import { usePaged } from '../hooks/usePaged';
import { SUBJECTS } from '../lib/constants';

const SORTS = [
  { value: 'new', label: 'New' },
  { value: 'top', label: 'Top' },
  { value: 'unanswered', label: 'Unanswered' },
];

export default function Questions() {
  const [params, setParams] = useSearchParams();
  const [subject, setSubject] = useState('');
  const [sort, setSort] = useState('new');
  const [query, setQuery] = useState('');
  const questions = usePaged('/questions', { subject, sort, q: useDebounce(query) });
  const asking = params.has('ask');

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Q&A"
        subtitle="Design, structures, thesis, software, NATA and careers"
        action={
          <Button icon={Plus} onClick={() => setParams({ ask: '1' })}>
            Ask
          </Button>
        }
      />
      <div className="mb-5 space-y-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search questions" />
        <Chips options={SUBJECTS} value={subject} onChange={setSubject} />
        <Tabs variant="pill" tabs={SORTS} value={sort} onChange={setSort} className="sm:max-w-sm" />
      </div>
      <div className="space-y-3">
        {questions.items.map((question, index) => (
          <Reveal key={question._id} index={index}>
            <QuestionCard question={question} />
          </Reveal>
        ))}
        {questions.loading && <ListSkeleton count={3} lines={1} />}
        {!questions.loading && !questions.items.length && <EmptyState icon={MessageCircleQuestionMark} title="No questions here yet" text="Ask the first one. Seniors and faculty are listening." />}
        <LoadMore hasMore={questions.hasMore} loading={questions.loading} onLoad={questions.loadMore} />
      </div>
      <AskSheet open={asking} onClose={() => setParams({}, { replace: true })} />
    </div>
  );
}
