import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Share, X } from 'lucide-react';
import { readPreference, savePreference } from '../lib/consent';
import Logo from './brand/Logo';
import Button from './ui/Button';

const DISMISS_KEY = 'arcella_install_dismissed';
const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || Boolean(window.Capacitor);
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

/** "Install app" prompt: native prompt on Android/desktop Chrome, Share → Add to Home Screen hint on iOS. */
export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (standalone || readPreference(DISMISS_KEY)) return undefined;
    const onPrompt = (event) => {
      event.preventDefault();
      setPrompt(event);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const iosTimer = ios ? setTimeout(() => setVisible(true), 5000) : null;
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    savePreference(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    prompt.prompt();
    await prompt.userChoice;
    dismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-3 rounded-2xl border border-line bg-card p-3 shadow-xl md:inset-x-auto md:bottom-6 md:left-6 md:w-96"
        >
          <Logo size={42} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Install Arcella</p>
            <p className="text-xs text-muted">
              {prompt ? 'Faster, full-screen and on your home screen.' : <>Tap <Share size={12} className="inline" /> then “Add to Home Screen”.</>}
            </p>
          </div>
          {prompt && (
            <Button size="sm" icon={Download} onClick={install}>
              Install
            </Button>
          )}
          <button type="button" aria-label="Dismiss" onClick={dismiss} className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-ink/5">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
