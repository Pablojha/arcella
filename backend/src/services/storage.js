import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

/** Local uploads live in backend/uploads unless UPLOAD_DIR points elsewhere (e.g. a Render persistent disk). */
export const UPLOAD_DIR = env.uploadDir ? path.resolve(env.uploadDir) : fileURLToPath(new URL('../../uploads', import.meta.url));

const useCloud = Object.values(env.cloudinary).every(Boolean);
if (useCloud) cloudinary.config({ ...env.cloudinary, secure: true });

const toCloud = (file, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: `arcella/${folder}`, resource_type: 'auto' }, (err, result) => (err ? reject(err) : resolve(result.secure_url)))
      .end(file.buffer);
  });

async function toDisk(file, folder) {
  const name = crypto.randomUUID() + path.extname(file.originalname).toLowerCase();
  await fs.mkdir(path.join(UPLOAD_DIR, folder), { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, folder, name), file.buffer);
  return `/uploads/${folder}/${name}`;
}

/** Stores a multer file on Cloudinary (when configured) or local disk and returns its URL. */
export const saveFile = (file, folder) => (useCloud ? toCloud(file, folder) : toDisk(file, folder));

export const saveFiles = (files = [], folder) => Promise.all(files.map((file) => saveFile(file, folder)));

/** Best-effort cleanup; a missing file must never fail the request that deleted its owner. */
export async function removeFiles(urls = []) {
  const jobs = urls.filter(Boolean).map((url) => {
    if (url.startsWith('/uploads/')) return fs.rm(path.join(UPLOAD_DIR, url.slice('/uploads/'.length)), { force: true });
    const match = useCloud && url.match(/\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;
    const [, type, id] = match;
    return cloudinary.uploader.destroy(type === 'raw' ? id : id.replace(/\.[^.]+$/, ''), { resource_type: type });
  });
  await Promise.allSettled(jobs);
}
