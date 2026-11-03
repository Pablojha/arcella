import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { LEGAL_LINKS } from '../components/layout/SiteFooter';
import BlockedMembers from '../components/settings/BlockedMembers';
import ChangePassword from '../components/settings/ChangePassword';
import DataExport from '../components/settings/DataExport';
import DeleteAccount from '../components/settings/DeleteAccount';
import PushSetting from '../components/settings/PushSetting';
import Security from '../components/settings/Security';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { openStorageSettings } from '../lib/consent';
import { formatDate } from '../lib/format';

function Section({ title, index, id, danger = false, children }) {
  return (
    <motion.section id={id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={`card space-y-3 p-4 md:p-6 ${danger ? 'border-accent/40' : ''}`}>
      <h2 className={`font-display text-lg font-semibold ${danger ? 'text-accent' : ''}`}>{title}</h2>
      {children}
    </motion.section>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const section = params.get('section');

  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
  }, [section]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Settings" subtitle="Account, privacy and security" back="/more" />
      <Section title="Account" index={0}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="min-w-0 truncate">{user.email}</dd>
          <dt className="text-muted">Member since</dt>
          <dd>{formatDate(user.createdAt, { month: 'long', year: 'numeric' })}</dd>
        </dl>
        <Button to={`/u/${user.username}?edit=1`} variant="secondary" size="sm">
          Edit profile
        </Button>
      </Section>
      <Section title="Notifications" index={1}>
        <PushSetting />
      </Section>
      <Section title="Password" index={2}>
        <ChangePassword />
      </Section>
      <Section title="Security" index={3} id="security">
        <Security />
      </Section>
      <Section title="Blocked members" index={4}>
        <BlockedMembers />
      </Section>
      <Section title="Privacy and policies" index={5}>
        <p className="text-sm text-muted">See what Arcella stores, who can see it and the rules everyone follows.</p>
        <div className="flex flex-wrap gap-2">
          {LEGAL_LINKS.map(([to, label]) => (
            <Button key={to} to={to} variant="secondary" size="sm">
              {label}
            </Button>
          ))}
          <Button variant="secondary" size="sm" onClick={openStorageSettings}>
            Cookie settings
          </Button>
        </div>
      </Section>
      <Section title="Your data" index={6}>
        <DataExport />
      </Section>
      <Section title="Delete account" index={7} danger>
        <DeleteAccount />
      </Section>
    </div>
  );
}
