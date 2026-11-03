import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import Toggle from '../ui/Toggle';

/** The notification groups members can switch off (the API's NOTIFICATION_GROUPS). Security notices always arrive. */
const GROUPS = [
  ['likes', 'Likes and appreciations'],
  ['comments', 'Comments, replies, critiques and answers'],
  ['mentions', 'Mentions'],
  ['network', 'Connection requests and new followers'],
  ['posts', 'Important posts and reposts'],
  ['jobs', 'Job applications'],
  ['mentoring', 'Mentoring sessions'],
];

export default function NotificationSettings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [off, setOff] = useState(user.notificationsOff ?? []);

  const toggle = async (group, on) => {
    const next = on ? off.filter((item) => item !== group) : [...off, group];
    setOff(next);
    try {
      setUser((await api.put('/users/me/notifications', { off: next })).user);
    } catch (error) {
      setOff(off);
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Choose what shows up in your notifications. Security alerts, verification results and messages from Arcella always arrive.</p>
      {GROUPS.map(([group, label]) => (
        <Toggle key={group} checked={!off.includes(group)} onChange={(on) => toggle(group, on)} label={label} />
      ))}
    </div>
  );
}
