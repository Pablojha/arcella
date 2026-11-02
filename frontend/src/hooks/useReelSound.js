import { useSyncExternalStore } from 'react';
import { reelSound } from '../lib/media';

/** `[soundOn, setSoundOn]` for reels: off until the viewer turns it on, then on for every reel this visit. */
export const useReelSound = () => [useSyncExternalStore(reelSound.subscribe, reelSound.get), reelSound.set];
