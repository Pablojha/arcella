import { motion } from 'framer-motion';
import { Bell, BookOpen, Bookmark, Building, CalendarDays, ChevronRight, Clapperboard, Compass, HandHeart, LogOut, MessageCircleQuestionMark, Settings, ShieldCheck, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SiteFooter from '../components/layout/SiteFooter';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import CountBadge from '../components/ui/CountBadge';
import ThemeSwitch from '../components/ui/ThemeSwitch';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { useBadges } from '../context/BadgeContext';
import { useTitle } from '../hooks/useTitle';

const MODULES = [
  { to: '/reels', label: 'Reels', text: 'Short videos', icon: Clapperboard },
  { to: '/explore', label: 'Explore', text: 'Portfolio gallery', icon: Compass },
  { to: '/firms', label: 'Firms', text: 'Practices and studios', icon: Building },
  { to: '/mentors', label: 'Mentorship', text: 'Book alumni and faculty', icon: HandHeart },
  { to: '/events', label: 'Events', text: 'Visits, juries, webinars', icon: CalendarDays },
  { to: '/qa', label: 'Q&A', text: 'Ask the community', icon: MessageCircleQuestionMark },
  { to: '/resources', label: 'Resources', text: 'Notes and CAD blocks', icon: BookOpen },
  { to: '/saved', label: 'Saved', text: 'Posts you bookmarked', icon: Bookmark },
  { to: '/notifications', label: 'Notifications', text: 'Your updates', icon: Bell, badge: 'notifications' },
  { to: '/settings', label: 'Settings', text: 'Password, privacy, account', icon: Settings },
];

export default function More() {
  const { user, logout } = useAuth();
  const badges = useBadges();
  const navigate = useNavigate();
  useTitle('More');
  const modules = [
    ...MODULES,
    ...(user.moderates?.length ? [{ to: '/college?tab=review', label: 'Review requests', text: 'College verifications', icon: ShieldCheck }] : []),
    ...(user.isAdmin ? [{ to: '/admin', label: 'Admin', text: 'Site management', icon: Shield }] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to={`/u/${user.username}`} className="card flex items-center gap-4 p-4 transition hover:border-ink/25">
        <Avatar user={user} size={56} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-display text-lg font-semibold">
            <span className="truncate">{user.name}</span>
            {user.verified && <VerifiedBadge />}
          </p>
          <p className="truncate text-sm text-muted">{user.headline || 'View and edit your profile'}</p>
        </div>
        <ChevronRight size={20} className="text-muted" />
      </Link>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {modules.map(({ to, label, text, icon: Icon, badge }, index) => (
          <motion.div key={to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <Link to={to} className="card flex h-full flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-ink/25">
              <span className="relative grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                <Icon size={20} />
                <CountBadge count={badges[badge]} />
              </span>
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-muted">{text}</span>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      <section className="card space-y-3 p-4">
        <h2 className="font-display font-semibold">Appearance</h2>
        <ThemeSwitch />
      </section>

      <Button
        variant="secondary"
        icon={LogOut}
        className="w-full"
        onClick={() => {
          logout();
          navigate('/', { replace: true });
        }}
      >
        Log out
      </Button>
      <SiteFooter compact className="[&>*]:justify-center" />
    </div>
  );
}
