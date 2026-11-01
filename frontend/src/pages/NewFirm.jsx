import { useNavigate } from 'react-router-dom';
import FirmForm from '../components/firms/FirmForm';
import PageHeader from '../components/ui/PageHeader';

export default function NewFirm() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Create a firm page" subtitle="Showcase your work and list open roles" back="/firms" />
      <div className="card p-4 md:p-6">
        <FirmForm onSaved={(firm) => navigate(`/firms/${firm.slug}`, { replace: true })} />
      </div>
    </div>
  );
}
