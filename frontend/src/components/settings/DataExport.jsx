import { useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import { saveBlob } from '../../lib/files';
import Button from '../ui/Button';

/** "Download your data": a copy of everything Arcella stores about the member, as a JSON file they keep. */
export default function DataExport() {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const data = await api.get('/users/me/export');
      saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `arcella-data-${user.username}-${data.exportedAt.slice(0, 10)}.json`);
      toast.success('Your data is downloading.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="text-sm text-muted">
        Get a copy of your profile, posts, projects, messages, connections and settings as a file you can keep or take elsewhere. Photos and videos are listed as links.
      </p>
      <Button variant="secondary" size="sm" icon={Download} loading={busy} onClick={download}>
        Download your data
      </Button>
    </>
  );
}
