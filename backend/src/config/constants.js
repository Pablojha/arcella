/** Who may see a contact detail on a profile. */
export const VISIBILITY = ['nobody', 'connections', 'everyone'];

/** What a support request is about; `problem` is a bug report from "Report a problem". */
export const SUPPORT_TOPICS = ['account', 'verification', 'jobs', 'safety', 'problem', 'other'];

export const USER_TYPES = ['student', 'alumni', 'faculty', 'professional'];
export const COLLEGE_ROLES = ['student', 'alumni', 'faculty'];
/** Degree levels a member can list for each college they studied at. */
export const DEGREE_LEVELS = ['undergraduate', 'postgraduate', 'research'];
export const DOC_TYPES = ['id_card', 'marksheet', 'degree'];
export const PROJECT_CATEGORIES = ['Residential', 'Commercial', 'Institutional', 'Urban Design', 'Landscape', 'Interior', 'Conservation', 'Thesis', 'Competition', 'Other'];
export const CRITERIA = ['concept', 'planning', 'presentation', 'technical'];
export const JOB_TYPES = ['internship', 'full-time', 'freelance', 'competition'];
export const WORKPLACES = ['onsite', 'hybrid', 'remote'];
export const EXPERIENCE = ['fresher', '1-2', '3-5', '5+'];
/** An application's stages; `withdrawn` is set only by the applicant, the rest only by the people hiring. */
export const APPLICATION_STATUSES = ['applied', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn'];
export const FIRM_SIZES = ['1-10', '11-50', '51-200', '200+'];
export const EVENT_TYPES = ['site-visit', 'webinar', 'workshop', 'jury', 'competition'];
export const SUBJECTS = ['Design', 'Structures', 'Thesis', 'Software', 'NATA', 'Careers'];
export const RESOURCE_KINDS = ['notes', 'cad-blocks', 'sheets', 'templates', 'other'];
export const SESSION_STATUSES = ['pending', 'accepted', 'declined', 'done', 'cancelled'];
export const REPORT_TYPES = ['post', 'comment', 'project', 'story', 'question', 'answer', 'resource', 'job', 'event', 'firm', 'message', 'chat', 'user'];
export const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'fake', 'copyright', 'other'];

/** Public user fields used whenever a user is shown as a card or byline. */
export const CARD = 'name username avatar headline type verified';

/** Populates the college admin and co-admin as cards. */
export const COLLEGE_ADMINS = ['admin', 'coAdmin'].map((path) => ({ path, select: CARD }));
