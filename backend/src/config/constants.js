export const USER_TYPES = ['student', 'alumni', 'faculty', 'professional'];
export const COLLEGE_ROLES = ['student', 'alumni', 'faculty'];
export const DOC_TYPES = ['id_card', 'marksheet', 'degree'];
export const PROJECT_CATEGORIES = ['Residential', 'Commercial', 'Institutional', 'Urban Design', 'Landscape', 'Interior', 'Conservation', 'Thesis', 'Competition', 'Other'];
export const CRITERIA = ['concept', 'planning', 'presentation', 'technical'];
export const JOB_TYPES = ['internship', 'full-time', 'freelance', 'competition'];
export const FIRM_SIZES = ['1-10', '11-50', '51-200', '200+'];
export const EVENT_TYPES = ['site-visit', 'webinar', 'workshop', 'jury', 'competition'];
export const SUBJECTS = ['Design', 'Structures', 'Thesis', 'Software', 'NATA', 'Careers'];
export const RESOURCE_KINDS = ['notes', 'cad-blocks', 'sheets', 'templates', 'other'];
export const SESSION_STATUSES = ['pending', 'accepted', 'declined', 'done', 'cancelled'];
export const REPORT_TYPES = ['post', 'comment', 'project', 'story', 'question', 'answer', 'resource', 'job', 'event', 'firm', 'message', 'chat', 'user'];
export const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'fake', 'other'];

/** Public user fields used whenever a user is shown as a card or byline. */
export const CARD = 'name username avatar headline type verified';

/** Populates the college admin and co-admin as cards. */
export const COLLEGE_ADMINS = ['admin', 'coAdmin'].map((path) => ({ path, select: CARD }));
