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

const placeholder = (label) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#8a8580" fill-opacity=".16"/><g fill="none" stroke="#8a8580" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><rect x="166" y="96" width="68" height="56" rx="8"/><path d="M158 88l84 72"/></g><text x="200" y="196" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="#8a8580">${label}</text></svg>`,
  )}`;
const MISSING_PHOTO = placeholder('Photo unavailable');
const MISSING_VIDEO = placeholder('Video unavailable');

/**
 * Photos and videos whose file is gone (for example uploads lost with a server's disk) show a neutral placeholder
 * everywhere instead of a broken image or a black video. Media errors don't bubble, so this listens in the capture
 * phase. Elements marked `data-fallback="own"` (avatars, which show initials) handle it themselves.
 */
export function showMissingMedia() {
  document.addEventListener(
    'error',
    ({ target }) => {
      const element = target instanceof HTMLSourceElement ? target.parentElement : target;
      if (!element || element.dataset?.fallback === 'own' || element.dataset?.missing) return;
      if (element instanceof HTMLImageElement) {
        element.dataset.missing = 'true';
        // A srcset would win over src and keep asking for the missing file.
        element.removeAttribute('srcset');
        element.src = MISSING_PHOTO;
      } else if (element instanceof HTMLVideoElement) {
        element.dataset.missing = 'true';
        element.poster = MISSING_VIDEO;
      }
    },
    true,
  );
}
