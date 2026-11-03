import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

/** Local uploads live in backend/uploads unless UPLOAD_DIR points elsewhere (e.g. a Render persistent disk). */
export const UPLOAD_DIR = env.uploadDir ? path.resolve(env.uploadDir) : fileURLToPath(new URL('../../uploads', import.meta.url));

const useCloud = Object.values(env.cloudinary).every(Boolean);
/** Whether uploads go to Cloudinary (which can also take and convert formats browsers can't show, like HEIC). */
export const cloudStorage = useCloud;
if (useCloud) cloudinary.config({ ...env.cloudinary, secure: true });

function toCloud(file, folder) {
  const options = { folder: `arcella/${folder}`, resource_type: 'auto' };
  if (file.path) return cloudinary.uploader.upload(file.path, options).then((result) => result.secure_url);
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (err, result) => (err ? reject(err) : resolve(result.secure_url))).end(file.buffer);
  });
}

async function toDisk(file, folder) {
  const name = crypto.randomUUID() + path.extname(file.originalname).toLowerCase();
  const target = path.join(UPLOAD_DIR, folder, name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await (file.path ? fs.copyFile(file.path, target) : fs.writeFile(target, file.buffer));
  return `/uploads/${folder}/${name}`;
}

/** Stores a multer file (held in memory or staged on disk) on Cloudinary when configured, else local disk, and returns its URL. */
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
