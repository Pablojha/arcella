import { Router } from 'express';
import { PROJECT_CATEGORIES } from '../config/constants.js';
import * as ctrl from '../controllers/projects.controller.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { images } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { bool, int, list, listQuery, objectId, required, text, z } from '../utils/zod.js';
import critiqueRoutes from './critiques.routes.js';

const projectSchema = z.object({
  title: required(100),
  description: text(3000).optional(),
  category: z.enum(PROJECT_CATEGORIES).optional(),
  year: int(1950, 2100),
  site: text(100).optional(),
  tools: list(15),
  critiqueOpen: bool,
  critiquePrompt: text(300).optional(),
});

const listSchema = listQuery({ category: z.enum(PROJECT_CATEGORIES).optional(), owner: objectId.optional() });

const router = Router();

router.get('/', optionalAuth, validate(listSchema, 'query'), ctrl.list);
router.get('/:id', optionalAuth, ctrl.get);
router.post('/', auth, images.array('images', 8), validate(projectSchema), ctrl.create);
router.patch('/:id', auth, validate(projectSchema.partial()), ctrl.update);
router.delete('/:id', auth, ctrl.remove);
router.post('/:id/appreciate', auth, ctrl.appreciate);
router.use('/:id/critiques', critiqueRoutes);

export default router;
