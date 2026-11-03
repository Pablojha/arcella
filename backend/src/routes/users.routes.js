import { Router } from 'express';
import { USER_TYPES, VISIBILITY } from '../config/constants.js';
import * as ctrl from '../controllers/users.controller.js';
import { NOTIFICATION_GROUPS } from '../services/notify.js';
import { auth } from '../middleware/auth.js';
import { exportLimiter } from '../middleware/rateLimit.js';
import { images, resumeFile } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { membershipDetails, membershipRules } from '../utils/membership.schema.js';
import { int, link, list, listQuery, objectId, required, text, z } from '../utils/zod.js';

const experience = z.object({
  title: required(80),
  org: required(80),
  start: text(20).optional(),
  end: text(20).optional(),
  description: text(600).optional(),
});

const certification = z.object({
  name: required(100),
  issuer: text(100).optional(),
  year: int(1950, new Date().getFullYear() + 1),
  url: link,
});

const profileSchema = z.object({
  name: required(60, 2).optional(),
  headline: text(120).optional(),
  bio: text(1500).optional(),
  location: text(80).optional(),
  website: link,
  software: list(25),
  skills: list(30),
  experience: z.array(experience).max(20).optional(),
  languages: list(10, 40),
  certifications: z.array(certification).max(20).optional(),
  contact: z
    .object({
      phone: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, 'Enter a valid phone number').or(z.literal('')).optional(),
      emailVisibility: z.enum(VISIBILITY).optional(),
      phoneVisibility: z.enum(VISIBILITY).optional(),
    })
    .optional(),
});

const { college, ...editable } = membershipDetails;
const newMembership = membershipRules(z.object({ college, ...editable }), { needsLevel: true });
const membershipChanges = membershipRules(z.object(editable), { needsLevel: true });

const searchSchema = listQuery({
  software: text(40).optional(),
  college: objectId.optional(),
  type: z.enum(USER_TYPES).optional(),
});

const router = Router();

router.use(auth);
router.get('/', validate(searchSchema, 'query'), ctrl.search);
router.get('/suggestions', ctrl.suggestions);
router.patch('/me', validate(profileSchema), ctrl.updateMe);
router.delete('/me', validate(z.object({ password: z.string().min(1).max(100) })), ctrl.deleteMe);
router.get('/me/blocked', ctrl.blockedList);
router.get('/me/views', ctrl.profileViews);
router.get('/me/resume', ctrl.myResume);
router.put('/me/resume', resumeFile.single('resume'), ctrl.saveResume);
router.get('/me/resume/file', ctrl.downloadResume);
router.delete('/me/resume', ctrl.removeResume);
router.put('/me/notifications', validate(z.object({ off: z.array(z.enum(Object.keys(NOTIFICATION_GROUPS))).max(10) })), ctrl.setNotifications);
router.get('/me/export', exportLimiter, ctrl.exportMe);
router.post('/me/memberships', validate(newMembership), ctrl.addMembership);
router.put('/me/memberships/:membershipId', validate(membershipChanges), ctrl.updateMembership);
router.delete('/me/memberships/:membershipId', ctrl.removeMembership);
router.post('/me/memberships/:membershipId/primary', ctrl.choosePrimary);
router.post('/me/avatar', images.single('image'), ctrl.updateImage('avatar'));
router.post('/me/cover', images.single('image'), ctrl.updateImage('cover'));
router.get('/:id', ctrl.profile);
router.post('/:id/block', ctrl.toggleBlock);
router.post('/:id/follow', ctrl.toggleFollow);

export default router;
