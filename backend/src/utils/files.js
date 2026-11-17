import path from 'node:path';

const MIME = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** The file's name without any folder, and its type from the extension. */
export const fileInfo = (file) => {
  const name = path.basename(file.originalname);
  return { name, mime: MIME[path.extname(name).slice(1).toLowerCase()], size: file.size, data: file.buffer };
};

/** Sends a private file (a resume, a verification document) so browsers neither cache nor sniff it. */
export const sendPrivate = (res, { name, mime, data }, disposition = 'attachment') =>
  res
    .set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': name ? `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}` : disposition })
    .type(mime || 'application/octet-stream')
    .send(data);
