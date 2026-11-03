import { Router } from 'express';
import { USER_TYPES } from '../config/constants.js';
import * as ctrl from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { email, required, z } from '../utils/zod.js';

const password = z.string().min(8).max(100);
const code = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your email');

const registerSchema = z.object({
  name: required(60, 2),
  email,
  password,
  type: z.enum(USER_TYPES),
  acceptTerms: z.unknown().refine((value) => value === true, 'Please accept the Terms of Use and Privacy Policy'),
});
const loginSchema = z.object({ email, password: z.string().min(1).max(100) });
const verifySchema = z.object({ email, code });
const resetSchema = z.object({ email, code, password });
const changeSchema = z.object({ current: z.string().min(1).max(100), password });
// An authenticator code (6 digits) or a recovery code (xxxx-xxxx).
const secondFactor = z.string().trim().regex(/^(\d{6}|[0-9a-f]{4}-[0-9a-f]{4})$/i, 'Enter the 6-digit code from your app, or a recovery code');
const twoFactorLoginSchema = z.object({ ticket: z.string().min(1).max(1000), code: secondFactor });
const enableSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your app') });
const disableSchema = z.object({ password: z.string().min(1).max(100), code: secondFactor });

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/verify-email', authLimiter, validate(verifySchema), ctrl.verifyEmail);
router.post('/resend-code', authLimiter, validate(z.object({ email })), ctrl.resendSignupCode);
router.post('/forgot', authLimiter, validate(z.object({ email })), ctrl.forgotPassword);
router.post('/reset', authLimiter, validate(resetSchema), ctrl.resetPassword);
router.get('/me', auth, ctrl.me);
router.patch('/password', auth, authLimiter, validate(changeSchema), ctrl.changePassword);
router.post('/2fa/login', authLimiter, validate(twoFactorLoginSchema), ctrl.twoFactorLogin);
router.post('/2fa/setup', auth, ctrl.setupTwoFactor);
router.post('/2fa/enable', auth, authLimiter, validate(enableSchema), ctrl.enableTwoFactor);
router.post('/2fa/disable', auth, authLimiter, validate(disableSchema), ctrl.disableTwoFactor);
router.post('/logout', auth, ctrl.logout);
router.get('/devices', auth, ctrl.devices);
router.post('/devices/sign-out-others', auth, ctrl.signOutOthers);
router.delete('/devices/:id', auth, ctrl.removeDevice);
router.get('/history', auth, ctrl.history);

export default router;
