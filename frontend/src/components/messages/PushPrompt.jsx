import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { readPreference, savePreference } from '../../lib/consent';
import { enablePush, pushState } from '../../lib/push';
import Button from '../ui/Button';

const DISMISSED_KEY = 'arcella_push_prompt_dismissed';
const ASK_AGAIN_MS = 14 * 24 * 60 * 60 * 1000;

const dismissedLately = () => Date.now() - Number(readPreference(DISMISSED_KEY) || 0) < ASK_AGAIN_MS;

/**
 * Invites the member to turn on message notifications. It appears in Messages, where they matter, rather than on
 * first launch; the browser's own question only comes after a tap here, and "Not now" rests it for two weeks.
 */
export default function PushPrompt() {
  const toast = useToast();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!dismissedLately()) pushState().then(setState, () => setState('unsupported'));
  }, []);

  if (state !== 'off' || Notification.permission !== 'default') return null;

  const turnOn = async () => {
    setBusy(true);
    try {
      const answer = await enablePush();
      if (answer === 'granted') toast.success("Notifications are on. We'll tell you about new messages.");
      if (answer === 'denied') toast.info('Notifications are blocked. You can allow them for Arcella in your browser settings.');
      setState(answer);
    } catch {
      toast.error("Couldn't turn on notifications on this device. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const later = () => {
    savePreference(DISMISSED_KEY, String(Date.now()));
    setState('later');
  };

  return (
    <div className="card mb-3 flex items-center gap-3 p-3 md:mx-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
        <BellRing size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Turn on message notifications</p>
        <p className="text-xs text-muted">Know when someone messages you, even with Arcella closed.</p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <Button size="sm" onClick={turnOn} loading={busy}>
          Turn on
        </Button>
        <button type="button" onClick={later} className="px-2 py-1 text-xs text-muted hover:text-ink">
          Not now
        </button>
      </div>
    </div>
  );
}
