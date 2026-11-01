import { Router } from 'express';
import { COLLEGE_ROLES, DOC_TYPES } from '../config/constants.js';
import * as ctrl from '../controllers/verification.controller.js';
import { auth } from '../middleware/auth.js';
import { otpLimiter } from '../middleware/rateLimit.js';
import { proofDocument } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { email, int, objectId, text, z } from '../utils/zod.js';

const details = {
  college: objectId,
  role: z.enum(COLLEGE_ROLES),
  batch: int(1950, new Date().getFullYear() + 6),
};
const needsBatch = [(data) => data.role === 'faculty' || Boolean(data.batch), { message: 'Batch year is required', path: ['batch'] }];

const sendSchema = z.object({ ...details, email }).refine(...needsBatch);
const documentSchema = z.object({ ...details, docType: z.enum(DOC_TYPES) }).refine(...needsBatch);
const confirmSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your email') });
const reviewSchema = z.object({ decision: z.enum(['approve', 'reject']), note: text(300).optional() });

const router = Router();

router.use(auth);
router.get('/me', ctrl.mine);
router.post('/email/send', otpLimiter, validate(sendSchema), ctrl.sendCode);
router.post('/email/confirm', otpLimiter, validate(confirmSchema), ctrl.confirmCode);
router.post('/document', proofDocument.single('document'), validate(documentSchema), ctrl.uploadDocument);
router.get('/queue', ctrl.queue);
router.get('/:id/document', ctrl.document);
router.post('/:id/review', validate(reviewSchema), ctrl.review);

export default router;
