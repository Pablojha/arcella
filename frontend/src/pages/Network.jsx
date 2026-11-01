import { useSearchParams } from 'react-router-dom';
import ConnectionsList from '../components/network/ConnectionsList';
import FindPeople from '../components/network/FindPeople';
import RequestsList from '../components/network/RequestsList';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import { useBadges } from '../context/BadgeContext';

export default function Network() {
  const [params, setParams] = useSearchParams();
  const { requests } = useBadges();
  const tab = params.get('tab') || 'find';
  const query = params.get('q') ?? '';
  const tabs = [
    { value: 'find', label: 'Find people' },
    { value: 'requests', label: 'Requests', count: requests },
    { value: 'connections', label: 'Connections' },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Network" subtitle="Grow your circle across studios and campuses" />
      <Tabs tabs={tabs} value={tab} onChange={(value) => setParams({ tab: value }, { replace: true })} className="mb-5" />
      {tab === 'find' && <FindPeople key={query} initialQuery={query} autoFocus={params.has('focus')} />}
      {tab === 'requests' && <RequestsList />}
      {tab === 'connections' && <ConnectionsList />}
    </div>
  );
}
