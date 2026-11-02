import { Router } from 'express';
import * as ctrl from '../controllers/gifs.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { text, z } from '../utils/zod.js';

const router = Router();

router.get('/', auth, validate(z.object({ q: text(50).optional() }), 'query'), ctrl.search);

export default router;
