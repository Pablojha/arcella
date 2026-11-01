import { Router } from 'express';
import { RESOURCE_KINDS } from '../config/constants.js';
import * as ctrl from '../controllers/resources.controller.js';
import { auth } from '../middleware/auth.js';
import { resourceFile } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { bool, int, listQuery, required, text, z } from '../utils/zod.js';

const resourceSchema = z.object({
  title: required(120),
  description: text(1000).optional(),
  kind: z.enum(RESOURCE_KINDS),
  semester: z.coerce.number().int().min(1).max(10),
  subject: text(80).optional(),
});

const listSchema = listQuery({ semester: int(1, 10), kind: z.enum(RESOURCE_KINDS).optional(), saved: bool });

const router = Router();

router.use(auth);
router.get('/', validate(listSchema, 'query'), ctrl.list);
router.post('/', resourceFile.single('file'), validate(resourceSchema), ctrl.create);
router.post('/:id/bookmark', ctrl.bookmark);
router.post('/:id/download', ctrl.download);
router.delete('/:id', ctrl.remove);

export default router;
