import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../utils/errors.js';

const MB = 1024 * 1024;
const IMAGES = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const VIDEOS = ['mp4', 'mov', 'webm', 'm4v'];
const AUDIO = ['webm', 'ogg', 'oga', 'm4a', 'mp4', 'mp3', 'wav', 'aac'];
const CHAT_KINDS = { image: IMAGES, video: VIDEOS, voice: AUDIO };

const extensionOf = (file) => path.extname(file.originalname).slice(1).toLowerCase();

/** `types` lists the allowed extensions, or maps each form field to its own list. */
const uploader = (maxMb, types, storage = multer.memoryStorage()) =>
  multer({
    storage,
    defParamCharset: 'utf8',
    limits: { fileSize: maxMb * MB },
    fileFilter: (req, file, done) => {
      const allowed = Array.isArray(types) ? types : types[file.fieldname];
      const ok = allowed.includes(extensionOf(file));
      done(ok ? null : new ApiError(400, `Allowed file types: ${allowed.join(', ')}`), ok);
    },
  });

export const images = uploader(8, IMAGES);
export const proofDocument = uploader(5, [...IMAGES, 'pdf']);
export const resourceFile = uploader(25, ['pdf', 'dwg', 'dxf', 'xlsx', 'xls', 'zip', ...IMAGES]);

// Post media is staged in temp files, so a video never sits in the server's memory.
const media = uploader(40, { images: IMAGES, video: VIDEOS }, multer.diskStorage({}));

/** Deletes the staged temp files once the response is over, however the request ended. */
function dropTempFiles(req, res, next) {
  res.on('close', () => [req.file, ...Object.values(req.files ?? {}).flat()].filter(Boolean).forEach((file) => fs.rm(file.path, { force: true }, () => {})));
  next();
}

const photoLimit = (req, res, next) => next(req.files?.images?.some((file) => file.size > 8 * MB) ? new ApiError(400, 'Each photo must be under 8 MB') : undefined);

/** A post's media: up to 4 photos (8 MB each) or one video (40 MB). */
export const postMedia = [dropTempFiles, media.fields([{ name: 'images', maxCount: 4 }, { name: 'video', maxCount: 1 }]), photoLimit];

const chatFile = uploader(40, [...new Set([...IMAGES, ...VIDEOS, ...AUDIO])], multer.diskStorage({}));

/** The file must be of the kind it was sent as: a photo, a video or a voice note. */
function matchKind(req, res, next) {
  if (!req.file) return next(new ApiError(400, 'Choose a photo, video or voice note'));
  if (!CHAT_KINDS[req.body.kind]?.includes(extensionOf(req.file))) return next(new ApiError(400, 'That file does not match the message type'));
  next(req.body.kind === 'image' && req.file.size > 8 * MB ? new ApiError(400, 'Photos must be under 8 MB') : undefined);
}

/** One photo (8 MB), video (40 MB) or voice note for a direct or group message. */
export const chatAttachment = [dropTempFiles, chatFile.single('file'), matchKind];
