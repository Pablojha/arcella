import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import BlockedMembers from '../components/settings/BlockedMembers';
import ChangePassword from '../components/settings/ChangePassword';
import DeleteAccount from '../components/settings/DeleteAccount';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/format';

function Section({ title, index, danger = false, children }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={`card space-y-3 p-4 md:p-6 ${danger ? 'border-accent/40' : ''}`}>
      <h2 className={`font-display text-lg font-semibold ${danger ? 'text-accent' : ''}`}>{title}</h2>
      {children}
    </motion.section>
  );
}

export default function Settings() {
  const { user } = useAuth();
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
      <Section title="Password" index={1}>
        <ChangePassword />
      </Section>
      <Section title="Blocked members" index={2}>
        <BlockedMembers />
      </Section>
      <Section title="Privacy" index={3}>
        <p className="text-sm text-muted">
          See what we store and who can see it in our{' '}
          <Link to="/privacy" className="font-medium text-brand hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </Section>
      <Section title="Delete account" index={4} danger>
        <DeleteAccount />
      </Section>
    </div>
  );
}
