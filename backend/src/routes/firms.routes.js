import { Router } from 'express';
import { FIRM_SIZES } from '../config/constants.js';
import * as ctrl from '../controllers/firms.controller.js';
import { auth } from '../middleware/auth.js';
import { images } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { bool, link, list, listQuery, required, text, z } from '../utils/zod.js';

const firmSchema = z.object({
  name: required(100, 2),
  about: text(3000).optional(),
  size: z.enum(FIRM_SIZES).optional(),
  city: text(60).optional(),
  website: link,
});

const updateSchema = firmSchema.partial().extend({ removeGallery: list(30, 500) });
const listSchema = listQuery({ city: text(60).optional(), mine: bool });
const firmFiles = images.fields(ctrl.FIRM_FILES);

const router = Router();

router.use(auth);
router.get('/', validate(listSchema, 'query'), ctrl.list);
router.post('/', firmFiles, validate(firmSchema), ctrl.create);
router.get('/:slug', ctrl.get);
router.patch('/:id', firmFiles, validate(updateSchema), ctrl.update);
router.post('/:id/follow', ctrl.follow);
router.post('/:id/work', ctrl.work);

export default router;
