import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import RequireAuth from './components/layout/RequireAuth';
import LoadingScreen from './components/LoadingScreen';
import MessageAlerts from './components/MessageAlerts';
import OfflineBanner from './components/OfflineBanner';
import StorageNotice from './components/StorageNotice';
import { useAuth } from './context/AuthContext';
import { socket } from './lib/realtime';
// Bundled up front: it is the first page new visitors see, so it shouldn't wait for a second download.
import Landing from './pages/Landing';

/** A lazily loaded page that can also be fetched ahead of time. */
const page = (load) => Object.assign(lazy(load), { preload: load });

const Admin = page(() => import('./pages/Admin'));
const Auth = page(() => import('./pages/Auth'));
const College = page(() => import('./pages/College'));
const EventDetail = page(() => import('./pages/EventDetail'));
const Events = page(() => import('./pages/Events'));
const Explore = page(() => import('./pages/Explore'));
const FirmDetail = page(() => import('./pages/FirmDetail'));
const Firms = page(() => import('./pages/Firms'));
const Home = page(() => import('./pages/Home'));
const JobDetail = page(() => import('./pages/JobDetail'));
const Jobs = page(() => import('./pages/Jobs'));
const Mentors = page(() => import('./pages/Mentors'));
const Messages = page(() => import('./pages/Messages'));
const More = page(() => import('./pages/More'));
const Network = page(() => import('./pages/Network'));
const NewEvent = page(() => import('./pages/NewEvent'));
const NewFirm = page(() => import('./pages/NewFirm'));
const NewJob = page(() => import('./pages/NewJob'));
const Applicants = page(() => import('./pages/Applicants'));
const NewProject = page(() => import('./pages/NewProject'));
const NotFound = page(() => import('./pages/NotFound'));
const Notifications = page(() => import('./pages/Notifications'));
const PasswordReset = page(() => import('./pages/PasswordReset'));
const PostPage = page(() => import('./pages/PostPage'));
const Accessibility = page(() => import('./pages/Accessibility'));
const Cookies = page(() => import('./pages/Cookies'));
const Copyright = page(() => import('./pages/Copyright'));
const Guidelines = page(() => import('./pages/Guidelines'));
const Privacy = page(() => import('./pages/Privacy'));
const Refunds = page(() => import('./pages/Refunds'));
const Terms = page(() => import('./pages/Terms'));
const Profile = page(() => import('./pages/Profile'));
const ProjectDetail = page(() => import('./pages/ProjectDetail'));
const QuestionDetail = page(() => import('./pages/QuestionDetail'));
const Questions = page(() => import('./pages/Questions'));
const Reels = page(() => import('./pages/Reels'));
const Resources = page(() => import('./pages/Resources'));
const Saved = page(() => import('./pages/Saved'));
const Search = page(() => import('./pages/Search'));
const Settings = page(() => import('./pages/Settings'));
const Verify = page(() => import('./pages/Verify'));

/** Pages behind the main tabs, fetched while the app is idle so they open instantly. */
const TAB_PAGES = [Home, Network, College, Jobs, Messages, More, Notifications, Profile, Explore];

const SPLASH_KEY = 'arcella_splash_seen';
const SPLASH_MS = 2100;
// The branded launch animation plays when Arcella opens as an installed app; in a browser tab, content shows at once.
const INSTALLED_APP = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || Boolean(window.Capacitor);

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
  ['jobs/:id/edit', NewJob],
  ['jobs/:id/applicants', Applicants],
  ['firms', Firms],
  ['firms/new', NewFirm],
  ['firms/:slug', FirmDetail],
  ['mentors', Mentors],
  ['events', Events],
  ['events/new', NewEvent],
  ['events/:id', EventDetail],
  ['qa', Questions],
  ['qa/:id', QuestionDetail],
  ['reels', Reels],
  ['resources', Resources],
  ['messages', Messages],
  ['messages/:userId', Messages],
  ['notifications', Notifications],
  ['saved', Saved],
  ['search', Search],
  ['settings', Settings],
  ['more', More],
  ['admin', Admin],
];

export default function App() {
  const { user, ready } = useAuth();
  const signedIn = Boolean(user);
  const [splashDone, setSplashDone] = useState(() => !INSTALLED_APP || sessionStorage.getItem(SPLASH_KEY) === '1');

  useEffect(() => {
    if (splashDone) return undefined;
    const id = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, '1');
      setSplashDone(true);
    }, SPLASH_MS);
    return () => clearTimeout(id);
  }, [splashDone]);

  useEffect(() => {
    if (!signedIn) return undefined;
    const id = setTimeout(() => TAB_PAGES.forEach((Page) => Page.preload()), 1500);
    socket.connect();
    return () => {
      clearTimeout(id);
      socket.disconnect();
    };
  }, [signedIn]);

  return (
    <>
      <AnimatePresence>{!(ready && splashDone) && <LoadingScreen key="splash" done={ready} />}</AnimatePresence>
      <OfflineBanner />
      {user && <MessageAlerts />}
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
              <Route path="terms" element={<Terms />} />
              <Route path="cookies" element={<Cookies />} />
              <Route path="refunds" element={<Refunds />} />
              <Route path="guidelines" element={<Guidelines />} />
              <Route path="copyright" element={<Copyright />} />
              <Route path="accessibility" element={<Accessibility />} />
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
      {ready && splashDone && <StorageNotice />}
    </>
  );
}
