import { Router } from 'express';
import * as ctrl from '../controllers/push.controller.js';
import { env } from '../config/env.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from '../utils/zod.js';

// The push services of Chrome/Android, Firefox, Safari/iOS and Edge. Anything else is refused, so the server never
// posts to an address a member made up. Local test push services are allowed outside production.
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/;

function isPushService(value) {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' && PUSH_HOSTS.test(url.hostname)) || (!env.isProd && url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

const endpoint = z.string().max(1000).refine(isPushService, 'This is not a push service address');

const subscriptionSchema = z.object({
  endpoint,
  keys: z.object({ p256dh: z.string().min(16).max(200), auth: z.string().min(8).max(100) }),
});

const router = Router();

router.get('/key', ctrl.key);
router.use(auth);
router.post('/subscriptions', validate(subscriptionSchema), ctrl.subscribe);
router.delete('/subscriptions', validate(z.object({ endpoint })), ctrl.unsubscribe);

export default router;
