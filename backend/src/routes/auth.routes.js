import { Router } from 'express';
import { USER_TYPES } from '../config/constants.js';
import * as ctrl from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { email, required, z } from '../utils/zod.js';

const password = z.string().min(8).max(100);

const registerSchema = z.object({ name: required(60, 2), email, password, type: z.enum(USER_TYPES) });
const loginSchema = z.object({ email, password: z.string().min(1).max(100) });
const resetSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'This reset link is invalid'), password });
const changeSchema = z.object({ current: z.string().min(1).max(100), password });

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/forgot', authLimiter, validate(z.object({ email })), ctrl.forgotPassword);
router.post('/reset', authLimiter, validate(resetSchema), ctrl.resetPassword);
router.get('/me', auth, ctrl.me);
router.patch('/password', auth, authLimiter, validate(changeSchema), ctrl.changePassword);

export default router;
