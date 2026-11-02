let playing = null;

/** Call when a video or voice note starts: whatever else was playing pauses, so only one plays at a time. */
export function playExclusive(element) {
  if (playing && playing !== element) playing.pause();
  playing = element;
}
