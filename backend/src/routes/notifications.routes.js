import { Router } from 'express';
import * as ctrl from '../controllers/notifications.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listQuery } from '../utils/zod.js';

const router = Router();

router.use(auth);
router.get('/', validate(listQuery(), 'query'), ctrl.list);
router.get('/badges', ctrl.badges);
router.post('/read', ctrl.markRead);

export default router;
