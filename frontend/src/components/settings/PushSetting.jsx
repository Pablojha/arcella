import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { disablePush, enablePush, pushState } from '../../lib/push';
import { Skeleton } from '../ui/Skeleton';
import Toggle from '../ui/Toggle';

const NOTES = {
  unsupported: "This browser can't show notifications from Arcella. On an iPhone, add Arcella to your Home Screen and open it from there.",
  blocked: 'Notifications are blocked for Arcella. Allow them in your browser or phone settings, then come back here.',
};

/** Turns message notifications on or off for this device only. */
export default function PushSetting() {
  const toast = useToast();
  const [state, setState] = useState(null);

  useEffect(() => {
    pushState().then(setState, () => setState('unsupported'));
  }, []);

  const change = async (on) => {
    try {
      if (on && (await enablePush()) === 'denied') toast.info('Notifications are blocked. You can allow them for Arcella in your browser settings.');
      if (!on) await disablePush();
      setState(await pushState());
    } catch {
      toast.error("Couldn't change notifications on this device. Please try again.");
    }
  };

  if (!state) return <Skeleton className="h-10 w-full" />;
  if (NOTES[state]) return <p className="text-sm text-muted">{NOTES[state]}</p>;
  return <Toggle checked={state === 'on'} onChange={change} label="Message notifications on this device" hint="New messages and reactions, even when Arcella is closed." />;
}
