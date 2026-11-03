const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp'];
// What the API stores as photos. GIFs stay as they are so they keep moving.
const ACCEPTED = [...COMPRESSIBLE, 'image/gif'];

/**
 * Downscales large photos (phones shoot 4–12 MB) so uploads stay quick on mobile data, and turns other formats the
 * browser can open (AVIF, BMP, and HEIC in Safari) into JPEG. Anything it can't open, such as iPhone HEIC photos in
 * Chrome or Edge, goes up as it is; the API accepts HEIC and the image service converts it for display.
 */
export async function compressImage(file, maxSide = 2048, quality = 0.85) {
  const convert = !ACCEPTED.includes(file.type);
  if (!convert && (!COMPRESSIBLE.includes(file.type) || file.size < 600 * 1024)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob && (convert || blob.size < file.size) ? new File([blob], file.name.replace(/(\.\w+)?$/, '.jpg'), { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

/** Hands the browser a file to save under `name`. */
export function saveBlob(blob, name) {
  const href = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

/** Saves a file under its original name; falls back to opening it when the host blocks fetches. */
export async function downloadFile(url, name) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(response.statusText);
    saveBlob(await response.blob(), name);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}
