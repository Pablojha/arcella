import { Router } from 'express';
import * as ctrl from '../controllers/connections.controller.js';
import { auth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(auth);
router.get('/', ctrl.list);
router.get('/requests', ctrl.requests);
router.post('/:userId', writeLimiter, ctrl.send);
router.post('/:userId/accept', ctrl.accept);
router.delete('/:userId', ctrl.remove);

export default router;
