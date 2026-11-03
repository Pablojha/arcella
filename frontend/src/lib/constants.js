export const USER_TYPES = [
  { value: 'student', label: 'Student', hint: 'Studying B.Arch or M.Arch' },
  { value: 'alumni', label: 'Alumni', hint: 'Graduated and practising' },
  { value: 'faculty', label: 'Faculty', hint: 'Teaching architecture' },
  { value: 'professional', label: 'Professional', hint: 'Architect, designer or firm' },
];

export const COLLEGE_ROLES = USER_TYPES.slice(0, 3);

/** Degree levels a member can list for each college (the API's DEGREE_LEVELS), with degrees to suggest. */
export const DEGREE_LEVELS = [
  { value: 'undergraduate', label: 'Undergraduate', hint: 'B.Arch, B.Plan, B.Des', degrees: ['B.Arch', 'B.Plan', 'B.Des', 'B.Sc. Interior Design'] },
  { value: 'postgraduate', label: 'Postgraduate', hint: 'M.Arch, M.Plan, M.Des', degrees: ['M.Arch', 'M.Plan', 'M.Des', 'M.Tech', 'M.L.A. (Landscape)'] },
  { value: 'research', label: 'Advanced research', hint: 'PhD and research degrees', degrees: ['PhD', 'Postdoctoral research'] },
];

/** The two roles a college group can give its members. */
export const GROUP_ROLES = { admin: 'Admin', coAdmin: 'Co-admin' };

export const SOFTWARE = ['AutoCAD', 'Revit', 'Rhino', 'Grasshopper', 'SketchUp', 'ArchiCAD', 'Lumion', 'Enscape', 'V-Ray', 'D5 Render', 'Twinmotion', '3ds Max', 'Blender', 'Photoshop', 'Illustrator', 'InDesign', 'QGIS', 'Figma'];

export const SKILLS = ['Design studio', 'Model making', 'Sketching', 'Parametric design', 'BIM', 'Sustainable design', 'Urban design', 'Landscape', 'Interior design', 'Conservation', 'Working drawings', 'Rendering'];

export const PROJECT_CATEGORIES = ['Residential', 'Commercial', 'Institutional', 'Urban Design', 'Landscape', 'Interior', 'Conservation', 'Thesis', 'Competition', 'Other'];

export const CRITERIA = [
  { value: 'concept', label: 'Concept' },
  { value: 'planning', label: 'Planning' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'technical', label: 'Technical' },
];

export const JOB_TYPES = [
  { value: 'internship', label: 'Internship' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'competition', label: 'Competition' },
];

export const WORKPLACES = [
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

export const EXPERIENCE = [
  { value: 'fresher', label: 'Fresher' },
  { value: '1-2', label: '1–2 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '5+', label: '5+ years' },
];

/** Application stages, with the chip colour each one shows in. */
export const APPLICATION_STATUSES = [
  { value: 'applied', label: 'Applied', tone: 'bg-ink/5 text-ink' },
  { value: 'shortlisted', label: 'Shortlisted', tone: 'bg-brand/10 text-brand' },
  { value: 'interview', label: 'Interview', tone: 'bg-alert text-on-alert' },
  { value: 'offered', label: 'Offered', tone: 'bg-brand text-on-brand' },
  { value: 'rejected', label: 'Not selected', tone: 'bg-accent/10 text-accent' },
  { value: 'withdrawn', label: 'Withdrawn', tone: 'bg-ink/5 text-muted' },
];

/** Site staff roles, lowest first (the API's config/permissions.js is the source of truth). */
export const STAFF_ROLES = [
  { value: 'user', label: 'Member' },
  { value: 'support', label: 'Support' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super admin' },
];

export const VISIBILITY = [
  { value: 'nobody', label: 'Only me' },
  { value: 'connections', label: 'Connections' },
  { value: 'everyone', label: 'Everyone' },
];

export const FIRM_SIZES = ['1-10', '11-50', '51-200', '200+'];

export const EVENT_TYPES = [
  { value: 'site-visit', label: 'Site visit' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'jury', label: 'Jury' },
  { value: 'competition', label: 'Competition' },
];

export const SUBJECTS = ['Design', 'Structures', 'Thesis', 'Software', 'NATA', 'Careers'];

export const RESOURCE_KINDS = [
  { value: 'notes', label: 'Notes' },
  { value: 'cad-blocks', label: 'CAD blocks' },
  { value: 'sheets', label: 'Sheets' },
  { value: 'templates', label: 'Templates' },
  { value: 'other', label: 'Other' },
];

export const SEMESTERS = Array.from({ length: 10 }, (_, index) => ({ value: index + 1, label: `Sem ${index + 1}` }));

export const RESOURCE_ACCEPT = '.pdf,.dwg,.dxf,.xlsx,.xls,.zip,.jpg,.jpeg,.png,.webp';
export const MAX_RESOURCE_MB = 25;

export const DOC_TYPES = [
  { value: 'id_card', label: 'College ID card' },
  { value: 'marksheet', label: 'Result or marksheet' },
  { value: 'degree', label: 'Degree certificate (alumni)' },
];

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or scam', hint: 'Ads, fake offers, repeated junk' },
  { value: 'harassment', label: 'Harassment or hate', hint: 'Bullying, threats, abuse' },
  { value: 'inappropriate', label: 'Inappropriate content', hint: 'Explicit, violent or offensive' },
  { value: 'fake', label: 'Fake or plagiarised', hint: "Impersonation or someone else's work" },
  { value: 'copyright', label: 'Copyright or IP', hint: 'My own work or design used without permission' },
  { value: 'other', label: 'Something else', hint: 'Tell us in the note below' },
];

export const MENTOR_TOPICS =['Portfolio review', 'Thesis guidance', 'Internships', 'Higher studies abroad', 'Competitions', 'Software skills', 'COA registration', 'Starting a practice'];

const lastBatch = new Date().getFullYear() + 5;
export const BATCH_YEARS = Array.from({ length: lastBatch - 1970 + 1 }, (_, index) => lastBatch - index);
