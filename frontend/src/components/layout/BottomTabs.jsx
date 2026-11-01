import { motion } from 'framer-motion';
import { Briefcase, GraduationCap, House, LayoutGrid, MessageCircle, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useBadges } from '../../context/BadgeContext';
import CountBadge from '../ui/CountBadge';

const TABS = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/network', label: 'Network', icon: Users, badge: 'requests' },
  { to: '/college', label: 'College', icon: GraduationCap },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/messages', label: 'Messages', icon: MessageCircle, badge: 'messages' },
  { to: '/more', label: 'More', icon: LayoutGrid },
];

export default function BottomTabs() {
  const badges = useBadges();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Main">
      <div className="grid grid-cols-6">
        {TABS.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} className="relative flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium">
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="bottom-tab" transition={{ type: 'spring', stiffness: 500, damping: 36 }} className="absolute top-2 h-8 w-14 rounded-full bg-brand/15" />}
                <span className="relative">
                  <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} className={isActive ? 'text-brand' : 'text-muted'} />
                  <CountBadge count={badges[badge]} />
                </span>
                <span className={`relative ${isActive ? 'text-ink' : 'text-muted'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
