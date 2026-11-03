import { useState } from 'react';
import { BadgeCheck, Hourglass, Pencil, Plus, Star, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useApi } from '../../hooks/useApi';
import api from '../../lib/api';
import { entryTitle, entryYears, idOf } from '../../lib/memberships';
import Button from '../ui/Button';
import FirmLogo from '../ui/FirmLogo';
import MoreMenu from '../ui/MoreMenu';
import VerifiedBadge from '../ui/VerifiedBadge';
import EducationSheet from './EducationSheet';

/** The main college first, then the most recent. */
const order = (a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)) || (b.graduation ?? b.batch ?? 0) - (a.graduation ?? a.batch ?? 0);

/**
 * The colleges a member studied or teaches at, with degree level, degree and years. Members add and edit their own,
 * and verify each college to join its private group.
 */
export default function Education({ person, own }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const { data: requests } = useApi(own ? '/verification/me' : null);
  const entries = [...(person.memberships ?? [])].sort(order);
  const underReview = (entry) => requests?.items?.some((request) => request.method === 'document' && idOf(request.college) === idOf(entry.college));

  const run = async (request, message) => {
    try {
      setUser((await request()).user);
      toast.success(message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const remove = (entry) => {
    const name = entry.college?.short ?? entry.college?.name;
    if (!window.confirm(`Remove ${name} from your education?${entry.verified ? ` You'll leave the ${name} group.` : ''}`)) return;
    run(() => api.delete(`/users/me/memberships/${entry._id}`), 'Removed from your education');
  };

  const saved = ({ user, membership }) => {
    setUser(user);
    setEditing(null);
    if (!membership) return toast.success('Education updated');
    toast.success('Added to your education', { action: { label: 'Verify', onClick: () => navigate(`/college/verify?entry=${membership}`) } });
  };

  if (!entries.length && !own) return null;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-muted">Education</h3>
        {own && (
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setEditing({})}>
            Add
          </Button>
        )}
      </div>
      {!entries.length && <p className="text-sm text-muted">Add the colleges you studied or teach at: undergraduate, postgraduate and research degrees. Verify each one to join its private group.</p>}
      <ul className="space-y-4">
        {entries.map((entry) => (
          <li key={entry._id} className="flex items-start gap-3">
            <FirmLogo name={entry.college?.short || entry.college?.name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-semibold leading-snug">
                <span className="min-w-0 break-words">{entry.college?.name ?? 'College'}</span>
                {entry.verified && <VerifiedBadge />}
                {entry.primary && <span className="chip">Main</span>}
              </p>
              <p className="text-sm">{entryTitle(entry)}</p>
              {entryYears(entry) && <p className="text-sm text-muted">{entryYears(entry)}</p>}
              {own &&
                !entry.verified &&
                (underReview(entry) ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                    <Hourglass size={13} /> Verification under review
                  </p>
                ) : (
                  <Button to={`/college/verify?entry=${entry._id}`} size="sm" variant="secondary" icon={BadgeCheck} className="mt-2">
                    Verify to join the group
                  </Button>
                ))}
            </div>
            {own && (
              <MoreMenu
                label={`Manage ${entry.college?.name ?? 'education'}`}
                items={[
                  { label: 'Edit', icon: Pencil, onClick: () => setEditing(entry) },
                  entry.verified && !entry.primary && { label: 'Make main college', icon: Star, onClick: () => run(() => api.post(`/users/me/memberships/${entry._id}/primary`), 'Main college changed') },
                  { label: 'Remove', icon: Trash, onClick: () => remove(entry), danger: true },
                ]}
              />
            )}
          </li>
        ))}
      </ul>
      {editing && <EducationSheet key={editing._id ?? 'new'} entry={editing} onClose={() => setEditing(null)} onSaved={saved} />}
    </div>
  );
}
