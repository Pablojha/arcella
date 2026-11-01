import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../utils/errors.js';

const IMAGES = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const uploader = (maxMb, extensions) =>
  multer({
    storage: multer.memoryStorage(),
    defParamCharset: 'utf8',
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (req, file, done) => {
      const ok = extensions.includes(path.extname(file.originalname).slice(1).toLowerCase());
      done(ok ? null : new ApiError(400, `Allowed file types: ${extensions.join(', ')}`), ok);
    },
  });

export const images = uploader(8, IMAGES);
export const proofDocument = uploader(5, [...IMAGES, 'pdf']);
export const resourceFile = uploader(25, ['pdf', 'dwg', 'dxf', 'xlsx', 'xls', 'zip', ...IMAGES]);
