import { Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../ErrorBoundary';
import InstallBanner from '../InstallBanner';
import { ListSkeleton } from '../ui/Skeleton';
import BottomTabs from './BottomTabs';
import TopNav from './TopNav';

export default function AppShell() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const { user } = useAuth();
  const chat = /^\/messages\/.+/.test(pathname);
  const pageKey = pathname.startsWith('/messages') ? '/messages' : pathname;

  // New pages start at the top; back/forward keeps the browser's restored position.
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper">
        Skip to content
      </a>
      <TopNav hideOnMobile={chat} />
      <main id="main" className={`mx-auto w-full max-w-6xl px-4 md:px-6 ${chat ? 'md:pb-10 md:pt-6' : 'pb-28 pt-4 md:pb-12 md:pt-6'}`}>
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<ListSkeleton />}>
            <motion.div key={pageKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <Outlet />
            </motion.div>
          </Suspense>
        </ErrorBoundary>
      </main>
      {user && !chat && <BottomTabs />}
      <InstallBanner />
    </div>
  );
}
