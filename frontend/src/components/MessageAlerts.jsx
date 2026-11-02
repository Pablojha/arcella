import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBadges } from '../context/BadgeContext';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { clearChatNotifications, PUSH_CHANGED, pushEndpoint, syncPush } from '../lib/push';
import { socket } from '../lib/realtime';
import Logo from './brand/Logo';
import Avatar from './ui/Avatar';

const BANNER_MS = 5000;
const MAX_BANNERS = 3;
let arrivals = 0;

function Banner({ alert, onOpen, onDismiss }) {
  const dismiss = useRef(onDismiss);

  useEffect(() => {
    dismiss.current = onDismiss;
  });

  // Another message from the same chat keeps its banner up for longer.
  useEffect(() => {
    const id = setTimeout(() => dismiss.current(), BANNER_MS);
    return () => clearTimeout(id);
  }, [alert.arrival]);

  return (
    <motion.div
      layout
      initial={{ y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -72, opacity: 0 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0 }}
      onDragEnd={(_, info) => info.offset.y < -30 && onDismiss()}
      className="pointer-events-auto flex w-full items-center gap-1 rounded-2xl border border-line bg-card/95 py-2.5 pl-3 pr-1.5 shadow-xl backdrop-blur"
    >
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        {alert.user ? <Avatar user={alert.user} size={40} /> : <Logo size={40} />}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-sm font-semibold">{alert.title}</span>
            {alert.count > 1 && <span className="shrink-0 text-xs text-muted">{alert.count} new</span>}
          </span>
          <span className="block truncate text-sm text-muted">{alert.body}</span>
        </span>
      </button>
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-ink/5 hover:text-ink">
        <X size={16} />
      </button>
    </motion.div>
  );
}

/**
 * Message notifications while the app is open. Each window tells the server whether it is on screen, which chat it
 * shows and which device it is on, so the server never pushes a chat being read, nor to a screen that is already on.
 * Messages from other chats show as banners at the top instead (one per chat, newest first; not over the chat list).
 * It also keeps the app icon's unread badge in step, re-registers the device after sign-in, and opens the chat a
 * notification was tapped for.
 */
export default function MessageAlerts() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { messages } = useBadges();
  const [banners, setBanners] = useState([]);
  const chat = pathname.match(/^\/messages\/([a-f\d]{24})/)?.[1] ?? null;

  const report = useCallback(async () => {
    const endpoint = await pushEndpoint().catch(() => null);
    if (socket.connected) socket.emit('presence', { visible: document.visibilityState === 'visible', chat, endpoint });
  }, [chat]);

  useEffect(() => {
    report();
    document.addEventListener('visibilitychange', report);
    window.addEventListener(PUSH_CHANGED, report);
    return () => {
      document.removeEventListener('visibilitychange', report);
      window.removeEventListener(PUSH_CHANGED, report);
    };
  }, [report]);
  useSocketEvent('connect', report);

  useEffect(() => {
    if (chat) clearChatNotifications(chat).catch(() => {});
  }, [chat]);

  useSocketEvent('message:alert', (alert) => {
    if (pathname === '/messages' || (alert.chat === chat && document.visibilityState === 'visible')) return;
    setBanners((current) => {
      const earlier = current.find((banner) => banner.chat === alert.chat);
      const next = { ...alert, count: (earlier?.count ?? 0) + 1, arrival: ++arrivals };
      return [next, ...current.filter((banner) => banner.chat !== alert.chat)].slice(0, MAX_BANNERS);
    });
  });

  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    (messages ? navigator.setAppBadge(messages) : navigator.clearAppBadge()).catch(() => {});
  }, [messages]);

  useEffect(() => {
    syncPush().catch(() => {});
    if (!('serviceWorker' in navigator)) return undefined;
    const open = ({ data }) => data?.type === 'open' && data.url?.startsWith('/') && navigate(data.url);
    navigator.serviceWorker.addEventListener('message', open);
    return () => navigator.serviceWorker.removeEventListener('message', open);
  }, [navigate]);

  const dismiss = (id) => setBanners((current) => current.filter((banner) => banner.chat !== id));

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[95] mx-auto flex w-full max-w-md flex-col gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <AnimatePresence initial={false}>
        {banners
          .filter((banner) => banner.chat !== chat)
          .map((banner) => (
            <Banner
              key={banner.chat}
              alert={banner}
              onOpen={() => {
                dismiss(banner.chat);
                navigate(banner.url);
              }}
              onDismiss={() => dismiss(banner.chat)}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
