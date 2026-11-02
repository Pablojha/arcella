let playing = null;

/** Call when a video or voice note starts: whatever else was playing pauses, so only one plays at a time. */
export function playExclusive(element) {
  if (playing && playing !== element) playing.pause();
  playing = element;
}

/** Kind, size and (for videos) length of a picked file, read in the browser before it is sent. */
export function measureMedia(file) {
  const url = URL.createObjectURL(file);
  if (file.type.startsWith('video/')) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve({ kind: 'video', url, width: video.videoWidth || undefined, height: video.videoHeight || undefined, duration: video.duration });
      video.onerror = () => resolve({ kind: 'video', url });
      video.src = url;
    });
  }
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ kind: 'image', url, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ kind: 'image', url });
    image.src = url;
  });
}

/** A photo's width / height, read before it is uploaded (undefined when the browser can't read it). */
export async function aspectOf(file) {
  const { url, width, height } = await measureMedia(file);
  URL.revokeObjectURL(url);
  return width && height ? width / height : undefined;
}

// Reels start muted; turning sound on or off applies to every reel, in the feed and the Reels viewer, for the visit.
let soundOn = false;
const listeners = new Set();

export const reelSound = {
  get: () => soundOn,
  set(value) {
    soundOn = value;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
