import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import RequireAuth from './components/layout/RequireAuth';
import LoadingScreen from './components/LoadingScreen';
import OfflineBanner from './components/OfflineBanner';
import { useAuth } from './context/AuthContext';

const Admin = lazy(() => import('./pages/Admin'));
const Auth = lazy(() => import('./pages/Auth'));
const College = lazy(() => import('./pages/College'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Events = lazy(() => import('./pages/Events'));
const Explore = lazy(() => import('./pages/Explore'));
const FirmDetail = lazy(() => import('./pages/FirmDetail'));
const Firms = lazy(() => import('./pages/Firms'));
const Home = lazy(() => import('./pages/Home'));
const JobDetail = lazy(() => import('./pages/JobDetail'));
const Jobs = lazy(() => import('./pages/Jobs'));
const Landing = lazy(() => import('./pages/Landing'));
const Mentors = lazy(() => import('./pages/Mentors'));
const Messages = lazy(() => import('./pages/Messages'));
const More = lazy(() => import('./pages/More'));
const Network = lazy(() => import('./pages/Network'));
const NewEvent = lazy(() => import('./pages/NewEvent'));
const NewFirm = lazy(() => import('./pages/NewFirm'));
const NewJob = lazy(() => import('./pages/NewJob'));
const NewProject = lazy(() => import('./pages/NewProject'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PasswordReset = lazy(() => import('./pages/PasswordReset'));
const PostPage = lazy(() => import('./pages/PostPage'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Profile = lazy(() => import('./pages/Profile'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const QuestionDetail = lazy(() => import('./pages/QuestionDetail'));
const Questions = lazy(() => import('./pages/Questions'));
const Resources = lazy(() => import('./pages/Resources'));
const Search = lazy(() => import('./pages/Search'));
const Settings = lazy(() => import('./pages/Settings'));
const Verify = lazy(() => import('./pages/Verify'));

const SPLASH_KEY = 'arcella_splash_seen';
const SPLASH_MS = 2100;

const PROTECTED = [
  ['posts/:id', PostPage],
  ['network', Network],
  ['u/:username', Profile],
  ['projects/new', NewProject],
  ['college', College],
  ['college/verify', Verify],
  ['jobs', Jobs],
  ['jobs/new', NewJob],
  ['jobs/:id', JobDetail],
  ['firms', Firms],
  ['firms/new', NewFirm],
  ['firms/:slug', FirmDetail],
  ['mentors', Mentors],
  ['events', Events],
  ['events/new', NewEvent],
  ['events/:id', EventDetail],
  ['qa', Questions],
  ['qa/:id', QuestionDetail],
  ['resources', Resources],
  ['messages', Messages],
  ['messages/:userId', Messages],
  ['notifications', Notifications],
  ['search', Search],
  ['settings', Settings],
  ['more', More],
  ['admin', Admin],
];

export default function App() {
  const { user, ready } = useAuth();
  const [splashDone, setSplashDone] = useState(() => sessionStorage.getItem(SPLASH_KEY) === '1');

  useEffect(() => {
    if (splashDone) return undefined;
    const id = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, '1');
      setSplashDone(true);
    }, SPLASH_MS);
    return () => clearTimeout(id);
  }, [splashDone]);

  return (
    <>
      <AnimatePresence>{!(ready && splashDone) && <LoadingScreen key="splash" done={ready} />}</AnimatePresence>
      <OfflineBanner />
      {ready && (
        <Suspense fallback={null}>
          <Routes>
            {!user && <Route index element={<Landing />} />}
            <Route path="login" element={<Auth mode="login" />} />
            <Route path="register" element={<Auth mode="register" />} />
            <Route path="reset" element={<PasswordReset />} />
            <Route element={<AppShell />}>
              {user && <Route index element={<Home />} />}
              <Route path="explore" element={<Explore />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route element={<RequireAuth />}>
                {PROTECTED.map(([path, Page]) => (
                  <Route key={path} path={path} element={<Page />} />
                ))}
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      )}
    </>
  );
}
