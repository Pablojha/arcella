import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OPEN_STORAGE_SETTINGS, setStorageChoice, storageChoice } from '../lib/consent';
import Button from './ui/Button';
import Sheet from './ui/Sheet';
import Toggle from './ui/Toggle';

function Category({ title, status, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted">{children}</p>
      </div>
      <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-muted">{status}</span>
    </div>
  );
}

/**
 * The storage notice on a first visit, and "Cookie settings" whenever a footer or Settings opens it. Arcella has no
 * advertising or analytics storage, so the only optional category is remembering preferences on this device.
 */
export default function StorageNotice() {
  const { user } = useAuth();
  const [choice, setChoice] = useState(storageChoice);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener(OPEN_STORAGE_SETTINGS, open);
    return () => window.removeEventListener(OPEN_STORAGE_SETTINGS, open);
  }, []);

  const choose = (preferences) => {
    setStorageChoice(preferences);
    setChoice(storageChoice() ?? { preferences });
  };

  return (
    <>
      <AnimatePresence>
        {!choice && (
          <motion.section
            aria-labelledby="storage-notice-title"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className={`fixed inset-x-3 z-[70] mx-auto max-w-lg rounded-3xl border border-line bg-card p-4 shadow-2xl md:inset-x-auto md:bottom-6 md:left-6 md:mx-0 ${user ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]' : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))]'}`}
          >
            <h2 id="storage-notice-title" className="flex items-center gap-2 font-semibold">
              <Cookie size={18} className="text-brand" aria-hidden="true" /> Your privacy
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Arcella uses your browser&apos;s storage only to keep you signed in and to work offline: no ads, no tracking. It can also remember preferences such as dark mode on this device.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => choose(true)}>
                Remember preferences
              </Button>
              <Button size="sm" variant="secondary" onClick={() => choose(false)}>
                Essential only
              </Button>
              <Link to="/cookies" className="ml-auto text-sm font-medium text-brand hover:underline">
                Cookie policy
              </Link>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Cookie settings">
        <div className="space-y-5 pb-2">
          <p className="text-sm text-muted">Arcella doesn&apos;t set advertising or analytics cookies. Here is everything it keeps in your browser.</p>
          <Category title="Essential" status="Always on">
            Keeps you signed in, remembers this choice, and lets the app load quickly and offline.
          </Category>
          <Toggle
            checked={Boolean(choice?.preferences)}
            onChange={choose}
            label="Preferences"
            hint="Remembers dark mode and the tips you closed on this device. When off, they last until you close the tab."
          />
          <Category title="Analytics and advertising" status="Not used">
            Arcella doesn&apos;t track you or show ads.
          </Category>
          <Link to="/cookies" onClick={() => setSettingsOpen(false)} className="inline-block text-sm font-medium text-brand hover:underline">
            Read the cookie policy
          </Link>
        </div>
      </Sheet>
    </>
  );
}
