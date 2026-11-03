import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Briefcase, Clapperboard, GraduationCap, House, LayoutGrid, MessageCircle, Search, Users } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBadges } from '../../context/BadgeContext';
import Logo from '../brand/Logo';
import Wordmark from '../brand/Wordmark';
import Avatar from '../ui/Avatar';
import Button, { IconButton } from '../ui/Button';
import CountBadge from '../ui/CountBadge';

const NAV = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/network', label: 'Network', icon: Users, badge: 'requests' },
  { to: '/college', label: 'College', icon: GraduationCap },
  { to: '/reels', label: 'Reels', icon: Clapperboard },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/messages', label: 'Messages', icon: MessageCircle, badge: 'messages' },
  { to: '/notifications', label: 'Alerts', icon: Bell, badge: 'notifications' },
  { to: '/more', label: 'More', icon: LayoutGrid },
];

function SearchBox() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const submit = (event) => {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };
  return (
    <form onSubmit={submit} className="relative hidden w-full max-w-64 lg:block" role="search">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, projects, jobs" aria-label="Search Arcella" className="h-10 w-full rounded-full border border-line bg-card pl-10 pr-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15" />
    </form>
  );
}

export default function TopNav({ hideOnMobile = false }) {
  const { user } = useAuth();
  const badges = useBadges();
  const navigate = useNavigate();

  return (
    <header className={`sticky top-0 z-40 border-b border-line bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-md ${hideOnMobile ? 'hidden md:block' : ''}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-4 md:h-16 md:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <Logo size={30} />
          <Wordmark className="text-lg sm:text-xl" />
        </Link>
        {user && <SearchBox />}
        <div className="ml-auto flex items-center gap-1">
          {user ? (
            <>
              <nav className="hidden items-center md:flex">
                {NAV.map(({ to, label, icon: Icon, end, badge }) => (
                  <NavLink key={to} to={to} end={end} className="relative flex h-16 w-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium lg:w-[68px]">
                    {({ isActive }) => (
                      <>
                        <span className="relative">
                          <Icon size={20} className={isActive ? 'text-ink' : 'text-muted'} />
                          <CountBadge count={badges[badge]} />
                        </span>
                        <span className={isActive ? 'text-ink' : 'text-muted'}>{label}</span>
                        {isActive && <motion.span layoutId="topnav-active" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              <IconButton icon={Search} label="Search" className="lg:hidden" onClick={() => navigate('/search')} />
              <IconButton icon={Bell} label="Notifications" className="md:hidden" onClick={() => navigate('/notifications')}>
                <CountBadge count={badges.notifications} className="right-1 top-1" />
              </IconButton>
              <Link to={`/u/${user.username}`} className="ml-1 rounded-full ring-brand/40 transition hover:ring-4">
                <Avatar user={user} size={34} />
                <span className="sr-only">Your profile</span>
              </Link>
            </>
          ) : (
            <>
              <Button to="/explore" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Explore
              </Button>
              <Button to="/login" variant="ghost" size="sm">
                Log in
              </Button>
              <Button to="/register" size="sm">
                Join
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
